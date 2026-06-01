'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { useConversationThread } from '@/hooks/use-conversation-thread'
import { getLatestWorkflowSnapshot } from '@/lib/workflow-parts'

import { ScrollArea } from '../ui/scroll-area'
import { ErrorPanel } from './error-panel'
import { HistorySidebar } from './history-sidebar'
import { PromptComposer } from './prompt-composer'
import { Transcript } from './transcript'
import { AuditProgressChip } from './workflow-progress'
import { ThemeSwitcher } from '../theme-switcher'
import { WelcomePanel } from './welcome-panel'

export function ConversationWorkspace() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [progressOpen, setProgressOpen] = useState(true)
  const {
    conversationError,
    conversationLoading,
    deleteThread,
    historyError,
    historyLoading,
    messages,
    pendingConfirmation,
    pendingNewThread,
    resolveConfirmation,
    selectThread,
    selectedThreadId,
    startNewConversation,
    status,
    stop,
    submitPrompt,
    threads,
  } = useConversationThread()
  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId),
    [selectedThreadId, threads],
  )
  const latestWorkflowSnapshot = useMemo(() => getLatestWorkflowSnapshot(messages), [messages])

  // Auto-open the progress panel whenever a new workflow snapshot arrives
  const prevSnapshotRef = useRef(latestWorkflowSnapshot)
  useEffect(() => {
    if (latestWorkflowSnapshot && !prevSnapshotRef.current) {
      setProgressOpen(true)
    }
    prevSnapshotRef.current = latestWorkflowSnapshot
  }, [latestWorkflowSnapshot])
  const isWorking = status === 'submitted' || status === 'streaming'
  const readyForInput = (Boolean(selectedThreadId) || pendingNewThread) && !conversationLoading
  const threadTitle = selectedThreadId ? selectedThread?.title || 'New audit conversation' : 'ASO Audit Agent'

  return (
    <main className="conversation-canvas relative flex h-dvh overflow-hidden bg-background p-4 text-foreground">
      <HistorySidebar
        threads={threads}
        selectedThreadId={selectedThreadId}
        loading={historyLoading}
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        onCreate={startNewConversation}
        onDelete={(threadId) => void deleteThread(threadId)}
        onSelect={(threadId) => void selectThread(threadId)}
      />
      <section className="conversation-shell relative ml-0 flex min-w-0 flex-1 flex-col overflow-hidden rounded-[2.5rem] border border-border bg-card md:ml-4">
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border px-16 md:px-7">
          <p className="truncate text-sm font-medium text-foreground/78" title={threadTitle}>{threadTitle}</p>
          <div className="flex items-center gap-2">
            <AuditProgressChip
              part={latestWorkflowSnapshot}
              open={progressOpen}
              onToggle={() => setProgressOpen((open) => !open)}
            />
            <ThemeSwitcher />
          </div>
        </header>
        {historyError && (
          <ErrorPanel
            title="History issue"
            summary={historyError.summary}
            detail={historyError.detail}
            className="mx-6 mt-5"
          />
        )}
        {conversationError && (
          <ErrorPanel
            title="Audit issue"
            summary={conversationError.summary}
            detail={conversationError.detail}
            className="mx-6 mt-5"
          />
        )}
        {conversationLoading ? (
          <div className="flex min-h-0 flex-1 items-center justify-center font-mono text-xs tracking-[0.18em] text-primary/65 uppercase">
            Loading conversation
          </div>
        ) : messages.length === 0 ? (
          <ScrollArea className="min-h-0 flex-1">
            <div className="flex min-h-full px-5 py-7 sm:px-8">
              <WelcomePanel disabled={!readyForInput || isWorking || status !== 'ready'} onStarter={submitPrompt} />
            </div>
          </ScrollArea>
        ) : (
          <Transcript
            messages={messages}
            status={status}
            pendingRunId={pendingConfirmation?.runId ?? null}
            workflowSnapshot={latestWorkflowSnapshot}
            progressOpen={progressOpen}
            onProgressOpenChange={setProgressOpen}
            onConfirm={(runId) => resolveConfirmation(runId, true)}
            onReject={(runId) => resolveConfirmation(runId, false)}
          />
        )}
        <PromptComposer
          disabled={!readyForInput || isWorking}
          status={status}
          onSubmit={submitPrompt}
          onStop={() => void stop()}
        />
      </section>
    </main>
  )
}
