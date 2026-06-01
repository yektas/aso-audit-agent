'use client'

import { ListingConfirmationCard } from './listing-confirmation-card'
import { ReportView } from './report-view'
import {
  getStructuredReportOutput,
  getWorkflowRunId,
  isListingConfirmationPayload,
  isWorkflowSnapshotPart,
  type WorkflowPart,
} from './workflow-parts'
import { LISTING_AUDIT_STEP_IDS } from '@/mastra/workflows/listing-audit/contract'

export function WorkflowEvent({
  part,
  pendingRunId,
  disabled,
  onConfirm,
  onReject,
}: {
  part: WorkflowPart
  pendingRunId: string | null
  disabled: boolean
  onConfirm: (runId: string) => void
  onReject: (runId: string) => void
}) {
  if (!isWorkflowSnapshotPart(part)) {
    return null
  }

  const confirmationPayload = part.data.steps?.[LISTING_AUDIT_STEP_IDS.userConfirmation]?.suspendPayload
  const output = getStructuredReportOutput(part.data)
  const runId = getWorkflowRunId(part)

  if (part.data.status === 'running') {
    return null
  }

  if (part.data.status === 'suspended' && isListingConfirmationPayload(confirmationPayload)) {
    const isPending = runId !== null && runId === pendingRunId

    return (
      <div className="mt-2 w-full max-w-xl">
        <p className="text-sm text-foreground/66">{confirmationPayload.message}</p>
        <ListingConfirmationCard
          payload={confirmationPayload}
          disabled={disabled || !isPending}
          resolved={!isPending}
          onConfirm={() => {
            if (runId) {
              onConfirm(runId)
            }
          }}
          onReject={() => {
            if (runId) {
              onReject(runId)
            }
          }}
        />
      </div>
    )
  }

  if (part.data.status === 'success' && output) {
    return <ReportView report={output.report} />
  }

  return null
}
