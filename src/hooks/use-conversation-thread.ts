'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { getPendingListingConfirmation } from '@/lib/workflow-parts'
import type { ConversationMessage, ConversationThread } from '@/components/conversation/message-types'
import { readJsonOrThrow, toUiError, type UiErrorState } from '@/lib/ui-error'

const ACTIVE_THREAD_STORAGE_KEY = 'conversation-active-thread'
const LEGACY_ACTIVE_THREAD_STORAGE_KEY = 'aso-audit-active-thread'

function rememberThread(threadId: string) {
  window.localStorage.setItem(ACTIVE_THREAD_STORAGE_KEY, threadId)
  window.localStorage.removeItem(LEGACY_ACTIVE_THREAD_STORAGE_KEY)
}

function forgetRememberedThread() {
  window.localStorage.removeItem(ACTIVE_THREAD_STORAGE_KEY)
  window.localStorage.removeItem(LEGACY_ACTIVE_THREAD_STORAGE_KEY)
}

function readRememberedThread() {
  return window.localStorage.getItem(ACTIVE_THREAD_STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_ACTIVE_THREAD_STORAGE_KEY)
}

export function useConversationThread() {
  const [threads, setThreads] = useState<ConversationThread[]>([])
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [pendingNewThread, setPendingNewThread] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [conversationLoading, setConversationLoading] = useState(false)
  const [historyError, setHistoryError] = useState<UiErrorState | null>(null)
  const [conversationError, setConversationError] = useState<UiErrorState | null>(null)
  const activeThreadRef = useRef<string | null>(null)
  const refreshThreadsRef = useRef<() => Promise<void>>(async () => undefined)

  const transport = useMemo(
    () =>
      new DefaultChatTransport<ConversationMessage>({
        api: '/api/chat',
        prepareSendMessagesRequest: ({ messages, api, body, credentials, headers }) => {
          const lastMessage = messages.at(-1)
          const resume = lastMessage?.metadata?.workflowResume
          const threadId = typeof body?.threadId === 'string' ? body.threadId : null

          if (resume) {
            return {
              api,
              credentials,
              headers,
              body: {
                threadId,
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
              threadId,
            },
          }
        },
      }),
    [],
  )

  const { messages, sendMessage, setMessages, status, stop, error, clearError } = useChat<ConversationMessage>({
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
      const nextThreads = await readJsonOrThrow<ConversationThread[]>(
        response,
        'Conversation history is unavailable.',
      )
      setThreads(nextThreads)
      setHistoryError(null)
    } catch (error) {
      setHistoryError(toUiError(error, 'Conversation history is unavailable.'))
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
      rememberThread(threadId)

      try {
        const response = await fetch(`/api/chat?threadId=${encodeURIComponent(threadId)}`, { cache: 'no-store' })
        const storedMessages = await readJsonOrThrow<ConversationMessage[]>(
          response,
          'This conversation could not be loaded.',
        )

        if (activeThreadRef.current === threadId) {
          setMessages(storedMessages)
        }
      } catch (error) {
        if (activeThreadRef.current === threadId) {
          setConversationError(toUiError(error, 'This conversation could not be loaded.'))
        }
      } finally {
        if (activeThreadRef.current === threadId) {
          setConversationLoading(false)
        }
      }
    },
    [setMessages],
  )

  const startNewConversation = useCallback(() => {
    activeThreadRef.current = null
    setSelectedThreadId(null)
    setMessages([])
    setConversationError(null)
    setPendingNewThread(true)
    forgetRememberedThread()
  }, [setMessages])

  const createThread = useCallback(async () => {
    setPendingNewThread(false)
    setHistoryLoading(true)
    setHistoryError(null)

    try {
      const response = await fetch('/api/chat/threads', {
        method: 'POST',
      })
      const thread = await readJsonOrThrow<ConversationThread>(
        response,
        'A new conversation could not be created.',
      )
      setThreads((current) => [thread, ...current.filter((item) => item.id !== thread.id)])
      activeThreadRef.current = thread.id
      setSelectedThreadId(thread.id)
      setMessages([])
      setConversationError(null)
      rememberThread(thread.id)
      return thread
    } catch (error) {
      setHistoryError(toUiError(error, 'A new conversation could not be created.'))
      return null
    } finally {
      setHistoryLoading(false)
    }
  }, [setMessages])

  const deleteThread = useCallback(
    async (threadId: string) => {
      setHistoryError(null)

      try {
        const response = await fetch(`/api/chat/threads?threadId=${encodeURIComponent(threadId)}`, {
          method: 'DELETE',
        })
        await readJsonOrThrow<{ success: boolean }>(response, 'This conversation could not be deleted.')

        const remainingThreads = threads.filter((thread) => thread.id !== threadId)
        setThreads(remainingThreads)

        if (selectedThreadId !== threadId) {
          return
        }

        if (remainingThreads.length === 0) {
          startNewConversation()
          return
        }

        await selectThread(remainingThreads[0].id)
      } catch (error) {
        setHistoryError(toUiError(error, 'This conversation could not be deleted.'))
      }
    },
    [selectedThreadId, selectThread, startNewConversation, setMessages, threads],
  )

  useEffect(() => {
    let active = true

    const initialize = async () => {
      try {
        const response = await fetch('/api/chat/threads', { cache: 'no-store' })
        const nextThreads = await readJsonOrThrow<ConversationThread[]>(
          response,
          'Conversation history is unavailable.',
        )
        if (!active) {
          return
        }

        setThreads(nextThreads)
        if (nextThreads.length === 0) {
          if (active) startNewConversation()
          return
        }

        const rememberedThreadId = readRememberedThread()
        const initialThread =
          nextThreads.find((thread) => thread.id === rememberedThreadId) ?? nextThreads[0]
        await selectThread(initialThread.id)
      } catch (error) {
        if (active) {
          setHistoryError(toUiError(error, 'Conversation history is unavailable.'))
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
  }, [startNewConversation, selectThread])

  const submitPrompt = useCallback(
    async (prompt: string) => {
      const text = prompt.trim()
      if (!text || status !== 'ready') {
        return
      }

      clearError()
      setConversationError(null)

      let threadId = selectedThreadId
      if (!threadId) {
        const thread = await createThread()
        if (!thread) return
        threadId = thread.id
      }

      void sendMessage({ text }, { body: { threadId } })
    },
    [clearError, createThread, selectedThreadId, sendMessage, status],
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
      }, { body: { threadId: selectedThreadId } })
    },
    [clearError, selectedThreadId, sendMessage, status],
  )

  const pendingConfirmation = useMemo(() => getPendingListingConfirmation(messages), [messages])
  const visibleMessages = useMemo(
    () => messages.filter((message) => !message.metadata?.transient && !message.metadata?.hiddenWorkflowContext),
    [messages],
  )
  const streamingError = useMemo(
    () => (error ? toUiError(error, 'The audit could not be completed.') : null),
    [error],
  )

  return {
    conversationError: conversationError ?? streamingError,
    conversationLoading,
    deleteThread,
    historyError,
    historyLoading,
    messages: visibleMessages,
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
  }
}
