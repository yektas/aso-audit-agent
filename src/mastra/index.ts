
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { asoAuditAgent } from './agents/aso-audit-agent';
import { asoAuditWorkflow } from './workflows/aso-audit-workflow';


export const mastra = new Mastra({
  agents: { asoAuditAgent },
  workflows: { asoAuditWorkflow },
  storage:  new LibSQLStore({
      id: "mastra-storage",
      url: "file:./mastra.db",
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  })
});
