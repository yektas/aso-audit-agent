import type { ModelRouterModelId } from '@mastra/core/llm';

export const DEFAULT_AGENT_MODEL = 'openai/gpt-5-mini';

function getConfiguredAsoAuditModel(): ModelRouterModelId {
  const model = process.env.AGENT_MODEL?.trim() || DEFAULT_AGENT_MODEL;

  if (!model.includes('/')) {
    throw new Error('AGENT_MODEL must use Mastra model format "provider/model-name".');
  }

  return model as ModelRouterModelId;
}

export const asoAuditModel = getConfiguredAsoAuditModel();
