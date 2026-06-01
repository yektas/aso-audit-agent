import { z } from 'zod'

export const LISTING_AUDIT_WORKFLOW_ID = 'aso-audit-workflow'
export const LISTING_AUDIT_WORKFLOW_KEY = 'asoAuditWorkflow'
export const LISTING_AUDIT_WORKFLOW_TOOL_NAME = `workflow-${LISTING_AUDIT_WORKFLOW_KEY}`

export const LISTING_AUDIT_STEP_IDS = {
  fetchMetadata: 'fetch-metadata',
  userConfirmation: 'user-confirmation',
  collectListingPageEvidence: 'collect-listing-page-evidence',
  collectMarketSignals: 'collect-audit-evidence',
  scoreListingText: 'score-listing-text',
  scoreVisualAssets: 'score-visual-assets',
  scoreMarketSignals: 'score-market-signals',
  assembleScoreCard: 'assemble-score-card',
  generateActionPlan: 'generate-action-plan',
  fullAsoAudit: 'full-aso-audit',
} as const

export const listingConfirmationSuspendSchema = z.object({
  message: z.string(),
  appStoreId: z.string(),
  name: z.string(),
  developer: z.string(),
  icon: z.string(),
  category: z.string(),
  country: z.string(),
})

export const listingConfirmationResumeSchema = z.object({
  confirmed: z.boolean(),
})
