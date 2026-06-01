import { createWorkflow } from '@mastra/core/workflows';

import {
  collectMarketSignalsStep,
  collectListingPageEvidenceStep,
  confirmationStep,
  fetchMetadataStep,
  assembleScoreCardStep,
  generateActionPlanStep,
  scoreListingTextStep,
  scoreMarketSignalsStep,
  scoreVisualAssetsStep,
  scoreReportStep,
} from './steps';
import { LISTING_AUDIT_WORKFLOW_ID } from './contract';
import { workflowInputSchema, workflowOutputSchema } from './schemas';

export const listingAuditWorkflow = createWorkflow({
  id: LISTING_AUDIT_WORKFLOW_ID,
  description:
    'Use when a user provides an App Store URL or numeric App Store ID for an ASO audit. Identifies the listing, requests user confirmation with the structured confirmation UI, and runs the audit after confirmation.',
  inputSchema: workflowInputSchema,
  outputSchema: workflowOutputSchema,
})
  .then(fetchMetadataStep)
  .then(confirmationStep)
  .then(collectListingPageEvidenceStep)
  .then(collectMarketSignalsStep)
  .parallel([scoreListingTextStep, scoreVisualAssetsStep, scoreMarketSignalsStep])
  .then(assembleScoreCardStep)
  .then(generateActionPlanStep)
  .then(scoreReportStep)
  .commit();
