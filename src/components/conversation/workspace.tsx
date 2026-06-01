'use client'

import { useMemo, useState } from 'react'

import { useConversationThread } from '@/hooks/use-conversation-thread'

import { ErrorPanel } from './error-panel'
import { HistorySidebar } from './history-sidebar'
import { PromptComposer } from './prompt-composer'
import { Transcript } from './transcript'
import { ThemeSwitcher } from '../theme-switcher'
import { WelcomePanel } from './welcome-panel'

export function ConversationWorkspace() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const {
    conversationError,
    conversationLoading,
    createThread,
    deleteThread,
    historyError,
    historyLoading,
    messages,
    pendingConfirmation,
    resolveConfirmation,
    selectThread,
    selectedThreadId,
    status,
    stop,
    submitPrompt,
    threads,
  } = useConversationThread()
  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId),
    [selectedThreadId, threads],
  )
  const isWorking = status === 'submitted' || status === 'streaming'
  const readyForInput = Boolean(selectedThreadId) && !conversationLoading
  const threadTitle = selectedThreadId ? selectedThread?.title || 'New audit conversation' : 'ASO Audit Agent'

  return (
    <main className="conversation-canvas relative flex h-dvh overflow-hidden bg-background p-4 text-foreground">
      <HistorySidebar
        threads={threads}
        selectedThreadId={selectedThreadId}
        loading={historyLoading}
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        onCreate={() => void createThread()}
        onDelete={(threadId) => void deleteThread(threadId)}
        onSelect={(threadId) => void selectThread(threadId)}
      />
      <section className="conversation-shell relative ml-0 flex min-w-0 flex-1 flex-col overflow-hidden rounded-[2.5rem] border border-border bg-card md:ml-4">
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border px-16 md:px-7">
          <p className="truncate text-sm font-medium text-foreground/78" title={threadTitle}>{threadTitle}</p>
          <ThemeSwitcher />
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
          <div className="flex min-h-0 flex-1 overflow-y-auto px-5 py-7 sm:px-8">
            <WelcomePanel disabled={!readyForInput || isWorking || status !== 'ready'} onStarter={submitPrompt} />
          </div>
        ) : (
          <Transcript
            messages={messages}
            status={status}
            pendingRunId={pendingConfirmation?.runId ?? null}
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
