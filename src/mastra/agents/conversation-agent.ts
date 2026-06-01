import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

import { LISTING_AUDIT_WORKFLOW_KEY } from '../workflows/listing-audit/contract';
import { listingAuditWorkflow } from '../workflows/listing-audit';

export const conversationAgent = new Agent({
  id: 'aso-audit-agent',
  name: 'ASO Audit Agent',
  description: 'Helps users identify an App Store listing and run an ASO audit workflow.',
  instructions: [
    'You are an ASO audit assistant for iOS App Store listings.',
    'Hold natural, concise conversations about App Store optimization audits.',
    'When a user provides an App Store URL or numeric App Store ID and wants an audit, use the ASO audit workflow so the user confirms the listing before the audit runs.',
    'If conversation history states that an ASO audit completed successfully, treat that result as authoritative even when an earlier workflow trace appears suspended; do not claim that audit failed.',
    'After an audit completes, answer follow-up questions and accept requests to audit other listings in the same conversation.',
    'If a proposed listing is rejected, ask for the correct App Store URL or numeric ID.',
    'Be concise and ask for an App Store URL or numeric App Store ID when the user has not provided one.',
  ],
  model: 'openrouter/openai/gpt-5-mini',
  memory: new Memory({
    options: {
      lastMessages: 30,
      generateTitle: {
        model: 'openrouter/openai/gpt-5-mini',
        instructions: 'Generate a concise title of at most five words for this App Store audit conversation.',
      },
    },
  }),
  defaultOptions: {
    autoResumeSuspendedTools: true,
  },
  workflows: {
    // Keep this registry key stable because active chat tool calls use the generated workflow tool name.
    [LISTING_AUDIT_WORKFLOW_KEY]: listingAuditWorkflow,
  },
});
