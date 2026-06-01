import { createWorkflow } from '@mastra/core/workflows';

import { confirmationStep, fetchMetadataStep, fullAuditStep } from './steps';
import { workflowInputSchema, workflowOutputSchema } from './types';

export const asoAuditWorkflow = createWorkflow({
  id: 'aso-audit-workflow',
  description: 'Identifies an App Store listing, requests user confirmation, and runs an ASO audit.',
  inputSchema: workflowInputSchema,
  outputSchema: workflowOutputSchema,
})
  .then(fetchMetadataStep)
  .then(confirmationStep)
  .then(fullAuditStep)
  .commit();
