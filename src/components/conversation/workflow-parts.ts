import type { WorkflowDataPart, WorkflowStepDataPart } from '@mastra/ai-sdk'

import type { ListingConfirmationPayload } from './listing-confirmation-card'
import type { WorkflowOutput } from '@/mastra/workflows/listing-audit/schemas'

type WorkflowData = WorkflowDataPart['data']
export type WorkflowPart = WorkflowDataPart | WorkflowStepDataPart

export function isListingConfirmationPayload(value: unknown): value is ListingConfirmationPayload & { message: string } {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const payload = value as Record<string, unknown>
  return (
    typeof payload.message === 'string' &&
    typeof payload.appStoreId === 'string' &&
    typeof payload.name === 'string' &&
    typeof payload.developer === 'string' &&
    typeof payload.icon === 'string' &&
    typeof payload.category === 'string' &&
    typeof payload.country === 'string'
  )
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

      const payload = part.data.steps?.['user-confirmation']?.suspendPayload
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

export function getStructuredReportOutput(data: WorkflowData): WorkflowOutput | null {
  const output = data.steps?.['full-aso-audit']?.output
  if (
    typeof output !== 'object' ||
    output === null ||
    !('narrative' in output) ||
    typeof output.narrative !== 'string' ||
    !('report' in output) ||
    typeof output.report !== 'object' ||
    output.report === null ||
    !('scoreCard' in output.report) ||
    !Array.isArray(output.report.scoreCard) ||
    !('quickWins' in output.report) ||
    !Array.isArray(output.report.quickWins) ||
    !('highImpactChanges' in output.report) ||
    !Array.isArray(output.report.highImpactChanges) ||
    !('strategicRecommendations' in output.report) ||
    !Array.isArray(output.report.strategicRecommendations) ||
    !output.report.quickWins.every((item) => typeof item === 'object' && item !== null && 'beforeAfterExamples' in item && Array.isArray(item.beforeAfterExamples)) ||
    !output.report.highImpactChanges.every((item) => typeof item === 'object' && item !== null && 'beforeAfterExamples' in item && Array.isArray(item.beforeAfterExamples)) ||
    !output.report.strategicRecommendations.every((item) => typeof item === 'object' && item !== null && 'beforeAfterExamples' in item && Array.isArray(item.beforeAfterExamples)) ||
    !('evidence' in output) ||
    typeof output.evidence !== 'object' ||
    output.evidence === null
  ) {
    return null
  }

  return output as WorkflowOutput
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
