'use client'

import {
  StackTrace,
  StackTraceActions,
  StackTraceContent,
  StackTraceError,
  StackTraceErrorMessage,
  StackTraceErrorType,
  StackTraceExpandButton,
  StackTraceFrames,
  StackTraceHeader,
} from '@/components/ai-elements/stack-trace'
import { cn } from '@/lib/utils'

function getFirstMeaningfulLine(value: string) {
  return (
    value
      .split('\n')
      .map((line) => line.trim())
      .find(Boolean) ?? ''
  )
}

function normalizeSummaryLine(value: string) {
  return value
    .replace(/^\{.*"error"\s*:\s*"([^"]+)".*\}$/i, '$1')
    .replace(/^(error|[a-z]+error):\s*/i, '')
    .trim()
}

export function summarizeErrorDetail(detail: string, fallback = 'Something went wrong.') {
  const firstLine = normalizeSummaryLine(getFirstMeaningfulLine(detail))
  if (!firstLine) {
    return fallback
  }

  return firstLine.length > 180 ? `${firstLine.slice(0, 177).trimEnd()}...` : firstLine
}

export function ErrorPanel({
  title = 'Error',
  summary,
  detail,
  className,
}: {
  title?: string
  summary: string
  detail?: string | null
  className?: string
}) {
  if (!detail || detail.trim() === '' || detail.trim() === summary.trim()) {
    return (
      <div className={cn('rounded-2xl border border-red-300/15 bg-red-500/8 px-4 py-3 text-sm text-red-100/80', className)}>
        <p className="font-medium text-red-100">{title}</p>
        <p className="mt-1 text-red-100/72">{summary}</p>
      </div>
    )
  }

  return (
    <StackTrace
      trace={detail}
      className={cn('rounded-2xl border-red-300/15 bg-red-500/8 text-red-100 shadow-none', className)}
    >
      <StackTraceHeader className="hover:bg-red-500/[0.06]">
        <StackTraceError className="min-w-0">
          <StackTraceErrorType className="text-red-100">{title}</StackTraceErrorType>
          <StackTraceErrorMessage className="text-red-100/72">{summary}</StackTraceErrorMessage>
        </StackTraceError>
        <StackTraceActions>
          <StackTraceExpandButton className="text-red-100/60" />
        </StackTraceActions>
      </StackTraceHeader>
      <StackTraceContent className="border-t-red-300/10 bg-muted/45">
        <div className="border-b border-red-300/10 p-3 font-mono text-xs whitespace-pre-wrap text-red-50/78">
          {detail}
        </div>
        <StackTraceFrames className="text-red-50/72" showInternalFrames />
      </StackTraceContent>
    </StackTrace>
  )
}
