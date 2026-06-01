import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { collectMarketSignalEvidence } from "../../services/market-signal-evidence";
import { collectListingPageEvidence } from "../../services/listing-page-evidence";
import { generateActionPlan, generateListingTextScores, generateMarketScores, generateVisualScores } from "../../tools/report-tool";
import { lookupAppMetadata } from "../../tools/app-lookup-tool";
import {
  actionPlanOutputSchema,
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
  workflowOutputSchema,
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
} as const;

export const fetchMetadataStep = createStep({
  id: "fetch-metadata",
  inputSchema: z.object({
    app: z.string().min(1),
  }),
  outputSchema: appMetadataSchema,
  execute: async ({ inputData }) => {
    return lookupAppMetadata(inputData.app);
  },
});

export const confirmationStep = createStep({
  id: "user-confirmation",
  inputSchema: appMetadataSchema,
  outputSchema: confirmationOutputSchema,
  suspendSchema: z.object({
    message: z.string(),
    appStoreId: z.string(),
    name: z.string(),
    developer: z.string(),
    icon: z.string(),
    category: z.string(),
    country: z.string(),
  }),
  resumeSchema: z.object({
    confirmed: z.boolean(),
  }),
  execute: async ({ inputData, resumeData, suspend, bail }) => {
    if (resumeData?.confirmed === false) {
      return bail({
        confirmed: false,
        ...inputData,
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
  id: "score-listing-text",
  inputSchema: reportInputSchema,
  outputSchema: listingTextScoreOutputSchema,
  execute: async ({ inputData, mastra, abortSignal }) => generateListingTextScores(inputData, { mastra, abortSignal }),
});

export const scoreVisualAssetsStep = createStep({
  id: "score-visual-assets",
  inputSchema: reportInputSchema,
  outputSchema: visualScoreOutputSchema,
  execute: async ({ inputData, mastra, abortSignal }) => generateVisualScores(inputData, { mastra, abortSignal }),
});

export const scoreMarketSignalsStep = createStep({
  id: "score-market-signals",
  inputSchema: reportInputSchema,
  outputSchema: marketScoreOutputSchema,
  execute: async ({ inputData, mastra, abortSignal }) => generateMarketScores(inputData, { mastra, abortSignal }),
});

export const assembleScoreCardStep = createStep({
  id: "assemble-score-card",
  inputSchema: parallelScoreOutputSchema,
  outputSchema: scoredAuditInputSchema,
  execute: async ({ inputData }) => {
    const listingText = inputData["score-listing-text"];
    const visualAssets = inputData["score-visual-assets"];
    const marketSignals = inputData["score-market-signals"];
    const returnedFactors = [...listingText.factors, ...visualAssets.factors, ...marketSignals.factors];

    if (new Set(returnedFactors.map(({ factor }) => factor)).size !== 8) {
      throw new Error("ASO factor scoring did not return all eight distinct factors.");
    }

    const factorById = new Map(returnedFactors.map((factor) => [factor.factor, factor]));
    const scoreCard = Object.entries(FACTOR_WEIGHTS).map(([factor, weight]) => ({
      ...factorById.get(factor as keyof typeof FACTOR_WEIGHTS)!,
      weight,
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
  id: "generate-action-plan",
  inputSchema: scoredAuditInputSchema,
  outputSchema: actionPlanOutputSchema,
  execute: async ({ inputData, mastra, abortSignal }) => ({
    scoredAudit: inputData,
    actionPlan: await generateActionPlan(inputData, { mastra, abortSignal }),
  }),
});

export const scoreReportStep = createStep({
  id: "full-aso-audit",
  inputSchema: actionPlanOutputSchema,
  outputSchema: workflowOutputSchema,
  execute: async ({ inputData }) => {
    const { scoredAudit, actionPlan } = inputData;
    const { input, scoreCard } = scoredAudit;

    const report = reportSchema.parse({
      ...scoreCard,
      ...actionPlan,
      competitorComparison: scoredAudit.competitorComparison,
    });

    return workflowOutputSchema.parse({
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
  id: "collect-listing-page-evidence",
  inputSchema: confirmationOutputSchema,
  outputSchema: listingPageEvidenceOutputSchema,
  execute: async ({ inputData }) => ({
    ...inputData,
    listingPageEvidence: await collectListingPageEvidence(inputData),
  }),
});

export const collectMarketSignalsStep = createStep({
  id: "collect-audit-evidence",
  inputSchema: listingPageEvidenceOutputSchema,
  outputSchema: reportInputSchema,
  execute: async ({ inputData }) => ({
    ...inputData,
    ...(await collectMarketSignalEvidence(inputData)),
  }),
});
