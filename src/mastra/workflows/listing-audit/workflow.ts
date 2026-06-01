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
  description: 'Identifies an App Store listing, requests user confirmation, and runs an ASO audit.',
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
