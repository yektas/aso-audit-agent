import type { MastraMemory } from '@mastra/core/memory'

import { mastra } from '@/mastra'

export const AUDIT_AGENT_ID = 'aso-audit-agent'
export const AUDIT_THREAD_METADATA = {
  kind: 'aso-audit-conversation',
} as const

export async function getAuditMemory() {
  const memory = await mastra.getAgentById(AUDIT_AGENT_ID).getMemory()

  if (!memory) {
    throw new Error('ASO audit agent memory is not configured.')
  }

  return memory
}

export async function getOwnedAuditThread(memory: MastraMemory, threadId: string, resourceId: string) {
  const thread = await memory.getThreadById({ threadId })

  if (thread?.resourceId !== resourceId || thread.metadata?.kind !== AUDIT_THREAD_METADATA.kind) {
    return null
  }

  return thread
}
