'use client'

import type { WorkflowDataPart } from '@mastra/ai-sdk'
import { Check, ChevronDown, ChevronUp, Circle, Clock, LoaderCircle, Route, TriangleAlert, X } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { ScrollArea } from '@/components/ui/scroll-area'
import { getRejectedWorkflowOutput, isWorkflowSnapshotPart, type WorkflowPart } from '@/lib/workflow-parts'
import { LISTING_AUDIT_STEP_IDS } from '@/mastra/workflows/listing-audit/contract'

const RUNNING_STEP_LABELS: Record<string, string> = {
  [LISTING_AUDIT_STEP_IDS.fetchMetadata]: 'Finding the App Store listing',
  [LISTING_AUDIT_STEP_IDS.userConfirmation]: 'Checking the selected app',
  [LISTING_AUDIT_STEP_IDS.collectListingPageEvidence]: 'Reading public listing details',
  [LISTING_AUDIT_STEP_IDS.collectMarketSignals]: 'Collecting ratings and related apps',
  [LISTING_AUDIT_STEP_IDS.scoreListingText]: 'Assessing listing copy',
  [LISTING_AUDIT_STEP_IDS.scoreVisualAssets]: 'Assessing icon and screenshots',
  [LISTING_AUDIT_STEP_IDS.scoreMarketSignals]: 'Assessing market signals',
  [LISTING_AUDIT_STEP_IDS.assembleScoreCard]: 'Calculating the score card',
  [LISTING_AUDIT_STEP_IDS.generateActionPlan]: 'Writing recommended actions',
  [LISTING_AUDIT_STEP_IDS.fullAsoAudit]: 'Preparing the completed audit',
}

const WORKFLOW_STEPS = [
  {
    id: LISTING_AUDIT_STEP_IDS.fetchMetadata,
    label: 'Find listing',
    description: 'Name, category and public metadata',
  },
  {
    id: LISTING_AUDIT_STEP_IDS.userConfirmation,
    label: 'Confirm',
    description: 'Verify that this is the intended app',
  },
  {
    id: LISTING_AUDIT_STEP_IDS.collectListingPageEvidence,
    label: 'Read listing',
    description: 'Subtitle, promotional text and screenshots',
  },
  {
    id: LISTING_AUDIT_STEP_IDS.collectMarketSignals,
    label: 'Collect signals',
    description: 'Ratings, recent reviews and related apps',
  },
  {
    id: LISTING_AUDIT_STEP_IDS.scoreListingText,
    label: 'Score copy',
    description: 'Title, subtitle, description and promotions',
  },
  {
    id: LISTING_AUDIT_STEP_IDS.scoreVisualAssets,
    label: 'Score visuals',
    description: 'App icon and first screenshots',
  },
  {
    id: LISTING_AUDIT_STEP_IDS.scoreMarketSignals,
    label: 'Score market',
    description: 'Reviews, ratings and comparison set',
  },
  {
    id: LISTING_AUDIT_STEP_IDS.assembleScoreCard,
    label: 'Calculate score',
    description: 'Combine eight weighted ASO factors',
  },
  {
    id: LISTING_AUDIT_STEP_IDS.generateActionPlan,
    label: 'Write actions',
    description: 'Nine evidence-backed recommendations',
  },
  {
    id: LISTING_AUDIT_STEP_IDS.fullAsoAudit,
    label: 'Finalize',
    description: 'Publish the score card and action plan',
  },
] as const

