'use client'

import { useMemo, useState } from 'react'

import { useAuditConversation } from '@/hooks/use-audit-conversation'

import { AuditComposer } from './audit-composer'
import { AuditTranscript } from './audit-transcript'
import { ConversationSidebar } from './conversation-sidebar'
import { WelcomePanel } from './welcome-panel'

export function AuditChatWorkspace() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const {
    conversationError,
    conversationLoading,
    createThread,
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
  } = useAuditConversation()
  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId),
    [selectedThreadId, threads],
  )
  const readyForInput = Boolean(selectedThreadId) && !conversationLoading
  const threadTitle = selectedThreadId ? selectedThread?.title || 'New audit conversation' : 'ASO Audit Agent'

  return (
    <main className="audit-canvas relative flex h-dvh overflow-hidden bg-[#050505] p-4 text-white">
      <ConversationSidebar
        threads={threads}
        selectedThreadId={selectedThreadId}
        loading={historyLoading}
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        onCreate={() => void createThread()}
        onSelect={(threadId) => void selectThread(threadId)}
      />
      <section className="audit-shell relative ml-0 flex min-w-0 flex-1 flex-col overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#0c0c0c] md:ml-4">
        <header className="flex h-16 shrink-0 items-center border-b border-white/10 px-16 md:px-7">
          <p className="truncate text-sm font-medium text-white/78">{threadTitle}</p>
        </header>
        {historyError && <p className="mx-6 mt-5 rounded-xl border border-red-300/15 bg-red-500/8 p-3 text-sm text-red-100/75">{historyError}</p>}
        {conversationError && (
          <p className="mx-6 mt-5 rounded-xl border border-red-300/15 bg-red-500/8 p-3 text-sm text-red-100/75">
            {conversationError}
          </p>
        )}
        {conversationLoading ? (
          <div className="flex min-h-0 flex-1 items-center justify-center font-mono text-xs tracking-[0.18em] text-[#ccff00]/65 uppercase">
            Loading conversation
          </div>
        ) : messages.length === 0 ? (
          <div className="flex min-h-0 flex-1 overflow-y-auto px-5 py-7 sm:px-8">
            <WelcomePanel disabled={!readyForInput || status !== 'ready'} onStarter={submitPrompt} />
          </div>
        ) : (
          <AuditTranscript
            messages={messages}
            status={status}
            pendingRunId={pendingConfirmation?.runId ?? null}
            onConfirm={(runId) => resolveConfirmation(runId, true)}
            onReject={(runId) => resolveConfirmation(runId, false)}
          />
        )}
        <AuditComposer
          disabled={!readyForInput}
          status={status}
          onSubmit={submitPrompt}
          onStop={() => void stop()}
        />
      </section>
    </main>
  )
}
