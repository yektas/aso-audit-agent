'use client'

import type { WorkflowDataPart } from '@mastra/ai-sdk'

import { AppListingConfirmationCard, type ListingConfirmationPayload } from './app-listing-confirmation-card'

type WorkflowData = WorkflowDataPart['data']

function isListingConfirmationPayload(value: unknown): value is ListingConfirmationPayload & { message: string } {
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

export function isAuditWorkflowPart(part: unknown): part is WorkflowDataPart {
  return (
    typeof part === 'object' &&
    part !== null &&
    'type' in part &&
    (part.type === 'data-tool-workflow' || part.type === 'data-workflow') &&
    'data' in part &&
    typeof part.data === 'object'
  )
}

function getWorkflowRunId(part: WorkflowDataPart) {
  const data = part.data as WorkflowData & { runId?: unknown }
  return part.id ?? (typeof data.runId === 'string' ? data.runId : null)
}

export function getPendingAuditConfirmation(messages: Array<{ parts: unknown[] }>) {
  for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
    const message = messages[messageIndex]
    for (let partIndex = message.parts.length - 1; partIndex >= 0; partIndex -= 1) {
      const part = message.parts[partIndex]
      if (!isAuditWorkflowPart(part)) {
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

function getAuditRecommendations(data: WorkflowData) {
  const output = data.steps?.['full-aso-audit']?.output
  if (typeof output !== 'object' || output === null || !('recommendations' in output)) {
    return null
  }

  return typeof output.recommendations === 'string' ? output.recommendations : null
}

export function AuditWorkflowEvent({
  part,
  pendingRunId,
  disabled,
  onConfirm,
  onReject,
}: {
  part: WorkflowDataPart
  pendingRunId: string | null
  disabled: boolean
  onConfirm: (runId: string) => void
  onReject: (runId: string) => void
}) {
  const confirmationPayload = part.data.steps?.['user-confirmation']?.suspendPayload
  const recommendations = getAuditRecommendations(part.data)
  const runId = getWorkflowRunId(part)

  if (part.data.status === 'suspended' && runId === pendingRunId && runId && isListingConfirmationPayload(confirmationPayload)) {
    return (
      <div className="mt-2 w-full max-w-xl">
        <p className="text-sm text-white/66">{confirmationPayload.message}</p>
        <AppListingConfirmationCard
          payload={confirmationPayload}
          disabled={disabled}
          onConfirm={() => onConfirm(runId)}
          onReject={() => onReject(runId)}
        />
      </div>
    )
  }

  if (part.data.status === 'success' && recommendations) {
    return (
      <section className="mt-3 w-full max-w-xl rounded-[2rem] border border-[#ccff00]/20 bg-[#ccff00]/[0.045] p-5 backdrop-blur-2xl">
        <p className="font-mono text-[11px] tracking-[0.17em] text-[#ccff00]/80 uppercase">Audit result</p>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/68">{recommendations}</p>
      </section>
    )
  }

  return null
}
