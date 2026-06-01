import type { WorkflowDataPart, WorkflowStepDataPart } from '@mastra/ai-sdk'

import type { ListingConfirmationPayload } from './listing-confirmation-card'
import { LISTING_AUDIT_STEP_IDS, listingConfirmationSuspendSchema } from '@/mastra/workflows/listing-audit/contract'
import type { WorkflowRejectedOutput, WorkflowReportOutput } from '@/mastra/workflows/listing-audit/schemas'
import { workflowRejectedOutputSchema, workflowReportOutputSchema } from '@/mastra/workflows/listing-audit/schemas'

type WorkflowData = WorkflowDataPart['data']
export type WorkflowPart = WorkflowDataPart | WorkflowStepDataPart

export function isListingConfirmationPayload(value: unknown): value is ListingConfirmationPayload & { message: string } {
  return listingConfirmationSuspendSchema.safeParse(value).success
}

export function isWorkflowSnapshotPart(part: WorkflowPart): part is WorkflowDataPart {
  return part.type === 'data-tool-workflow' || part.type === 'data-workflow'
}

export function isWorkflowPart(part: unknown): part is WorkflowPart {
  return (
    typeof part === 'object' &&
    part !== null &&
    'type' in part &&
    (part.type === 'data-tool-workflow' ||
      part.type === 'data-workflow' ||
      part.type === 'data-tool-workflow-step' ||
      part.type === 'data-workflow-step') &&
    'data' in part &&
    part.data !== null &&
    typeof part.data === 'object'
  )
}

export function getWorkflowRunId(part: WorkflowDataPart) {
  const data = part.data as WorkflowData & { runId?: unknown }
  return part.id ?? (typeof data.runId === 'string' ? data.runId : null)
}

export function getPendingListingConfirmation(messages: Array<{ parts: unknown[] }>) {
  for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
    const message = messages[messageIndex]
    for (let partIndex = message.parts.length - 1; partIndex >= 0; partIndex -= 1) {
      const part = message.parts[partIndex]
      if (!isWorkflowPart(part) || !isWorkflowSnapshotPart(part)) {
        continue
      }

      if (part.data.status !== 'suspended') {
        return null
      }

      const payload = part.data.steps?.[LISTING_AUDIT_STEP_IDS.userConfirmation]?.suspendPayload
      if (isListingConfirmationPayload(payload)) {
        return {
          payload,
          runId: getWorkflowRunId(part),
        }
      }
    }
  }

  return null
}

export function getStructuredReportOutput(data: WorkflowData): WorkflowReportOutput | null {
  const result = workflowReportOutputSchema.safeParse(data.steps?.[LISTING_AUDIT_STEP_IDS.fullAsoAudit]?.output)
  return result.success ? result.data : null
}

export function getRejectedWorkflowOutput(data: WorkflowData): WorkflowRejectedOutput | null {
  const result = workflowRejectedOutputSchema.safeParse(data.steps?.[LISTING_AUDIT_STEP_IDS.userConfirmation]?.output)
  return result.success ? result.data : null
}

export function hasCompletedReport(parts: unknown[]) {
  return parts.some(
    (part) =>
      isWorkflowPart(part) &&
      isWorkflowSnapshotPart(part) &&
      part.data.status === 'success' &&
      getStructuredReportOutput(part.data) !== null,
  )
}

export function hasActiveWorkflow(parts: unknown[]) {
  return parts.some(
    (part) =>
      isWorkflowPart(part) &&
      isWorkflowSnapshotPart(part) &&
      part.data.status === 'running',
  )
}
