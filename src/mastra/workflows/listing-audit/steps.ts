import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { collectMarketSignalEvidence } from "../../services/market-signal-evidence";
import { collectListingPageEvidence } from "../../services/listing-page-evidence";
import { generateActionPlan, generateListingTextScores, generateMarketScores, generateVisualScores } from "../../tools/report-tool";
import { lookupAppMetadata } from "../../tools/app-lookup-tool";
import { LISTING_AUDIT_STEP_IDS, listingConfirmationResumeSchema, listingConfirmationSuspendSchema } from "./contract";
import {
  actionPlanOutputSchema,
  asoFactorIds,
  type AsoFactorId,
  appMetadataSchema,
  confirmationOutputSchema,
  listingPageEvidenceOutputSchema,
  listingTextScoreOutputSchema,
  marketScoreOutputSchema,
  parallelScoreOutputSchema,
  reportInputSchema,
  reportSchema,
  scoredAuditInputSchema,
  visualScoreOutputSchema,
  workflowReportOutputSchema,
} from "./schemas";

const FACTOR_WEIGHTS = {
  title: 25,
  subtitle: 15,
  description: 15,
  screenshots: 15,
  ratingsReviews: 15,
  icon: 5,
  conversionSignals: 5,
  competitivePosition: 5,
} as const satisfies Record<AsoFactorId, number>;

export const fetchMetadataStep = createStep({
  id: LISTING_AUDIT_STEP_IDS.fetchMetadata,
  inputSchema: z.object({
    app: z.string().min(1),
  }),
  outputSchema: appMetadataSchema,
  execute: async ({ inputData }) => {
    return lookupAppMetadata(inputData.app);
  },
});

export const confirmationStep = createStep({
  id: LISTING_AUDIT_STEP_IDS.userConfirmation,
  inputSchema: appMetadataSchema,
  outputSchema: confirmationOutputSchema,
  suspendSchema: listingConfirmationSuspendSchema,
  resumeSchema: listingConfirmationResumeSchema,
  execute: async ({ inputData, resumeData, suspend, bail }) => {
    if (resumeData?.confirmed === false) {
      return bail({
        rejected: true,
        narrative: `The user rejected ${inputData.name} as the intended App Store listing.`,
        app: {
          appStoreId: inputData.appStoreId,
          name: inputData.name,
          developer: inputData.developer,
          appStoreUrl: inputData.appStoreUrl,
          icon: inputData.icon,
          category: inputData.category,
          country: inputData.country,
        },
      });
    }

    if (resumeData?.confirmed === true) {
      return {
        confirmed: true,
        ...inputData,
      };
    }

    return await suspend({
      message: "Is this the app you meant?",
      name: inputData.name,
      developer: inputData.developer,
      icon: inputData.icon,
      category: inputData.category,
      country: inputData.country,
      appStoreId: inputData.appStoreId,
    });
  },
});

export const scoreListingTextStep = createStep({
  id: LISTING_AUDIT_STEP_IDS.scoreListingText,
  inputSchema: reportInputSchema,
  outputSchema: listingTextScoreOutputSchema,
  execute: async ({ inputData, mastra, abortSignal }) => generateListingTextScores(inputData, { mastra, abortSignal }),
});

export const scoreVisualAssetsStep = createStep({
  id: LISTING_AUDIT_STEP_IDS.scoreVisualAssets,
  inputSchema: reportInputSchema,
  outputSchema: visualScoreOutputSchema,
  execute: async ({ inputData, mastra, abortSignal }) => generateVisualScores(inputData, { mastra, abortSignal }),
});

export const scoreMarketSignalsStep = createStep({
  id: LISTING_AUDIT_STEP_IDS.scoreMarketSignals,
  inputSchema: reportInputSchema,
  outputSchema: marketScoreOutputSchema,
  execute: async ({ inputData, mastra, abortSignal }) => generateMarketScores(inputData, { mastra, abortSignal }),
});

