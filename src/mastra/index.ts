import { LibSQLStore } from '@mastra/libsql';
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { MastraStorageExporter, Observability } from '@mastra/observability';
import { resolve } from 'node:path';

import { conversationAgent } from './agents/conversation-agent';
import { reportAgent } from './agents/report-agent';
import { LISTING_AUDIT_WORKFLOW_KEY } from './workflows/listing-audit/contract';
import { listingAuditWorkflow } from './workflows/listing-audit';

const mastraStorageUrl =`file:${resolve(process.cwd(), 'mastra.db')}`;

export const mastra = new Mastra({
  agents: { conversationAgent, reportAgent },
  workflows: {
    // Keep this registry key stable because Mastra exposes it through a generated workflow tool name.
    [LISTING_AUDIT_WORKFLOW_KEY]: listingAuditWorkflow,
  },
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra',
        exporters: [
          new MastraStorageExporter(), // Persists traces to storage for Studio
        ],
      },
    },
  }),
  storage: new LibSQLStore({
    id: 'mastra-storage',
    url: mastraStorageUrl,
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
