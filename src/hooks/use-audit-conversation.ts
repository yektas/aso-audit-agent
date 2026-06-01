'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { getPendingAuditConfirmation } from '@/components/aso-audit/audit-workflow-event'
import type { AuditMessage, ConversationThread } from '@/components/aso-audit/types'

const ACTIVE_THREAD_KEY = 'aso-audit-active-thread'

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error('The conversation service could not complete this request.')
  }

  return response.json() as Promise<T>
}

export function useAuditConversation() {
  const [threads, setThreads] = useState<ConversationThread[]>([])
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [conversationLoading, setConversationLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [conversationError, setConversationError] = useState<string | null>(null)
  const activeThreadRef = useRef<string | null>(null)
  const refreshThreadsRef = useRef<() => Promise<void>>(async () => undefined)

  const transport = useMemo(
    () =>
      new DefaultChatTransport<AuditMessage>({
        api: '/api/chat',
        prepareSendMessagesRequest: ({ messages, api, credentials, headers }) => {
          const lastMessage = messages.at(-1)
          const resume = lastMessage?.metadata?.workflowResume

          if (resume) {
            return {
              api,
              credentials,
              headers,
              body: {
                threadId: activeThreadRef.current,
                workflowResume: {
                  runId: resume.runId,
                  confirmed: resume.confirmed,
                },
              },
            }
          }

          return {
            api,
            credentials,
            headers,
            body: {
              messages: lastMessage ? [lastMessage] : [],
              threadId: activeThreadRef.current,
            },
          }
        },
      }),
    [],
  )

  const { messages, sendMessage, setMessages, status, stop, error, clearError } = useChat<AuditMessage>({
    transport,
    onFinish: () => {
      void refreshThreadsRef.current()
      window.setTimeout(() => void refreshThreadsRef.current(), 900)
      window.setTimeout(() => void refreshThreadsRef.current(), 3500)
      window.setTimeout(() => void refreshThreadsRef.current(), 10000)
    },
  })

  const refreshThreads = useCallback(async () => {
    try {
      const response = await fetch('/api/chat/threads', { cache: 'no-store' })
      const nextThreads = await readJson<ConversationThread[]>(response)
      setThreads(nextThreads)
      setHistoryError(null)
    } catch {
      setHistoryError('Conversation history is unavailable.')
    }
  }, [])

  useEffect(() => {
    refreshThreadsRef.current = refreshThreads
  }, [refreshThreads])

  const selectThread = useCallback(
    async (threadId: string) => {
      activeThreadRef.current = threadId
      setSelectedThreadId(threadId)
      setConversationLoading(true)
      setConversationError(null)
      setMessages([])
      window.localStorage.setItem(ACTIVE_THREAD_KEY, threadId)

      try {
        const response = await fetch(`/api/chat?threadId=${encodeURIComponent(threadId)}`, { cache: 'no-store' })
        const storedMessages = await readJson<AuditMessage[]>(response)

        if (activeThreadRef.current === threadId) {
          setMessages(storedMessages)
        }
      } catch {
        if (activeThreadRef.current === threadId) {
          setConversationError('This conversation could not be loaded.')
        }
      } finally {
        if (activeThreadRef.current === threadId) {
          setConversationLoading(false)
        }
      }
    },
    [setMessages],
  )

  const createThread = useCallback(async () => {
    setHistoryLoading(true)
    setHistoryError(null)

    try {
      const response = await fetch('/api/chat/threads', {
        method: 'POST',
      })
      const thread = await readJson<ConversationThread>(response)
      setThreads((current) => [thread, ...current.filter((item) => item.id !== thread.id)])
      activeThreadRef.current = thread.id
      setSelectedThreadId(thread.id)
      setMessages([])
      setConversationError(null)
      window.localStorage.setItem(ACTIVE_THREAD_KEY, thread.id)
    } catch {
      setHistoryError('A new conversation could not be created.')
    } finally {
      setHistoryLoading(false)
    }
  }, [setMessages])

  useEffect(() => {
    let active = true

    const initialize = async () => {
      try {
        const response = await fetch('/api/chat/threads', { cache: 'no-store' })
        const nextThreads = await readJson<ConversationThread[]>(response)
        if (!active) {
          return
        }

        setThreads(nextThreads)
        if (nextThreads.length === 0) {
          await createThread()
          return
        }

        const rememberedThreadId = window.localStorage.getItem(ACTIVE_THREAD_KEY)
        const initialThread =
          nextThreads.find((thread) => thread.id === rememberedThreadId) ?? nextThreads[0]
        await selectThread(initialThread.id)
      } catch {
        if (active) {
          setHistoryError('Conversation history is unavailable.')
        }
      } finally {
        if (active) {
          setHistoryLoading(false)
        }
      }
    }

    void initialize()
    return () => {
      active = false
    }
  }, [createThread, selectThread])

  const submitPrompt = useCallback(
    (prompt: string) => {
      const text = prompt.trim()
      if (!text || !selectedThreadId || status !== 'ready') {
        return
      }

      clearError()
      setConversationError(null)
      void sendMessage({ text })
    },
    [clearError, selectedThreadId, sendMessage, status],
  )

  const resolveConfirmation = useCallback(
    (runId: string, confirmed: boolean) => {
      if (!selectedThreadId || status !== 'ready') {
        return
      }

      clearError()
      void sendMessage({
        text: confirmed ? 'Confirm listing' : 'Reject listing',
        metadata: {
          transient: true,
          workflowResume: {
            runId,
            confirmed,
          },
        },
      })
    },
    [clearError, selectedThreadId, sendMessage, status],
  )

  const pendingConfirmation = useMemo(() => getPendingAuditConfirmation(messages), [messages])
  const visibleMessages = useMemo(
    () => messages.filter((message) => !message.metadata?.transient && !message.metadata?.hiddenWorkflowContext),
    [messages],
  )

  return {
    conversationError: conversationError ?? error?.message ?? null,
    conversationLoading,
    createThread,
    historyError,
    historyLoading,
    messages: visibleMessages,
    pendingConfirmation,
    resolveConfirmation,
    selectThread,
    selectedThreadId,
    status,
    stop,
    submitPrompt,
    threads,
  }
}