const PARALLEL_SCORE_STEPS = [
  LISTING_AUDIT_STEP_IDS.scoreListingText,
  LISTING_AUDIT_STEP_IDS.scoreVisualAssets,
  LISTING_AUDIT_STEP_IDS.scoreMarketSignals,
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getRunningStepIds(part: WorkflowDataPart) {
  return Object.entries(part.data.steps ?? {}).flatMap(([stepId, step]) =>
    step.status === 'running' ? [stepId] : [],
  )
}

function getActiveStepId(part: WorkflowDataPart) {
  const runningStep = getRunningStepIds(part)[0]
  const suspendedStep = Object.entries(part.data.steps ?? {}).find(([, step]) => step.status === 'suspended')?.[0]

  return runningStep ?? suspendedStep
}

function getStepIndex(stepId: string) {
  return WORKFLOW_STEPS.findIndex((step) => step.id === stepId)
}

function getFailedStepIds(part: WorkflowDataPart) {
  return Object.entries(part.data.steps ?? {}).flatMap(([stepId, step]) =>
    step.status === 'failed' ? [stepId] : [],
  )
}

function getStepLabel(stepId: string) {
  return WORKFLOW_STEPS.find((step) => step.id === stepId)?.label ?? stepId
}

function getStepState(part: WorkflowDataPart, stepId: string) {
  const status = part.data.steps?.[stepId]?.status
  const activeStep = getActiveStepId(part)
  const stepIndex = getStepIndex(stepId)
  const activeStepIndex = activeStep ? getStepIndex(activeStep) : -1
  const isFailed = status === 'failed'
  const isActive = status === 'running' || status === 'suspended'
  const isRejected = getRejectedWorkflowOutput(part.data) !== null || part.data.status === 'bailed'

  return {
    isDone:
      status === 'success' ||
      (!isRejected && part.data.status === 'success' && !isFailed) ||
      (!isFailed && activeStepIndex >= 0 && stepIndex >= 0 && stepIndex < activeStepIndex),
    isActive,
    isFailed,
  }
}

function getStepDisplayStatus(part: WorkflowDataPart, stepId: string) {
  const rawStatus = part.data.steps?.[stepId]?.status
  const { isDone, isActive, isFailed } = getStepState(part, stepId)

  if (isFailed) {
    return 'Failed'
  }

  if (isActive && rawStatus === 'suspended') {
    return 'Waiting'
  }

  if (isActive) {
    return 'Running'
  }

  if (isDone) {
    return 'Done'
  }

  return 'Queued'
}

function getWorkflowProgressState(part: WorkflowDataPart) {
  const activeStep = getActiveStepId(part)
  const runningSteps = getRunningStepIds(part)
  const failedStep = getFailedStepIds(part)[0]
  const isRejected = getRejectedWorkflowOutput(part.data) !== null || part.data.status === 'bailed'
  const activeParallelScores = runningSteps.filter((stepId) =>
    PARALLEL_SCORE_STEPS.includes(stepId as (typeof PARALLEL_SCORE_STEPS)[number]),
  )
  let statusLabel = 'Audit workflow'

  if (isRejected) {
    statusLabel = 'Listing declined'
  } else if (failedStep) {
    statusLabel = `${getStepLabel(failedStep)} failed`
  } else if (part.data.status === 'failed') {
    statusLabel = 'Audit failed'
  } else if (part.data.status === 'suspended') {
    statusLabel = 'Waiting for confirmation'
  } else if (activeParallelScores.length > 1) {
    statusLabel = 'Scoring copy, visuals and market signals in parallel'
  } else if (activeStep) {
    statusLabel = RUNNING_STEP_LABELS[activeStep] ?? 'Running audit workflow'
  } else if (part.data.status === 'success') {
    statusLabel = 'Audit complete'
  }

  const completedSteps = WORKFLOW_STEPS.filter((step) => getStepState(part, step.id).isDone).length

  return {
    completedSteps,
    statusLabel,
  }
}

function getWorkflowDetail(part: WorkflowDataPart) {
  const runningSteps = getRunningStepIds(part)
  const failedStep = getFailedStepIds(part)[0]
  const rejectedOutput = getRejectedWorkflowOutput(part.data)
  const activeParallelScores = runningSteps.filter((stepId) =>
    PARALLEL_SCORE_STEPS.includes(stepId as (typeof PARALLEL_SCORE_STEPS)[number]),
  )

  if (rejectedOutput || part.data.status === 'bailed') {
    return rejectedOutput?.narrative ?? 'The selected App Store listing was declined, so the audit did not continue.'
  }

  if (failedStep) {
    return `${getStepLabel(failedStep)} could not complete. The audit did not produce a final score card or recommendations.`
  }

  if (part.data.status === 'failed') {
    return 'The audit workflow failed before producing a final score card or recommendations.'
  }

  if (part.data.status === 'suspended') {
    return 'Confirm the listing to begin evidence collection and scoring.'
  }

  if (activeParallelScores.length > 0) {
    return activeParallelScores.length > 1
      ? 'Three focused scoring checks run concurrently; this stage completes when the longest remaining check finishes.'
      : 'The remaining score check is finishing before the weighted score card can be calculated.'
  }

  if (part.data.steps?.[LISTING_AUDIT_STEP_IDS.generateActionPlan]?.status === 'running') {
    return 'The weighted score is ready. Recommendations are being grounded in the collected evidence.'
  }

  if (part.data.status === 'success') {
    return 'The score card, comparison set and recommended actions are ready in the conversation.'
  }

  return 'Public App Store evidence is collected before any score or recommendation is produced.'
}

function getProgressFacts(part: WorkflowDataPart) {
  const facts: Array<{ label: string; value: string }> = []
  const evidenceOutput = part.data.steps?.[LISTING_AUDIT_STEP_IDS.collectMarketSignals]?.output

  if (isRecord(evidenceOutput)) {
    if (Array.isArray(evidenceOutput.recentReviews)) {
      facts.push({ label: 'Reviews', value: `${evidenceOutput.recentReviews.length} sampled` })
    }
    if (Array.isArray(evidenceOutput.relatedApps)) {
      facts.push({ label: 'Related apps', value: `${evidenceOutput.relatedApps.length} compared` })
    }
    const pageEvidence = evidenceOutput.listingPageEvidence
    if (isRecord(pageEvidence) && Array.isArray(pageEvidence.screenshotImageUrls)) {
      facts.push({ label: 'Screenshots', value: `${pageEvidence.screenshotImageUrls.length} found` })
    }
  }

  const assembledOutput = part.data.steps?.[LISTING_AUDIT_STEP_IDS.assembleScoreCard]?.output
  if (isRecord(assembledOutput) && isRecord(assembledOutput.scoreCard) && typeof assembledOutput.scoreCard.overallScore === 'number') {
    facts.unshift({ label: 'ASO score', value: `${Math.round(assembledOutput.scoreCard.overallScore)}/100` })
  }

  const finalOutput = part.data.steps?.[LISTING_AUDIT_STEP_IDS.fullAsoAudit]?.output
  if (isRecord(finalOutput) && isRecord(finalOutput.report) && typeof finalOutput.report.overallScore === 'number') {
    facts[0] = { label: 'ASO score', value: `${Math.round(finalOutput.report.overallScore)}/100` }
  }

  return facts.slice(0, 4)
}

function getAuditTone(status: WorkflowDataPart['data']['status'], rejected = false) {
  if (rejected) {
    return {
      stroke: '#fb7185',
      chipClass: 'border-rose-400/30 bg-rose-400/12 hover:bg-rose-400/18',
      ringIcon: X,
      iconClass: 'text-rose-400',
      label: 'Listing declined',
    }
  }

  switch (status) {
    case 'success':
      return {
        stroke: 'var(--primary)',
        chipClass: 'border-primary/30 bg-primary/12 hover:bg-primary/18',
        ringIcon: Check,
        iconClass: 'text-primary',
        label: 'Audit complete',
      }
    case 'failed':
    case 'bailed':
    case 'canceled':
      return {
        stroke: '#fb7185',
        chipClass: 'border-rose-400/30 bg-rose-400/12 hover:bg-rose-400/18',
        ringIcon: status === 'failed' ? TriangleAlert : X,
        iconClass: 'text-rose-400',
        label: status === 'failed' ? 'Audit failed' : 'Audit stopped',
      }
    case 'suspended':
      return {
        stroke: '#fbbf24',
        chipClass: 'border-amber-400/30 bg-amber-400/12 hover:bg-amber-400/18',
        ringIcon: Clock,
        iconClass: 'text-amber-400',
        label: 'Waiting for you',
      }
    default:
      return {
        stroke: '#38bdf8',
        chipClass: 'border-sky-400/30 bg-sky-400/12 hover:bg-sky-400/18',
        ringIcon: LoaderCircle,
        iconClass: 'text-sky-400 animate-spin',
        label: 'Auditing',
      }
  }
}

export function AuditProgressChip({
  part,
  open,
  onToggle,
}: {
  part: WorkflowPart | null
  open: boolean
  onToggle: () => void
}) {
  if (!part || !isWorkflowSnapshotPart(part)) {
    return null
  }

  const { completedSteps } = getWorkflowProgressState(part)
  const total = WORKFLOW_STEPS.length
  const progressPercent = Math.round((completedSteps / total) * 100)
  const tone = getAuditTone(part.data.status, getRejectedWorkflowOutput(part.data) !== null)
  const RingIcon = tone.ringIcon
  const radius = 9
  const circumference = 2 * Math.PI * radius

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={open}
      aria-label={open ? 'Hide audit progress' : 'Show audit progress'}
      title={open ? 'Hide audit progress' : 'Show audit progress'}
      className={[
        'group flex items-center gap-2.5 rounded-full border py-1.5 pr-3.5 pl-2 text-left transition-colors',
        open ? 'border-border bg-muted text-foreground/72 hover:bg-muted/70' : `${tone.chipClass} text-foreground`,
      ].join(' ')}
    >
      <span className="relative flex size-6 items-center justify-center" aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" className="-rotate-90">
          <circle cx="12" cy="12" r={radius} fill="none" stroke="var(--border)" strokeWidth="2.5" />
          <circle
            cx="12"
            cy="12"
            r={radius}
            fill="none"
            stroke={open ? 'var(--muted-foreground)' : tone.stroke}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={`${(progressPercent / 100) * circumference} ${circumference}`}
          />
        </svg>
        <RingIcon className={['absolute size-3', open ? 'text-foreground/55' : tone.iconClass].join(' ')} />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-xs font-medium">{tone.label}</span>
        <span className="font-mono text-[10px] text-foreground/45">
          {completedSteps}/{total} steps · {progressPercent}%
        </span>
      </span>
    </button>
  )
}

