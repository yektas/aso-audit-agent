import type { MastraDBMessage } from '@mastra/core/agent'
import type { ProcessInputArgs, ProcessInputResult, Processor } from '@mastra/core/processors'

import { LISTING_AUDIT_WORKFLOW_KEY } from '../workflows/listing-audit/contract'

const WORKFLOW_TOOL_NAME = `workflow-${LISTING_AUDIT_WORKFLOW_KEY}`

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getWorkflowSnapshotRunId(part: unknown) {
  if (!isRecord(part) || !('type' in part) || (part.type !== 'data-tool-workflow' && part.type !== 'data-workflow')) {
    return null
  }

  if (typeof part.id === 'string') {
    return part.id
  }

  const data = isRecord(part.data) ? part.data : null
  return typeof data?.runId === 'string' ? data.runId : null
}

function isSuspendedWorkflowSnapshot(part: unknown) {
  if (!isRecord(part) || !('type' in part) || (part.type !== 'data-tool-workflow' && part.type !== 'data-workflow')) {
    return false
  }

  return isRecord(part.data) && part.data.status === 'suspended'
}

function getLatestSuspendedWorkflowRunId(messages: MastraDBMessage[]) {
  for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
    const parts = messages[messageIndex].content.parts

    for (let partIndex = parts.length - 1; partIndex >= 0; partIndex -= 1) {
      const part = parts[partIndex]
      const runId = getWorkflowSnapshotRunId(part)
      if (!runId) {
        continue
      }

      return isSuspendedWorkflowSnapshot(part) ? runId : null
    }
  }

  return null
}

function getSuspendedToolRunId(value: unknown) {
  if (!isRecord(value)) {
    return null
  }

  return value.toolName === WORKFLOW_TOOL_NAME && typeof value.runId === 'string' ? value.runId : null
}

function filterSuspendedToolRecord(value: unknown, activeRunId: string | null) {
  if (!isRecord(value)) {
    return { value, changed: false }
  }

  let changed = false
  const nextValue = { ...value }

  for (const [key, suspendedTool] of Object.entries(nextValue)) {
    const runId = getSuspendedToolRunId(suspendedTool)
    if (!runId) {
      continue
    }

    if (runId !== activeRunId) {
      delete nextValue[key]
      changed = true
    }
  }

  return { value: nextValue, changed }
}

function sanitizeMessage(message: MastraDBMessage, activeRunId: string | null) {
  const metadata = message.content.metadata
  if (!metadata) {
    return { message, changed: false }
  }

  let changed = false
  const nextMetadata = { ...metadata }

  for (const metadataKey of ['suspendedTools', 'pendingToolApprovals']) {
    const result = filterSuspendedToolRecord(nextMetadata[metadataKey], activeRunId)
    if (!result.changed) {
      continue
    }

    changed = true
    if (isRecord(result.value) && Object.keys(result.value).length > 0) {
      nextMetadata[metadataKey] = result.value
    } else {
      delete nextMetadata[metadataKey]
    }
  }

  if (!changed) {
    return { message, changed: false }
  }

  return {
    message: {
      ...message,
      content: {
        ...message.content,
        metadata: Object.keys(nextMetadata).length > 0 ? nextMetadata : undefined,
      },
    },
    changed: true,
  }
}

export class ActiveWorkflowSuspensionOnlyProcessor implements Processor<'active-workflow-suspension-only'> {
  readonly id = 'active-workflow-suspension-only'
  readonly name = 'Active workflow suspension only'

  processInput({ messages }: ProcessInputArgs): ProcessInputResult {
    const activeRunId = getLatestSuspendedWorkflowRunId(messages)
    let changed = false
    const sanitizedMessages = messages.map((message) => {
      const result = sanitizeMessage(message, activeRunId)
      changed ||= result.changed
      return result.message
    })

    return changed ? sanitizedMessages : messages
  }
}

export const activeWorkflowSuspensionOnlyProcessor = new ActiveWorkflowSuspensionOnlyProcessor()