export const assembleScoreCardStep = createStep({
  id: LISTING_AUDIT_STEP_IDS.assembleScoreCard,
  inputSchema: parallelScoreOutputSchema,
  outputSchema: scoredAuditInputSchema,
  execute: async ({ inputData }) => {
    const listingText = inputData[LISTING_AUDIT_STEP_IDS.scoreListingText];
    const visualAssets = inputData[LISTING_AUDIT_STEP_IDS.scoreVisualAssets];
    const marketSignals = inputData[LISTING_AUDIT_STEP_IDS.scoreMarketSignals];
    const returnedFactors = [...listingText.factors, ...visualAssets.factors, ...marketSignals.factors];
    const factorById = new Map(returnedFactors.map((factor) => [factor.factor, factor]));
    const missingFactors = asoFactorIds.filter((factorId) => !factorById.has(factorId));

    if (missingFactors.length > 0 || factorById.size !== asoFactorIds.length) {
      throw new Error(
        `ASO factor scoring returned an incomplete score card. Missing: ${missingFactors.join(", ") || "none"}. Received: ${Array.from(factorById.keys()).join(", ") || "none"}.`,
      );
    }

    const scoreCard = asoFactorIds.map((factor) => ({
      ...factorById.get(factor)!,
      weight: FACTOR_WEIGHTS[factor],
    }));
    const overallScore = scoreCard.reduce((total, factor) => total + factor.score * factor.weight, 0) / 10;
    const evidence = listingText.input;
    const hasCompleteEvidence =
      evidence.listingPageEvidence.screenshotImageUrls.length > 0 &&
      evidence.recentReviews.length > 0 &&
      evidence.relatedApps.length > 0;

    const limitations = Array.from(new Set([...listingText.limitations, ...visualAssets.limitations, ...marketSignals.limitations])).slice(0, 6);

    return scoredAuditInputSchema.parse({
      input: evidence,
      scoreCard: {
        overallScore,
        confidence: hasCompleteEvidence ? "high" : "limited",
        scoreCard,
        limitations: limitations.length > 0 ? limitations : ["Audit results are based only on the collected public listing evidence."],
      },
      competitorComparison: marketSignals.competitorComparison,
    });
  },
});

export const generateActionPlanStep = createStep({
  id: LISTING_AUDIT_STEP_IDS.generateActionPlan,
  inputSchema: scoredAuditInputSchema,
  outputSchema: actionPlanOutputSchema,
  execute: async ({ inputData, mastra, abortSignal }) => ({
    scoredAudit: inputData,
    actionPlan: await generateActionPlan(inputData, { mastra, abortSignal }),
  }),
});

export const scoreReportStep = createStep({
  id: LISTING_AUDIT_STEP_IDS.fullAsoAudit,
  inputSchema: actionPlanOutputSchema,
  outputSchema: workflowReportOutputSchema,
  execute: async ({ inputData }) => {
    const { scoredAudit, actionPlan } = inputData;
    const { input, scoreCard } = scoredAudit;

    const report = reportSchema.parse({
      ...scoreCard,
      ...actionPlan,
      competitorComparison: scoredAudit.competitorComparison,
    });

    return workflowReportOutputSchema.parse({
      narrative: report.summary,
      report,
      evidence: {
        recentReviews: input.recentReviews,
        relatedApps: input.relatedApps,
        notes: [...input.evidenceNotes, ...input.listingPageEvidence.crawlNotes],
        listingPageEvidence: input.listingPageEvidence,
      },
    });
  },
});

export const collectListingPageEvidenceStep = createStep({
  id: LISTING_AUDIT_STEP_IDS.collectListingPageEvidence,
  inputSchema: confirmationOutputSchema,
  outputSchema: listingPageEvidenceOutputSchema,
  execute: async ({ inputData }) => ({
    ...inputData,
    listingPageEvidence: await collectListingPageEvidence(inputData),
  }),
});

export const collectMarketSignalsStep = createStep({
  id: LISTING_AUDIT_STEP_IDS.collectMarketSignals,
  inputSchema: listingPageEvidenceOutputSchema,
  outputSchema: reportInputSchema,
  execute: async ({ inputData }) => ({
    ...inputData,
    ...(await collectMarketSignalEvidence(inputData)),
  }),
});