function WorkflowStepList({ part }: { part: WorkflowDataPart }) {
  const activeStepId = getActiveStepId(part)
  const activeStepRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    if (!activeStepId || !activeStepRef.current) {
      return
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    activeStepRef.current.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'nearest',
    })
  }, [activeStepId])

  return (
    <ol>
      {WORKFLOW_STEPS.map((step, index) => {
        const { isDone, isActive, isFailed } = getStepState(part, step.id)
        const Icon = isFailed ? TriangleAlert : isDone ? Check : isActive ? LoaderCircle : Circle
        const displayStatus = getStepDisplayStatus(part, step.id)
        const isLast = index === WORKFLOW_STEPS.length - 1
        const showStatusLabel = displayStatus !== 'Done' && displayStatus !== 'Queued'

        return (
          <li key={step.id} ref={step.id === activeStepId ? activeStepRef : undefined} className="flex gap-3">
            <div className="flex shrink-0 flex-col items-center">
              <span
                className={[
                  'flex size-7 items-center justify-center rounded-full border',
                  isActive
                    ? 'border-sky-400/40 bg-sky-400/10'
                    : isDone
                      ? 'border-teal-400/30 bg-teal-400/10'
                      : isFailed
                        ? 'border-red-400/30 bg-red-500/10'
                        : 'border-border bg-muted/50',
                ].join(' ')}
              >
                <Icon
                  aria-hidden="true"
                  className={[
                    'size-3.5',
                    isActive ? 'animate-spin text-sky-400' : isDone ? 'text-teal-300' : isFailed ? 'text-red-400' : 'text-foreground/28',
                  ].join(' ')}
                />
              </span>
              {!isLast && (
                <span
                  className={[
                    'mt-1 w-px flex-1',
                    isDone ? 'bg-teal-400/25' : isActive ? 'bg-sky-400/25' : 'bg-border/60',
                  ].join(' ')}
                />
              )}
            </div>
            <div className={['min-w-0 flex-1', isLast ? 'pb-0' : 'pb-4'].join(' ')}>
              <div className="flex items-start justify-between gap-3">
                <p
                  className={[
                    'truncate text-sm font-medium',
                    isActive ? 'text-foreground' : isDone ? 'text-foreground/70' : isFailed ? 'text-foreground/78' : 'text-foreground/40',
                  ].join(' ')}
                  title={step.label}
                >
                  {step.label}
                </p>
                {showStatusLabel && (
                  <span className={['shrink-0 text-xs', isActive ? 'text-sky-400' : isFailed ? 'text-red-400' : 'text-amber-400'].join(' ')}>
                    {displayStatus}
                  </span>
                )}
              </div>
              <p
                className={[
                  'mt-0.5 text-xs leading-5',
                  isActive ? 'text-foreground/55' : 'text-foreground/38',
                ].join(' ')}
              >
                {step.description}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export function WorkflowProgressPanel({
  part,
  onClose,
}: {
  part: WorkflowPart | null
  onClose?: () => void
}) {
  if (!part || !isWorkflowSnapshotPart(part)) {
    return null
  }

  const { completedSteps, statusLabel } = getWorkflowProgressState(part)
  const progressPercent = Math.round((completedSteps / WORKFLOW_STEPS.length) * 100)
  const detail = getWorkflowDetail(part)
  const facts = getProgressFacts(part)

  return (
    <aside aria-live="polite" className="flex h-full min-h-0 w-full flex-col bg-card">
      <div className="shrink-0 border-b border-border px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground/86">Audit progress</p>
            <p className="mt-1 text-xs leading-5 text-foreground/58">{statusLabel}</p>
          </div>
          <div className="flex items-center gap-1">
            {part.data.status === 'running' ? (
              <LoaderCircle className="size-4 animate-spin text-sky-400" aria-hidden="true" />
            ) : null}
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                aria-label="Hide audit progress"
                className="flex size-8 items-center justify-center rounded-lg text-foreground/45 transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-foreground/50">{completedSteps} of {WORKFLOW_STEPS.length} steps complete</span>
            <span className="font-mono text-teal-300">{progressPercent}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-teal-300 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-foreground/44">{detail}</p>
        {facts.length > 0 ? (
          <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3">
            {facts.map((fact) => (
              <div key={fact.label} className="flex flex-col rounded-lg bg-muted/60 px-3 py-2">
                <dt className="text-[10px] uppercase tracking-wider text-foreground/38">{fact.label}</dt>
                <dd className="mt-0.5 font-mono text-sm font-medium text-foreground/80">{fact.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-4 py-4">
          <WorkflowStepList part={part} />
        </div>
      </ScrollArea>
    </aside>
  )
}

export function WorkflowStickyTimeline({
  part,
  open,
  onOpenChange,
}: {
  part: WorkflowPart | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!part || !isWorkflowSnapshotPart(part)) {
    return null
  }

  const { completedSteps, statusLabel } = getWorkflowProgressState(part)
  const ToggleIcon = open ? ChevronUp : ChevronDown
  const detail = getWorkflowDetail(part)

  return (
    <aside
      aria-live="polite"
      className="workflow-popover rounded-2xl border border-border bg-card/94 p-3 shadow-lg backdrop-blur-xl"
    >
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 text-left"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Route className="size-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground/84" title={statusLabel}>{statusLabel}</span>
          <span className="mt-0.5 block font-mono text-[10px] tracking-[0.12em] text-foreground/38 uppercase">
            {completedSteps}/{WORKFLOW_STEPS.length} steps complete
          </span>
        </span>
        <ToggleIcon className="size-4 shrink-0 text-foreground/45" aria-hidden="true" />
      </button>
      {open ? (
        <>
          <p className="mt-3 border-t border-border pt-3 text-xs leading-5 text-foreground/44">{detail}</p>
          <ol className="mt-3 grid grid-cols-5 gap-2">
            {WORKFLOW_STEPS.map((step) => {
              const { isDone, isActive, isFailed } = getStepState(part, step.id)

              return (
                <li key={step.id} className="min-w-0">
                  <div
                    className={[
                      'h-1 rounded-full transition-colors duration-200',
                      isFailed ? 'bg-red-400' : isActive ? 'bg-sky-400' : isDone ? 'bg-teal-300' : 'bg-muted',
                    ].join(' ')}
                  />
                  <p
                    className={['mt-2 truncate text-xs font-medium', isActive ? 'text-foreground/86' : 'text-foreground/52'].join(' ')}
                    title={step.label}
                  >
                    {step.label}
                  </p>
                </li>
              )
            })}
          </ol>
        </>
      ) : null}
    </aside>
  )
}
