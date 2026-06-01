import { z } from "zod";

import { LISTING_AUDIT_STEP_IDS } from "./contract";

export const workflowInputSchema = z.object({
  app: z.string().min(1).describe("An App Store URL or numeric Apple App Store app ID"),
});

export const appMetadataSchema = z.object({
  appStoreId: z.string(),
  name: z.string(),
  appStoreUrl: z.url().nullable(),
  bundleId: z.string().nullable(),
  developer: z.string(),
  developerUrl: z.url().nullable(),
  icon: z.string(),
  category: z.string(),
  country: z.string(),
  description: z.string().nullable(),
  averageUserRating: z.number().nullable(),
  userRatingCount: z.number().nullable(),
  version: z.string().nullable(),
  price: z.number().nullable(),
  currency: z.string().nullable(),
  formattedPrice: z.string().nullable(),
  screenshotUrls: z.array(z.url()),
  ipadScreenshotUrls: z.array(z.url()),
  appletvScreenshotUrls: z.array(z.url()),
  genres: z.array(z.string()),
  releaseNotes: z.string().nullable(),
  releaseDate: z.string().nullable(),
  currentVersionReleaseDate: z.string().nullable(),
  contentRating: z.string().nullable(),
  contentAdvisories: z.array(z.string()),
  languageCodes: z.array(z.string()),
  features: z.array(z.string()),
  minimumOsVersion: z.string().nullable(),
  currentVersionAverageRating: z.number().nullable(),
  currentVersionRatingCount: z.number().nullable(),
  rawLookupJson: z.string(),
  input: z.string(),
  url: z.string().nullable(),
});

export const confirmationOutputSchema = appMetadataSchema.extend({
  confirmed: z.boolean(),
});

export const listingPageEvidenceSchema = z.object({
  subtitle: z.string().nullable(),
  promotionalText: z.string().nullable(),
  screenshotImageUrls: z.array(z.url()),
  inAppEvents: z.array(
    z.object({
      title: z.string(),
      description: z.string().nullable(),
    }),
  ),
  crawlNotes: z.array(z.string()),
  unavailablePrivateMetadata: z.array(z.string()),
  rawMarkdown: z.string().nullable(),
});

export const listingPageEvidenceOutputSchema = confirmationOutputSchema.extend({
  listingPageEvidence: listingPageEvidenceSchema,
});

export const reviewSignalSchema = z.object({
  title: z.string(),
  rating: z.number().int().min(1).max(5),
  content: z.string(),
});

export const relatedAppSchema = z.object({
  appStoreId: z.string(),
  name: z.string(),
  developer: z.string().nullable(),
  category: z.string().nullable(),
  averageUserRating: z.number().nullable(),
  userRatingCount: z.number().nullable(),
});

export const reportInputSchema = confirmationOutputSchema.extend({
  listingPageEvidence: listingPageEvidenceSchema,
  recentReviews: z.array(reviewSignalSchema),
  relatedApps: z.array(relatedAppSchema),
  evidenceNotes: z.array(z.string()),
});

export const scoreFactorSchema = z.object({
  factor: z.enum([
    "title",
    "subtitle",
    "description",
    "screenshots",
    "ratingsReviews",
    "icon",
    "conversionSignals",
    "competitivePosition",
  ]),
  label: z.string(),
  score: z
    .number()
    .min(0)
    .max(10)
    .describe("ASO quality score on a 0-to-10 scale; never normalize to 0-to-1 (a strong result is 8, not 0.8)."),
  weight: z.number().min(0).max(100),
  rationale: z.string().describe("Evidence-grounded explanation that must be directionally consistent with the numeric score."),
});

export const recommendationSchema = z.object({
  title: z.string(),
  evidence: z.array(z.string()).min(1).max(3),
  action: z.string(),
  expectedImpact: z.string(),
  beforeAfterExamples: z
    .array(
      z.object({
        field: z.enum(["title", "subtitle", "description", "screenshotCaption"]),
        before: z.string(),
        after: z.string(),
        rationale: z.string(),
      }),
    )
    .max(3),
});

export const competitorComparisonSchema = z.object({
  app: z.string(),
  developer: z.string().nullable(),
  rating: z.number().nullable(),
  ratingCount: z.number().nullable(),
  category: z.string().nullable(),
  signal: z.string(),
});

export const reportSchema = z.object({
  overallScore: z.number().min(0).max(100),
  summary: z.string(),
  confidence: z.enum(["high", "medium", "limited"]),
  scoreCard: z.array(scoreFactorSchema).length(8),
  quickWins: z.array(recommendationSchema).min(3).max(5),
  highImpactChanges: z.array(recommendationSchema).min(3).max(5),
  strategicRecommendations: z.array(recommendationSchema).min(3).max(5),
  competitorComparison: z.array(competitorComparisonSchema).max(5),
  limitations: z.array(z.string()).min(1).max(6),
});

export const scoreCardFoundationSchema = reportSchema.pick({
  overallScore: true,
  confidence: true,
  scoreCard: true,
  limitations: true,
});

export const scoredAuditInputSchema = z.object({
  input: reportInputSchema,
  scoreCard: scoreCardFoundationSchema,
  competitorComparison: z.array(competitorComparisonSchema).max(5),
});

export const listingTextScoreSliceSchema = z.object({
  factors: z.array(scoreFactorSchema.extend({
    factor: z.enum(["title", "subtitle", "description", "conversionSignals"]),
  })).length(4),
  limitations: z.array(z.string()).max(3),
});

export const listingTextScoreOutputSchema = listingTextScoreSliceSchema.extend({
  input: reportInputSchema,
});

export const visualScoreOutputSchema = z.object({
  factors: z.array(scoreFactorSchema.extend({
    factor: z.enum(["screenshots", "icon"]),
  })).length(2),
  limitations: z.array(z.string()).max(3),
});

export const marketScoreOutputSchema = z.object({
  factors: z.array(scoreFactorSchema.extend({
    factor: z.enum(["ratingsReviews", "competitivePosition"]),
  })).length(2),
  limitations: z.array(z.string()).max(3),
  competitorComparison: z.array(competitorComparisonSchema).max(5),
});

export const parallelScoreOutputSchema = z.object({
  [LISTING_AUDIT_STEP_IDS.scoreListingText]: listingTextScoreOutputSchema,
  [LISTING_AUDIT_STEP_IDS.scoreVisualAssets]: visualScoreOutputSchema,
  [LISTING_AUDIT_STEP_IDS.scoreMarketSignals]: marketScoreOutputSchema,
});

export const actionPlanSchema = z.object({
  summary: z.string(),
  quickWins: z.array(recommendationSchema).length(3),
  highImpactChanges: z.array(recommendationSchema).length(3),
  strategicRecommendations: z.array(recommendationSchema).length(3),
});

export const actionPlanOutputSchema = z.object({
  scoredAudit: scoredAuditInputSchema,
  actionPlan: actionPlanSchema,
});

export const workflowOutputSchema = z.object({
  narrative: z.string(),
  report: reportSchema,
  evidence: z.object({
    recentReviews: z.array(reviewSignalSchema),
    relatedApps: z.array(relatedAppSchema),
    notes: z.array(z.string()),
    listingPageEvidence: listingPageEvidenceSchema,
  }),
});

export type WorkflowOutput = z.infer<typeof workflowOutputSchema>;
