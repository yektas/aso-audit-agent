import { convertMessages, MessageList } from '@mastra/core/agent'
import type { MastraMemory } from '@mastra/core/memory'
import { handleChatStream, type WorkflowDataPart } from '@mastra/ai-sdk'
import { createUIMessageStreamResponse, safeValidateUIMessages, type UIMessage, type UIMessageChunk } from 'ai'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { appendVisitorCookie, getVisitorSession } from '@/lib/visitor-session'
import { CONVERSATION_AGENT_ID, getConversationMemory, getOwnedConversationThread } from '@/lib/conversation-memory'
import { getWorkflowRunId, isWorkflowPart, isWorkflowSnapshotPart, withPersistedWorkflowRunId } from '@/lib/workflow-parts'
import { handleWorkflowResume } from '@/lib/workflow-resume'
import { mastra } from '@/mastra'
import { asoAuditModel } from '@/mastra/model'
import { LISTING_AUDIT_WORKFLOW_KEY } from '@/mastra/workflows/listing-audit/contract'

const chatParamsSchema = z.object({
  messages: z.unknown().optional(),
  threadId: z.string().trim().min(1).optional(),
  trigger: z.enum(['submit-message', 'regenerate-message']).optional(),
  workflowResume: z.object({
    confirmed: z.boolean(),
    runId: z.string().trim().min(1),
  }).optional(),
}).strict()

const THREAD_TITLE_INSTRUCTIONS = 'Generate a concise title of at most five words for this App Store audit conversation.'

function getThreadId(value: unknown) {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function getUiMessagesForTitleGeneration(messages: unknown[] | undefined) {
  if (!Array.isArray(messages)) {
    return []
  }

  return messages.flatMap((message) => {
    if (typeof message !== 'object' || message === null || !('role' in message) || typeof message.role !== 'string') {
      return []
    }

    const content =
      'content' in message && typeof message.content === 'string'
        ? message.content
        : undefined
    const parts =
      'parts' in message && Array.isArray(message.parts)
        ? message.parts.filter((part) => typeof part === 'object' && part !== null && 'type' in part)
        : undefined

    return [{ role: message.role, content, parts }]
  })
}

function isSuspendedNestedWorkflowPart(part: unknown): part is WorkflowDataPart {
  return isWorkflowPart(part) && isWorkflowSnapshotPart(part) && part.type === 'data-tool-workflow' && part.data.status === 'suspended'
}

function isNestedWorkflowPart(part: unknown): part is WorkflowDataPart {
  return isWorkflowPart(part) && isWorkflowSnapshotPart(part)
}

async function getAutoResumeOverride(memory: MastraMemory, threadId: string, resourceId: string) {
  const recalled = await memory.recall({ threadId, resourceId, perPage: false })
  const messageList = new MessageList({ threadId, resourceId })
  messageList.add(recalled.messages, 'memory')
  const messages = messageList.get.all.aiV6.ui()

  for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
    const parts = messages[messageIndex].parts

    for (let partIndex = parts.length - 1; partIndex >= 0; partIndex -= 1) {
      const part = parts[partIndex]
      if (!isNestedWorkflowPart(part)) {
        continue
      }

      if (!isSuspendedNestedWorkflowPart(part)) {
        return false
      }

      const runId = getWorkflowRunId(part)
      if (!runId) {
        return false
      }

      const state = await mastra.getWorkflow(LISTING_AUDIT_WORKFLOW_KEY).getWorkflowRunById(runId)
      return state?.status === 'suspended' ? undefined : false
    }
  }

  return undefined
}

async function persistSuspendedWorkflowPart(
  stream: ReadableStream<unknown>,
  memory: MastraMemory,
  threadId: string,
  resourceId: string,
) {
  let suspendedPart: WorkflowDataPart | null = null
  const reader = stream.getReader()

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }

      if (isSuspendedNestedWorkflowPart(value)) {
        suspendedPart = value
      }
    }
  } finally {
    reader.releaseLock()
  }

  if (!suspendedPart) {
    return
  }

  const persistedPart = withPersistedWorkflowRunId(suspendedPart)
  const messages = convertMessages([
    {
      id: crypto.randomUUID(),
      role: 'assistant',
      parts: [persistedPart],
    } satisfies UIMessage,
  ]).to('Mastra.V2')

  await memory.saveMessages({
    messages: messages.map((message) => ({ ...message, threadId, resourceId })),
  })
}

export async function POST(req: Request) {
  const parsedParams = chatParamsSchema.safeParse(await req.json())
  if (!parsedParams.success) {
    const session = getVisitorSession(req)
    return appendVisitorCookie(NextResponse.json({ error: 'The chat request body was invalid.' }, { status: 400 }), session)
  }

  const params = parsedParams.data
  const threadId = getThreadId(params.threadId)

  if (params.workflowResume) {
    return handleWorkflowResume(req, {
      threadId,
      runId: params.workflowResume.runId,
      resumeData: {
        confirmed: params.workflowResume.confirmed,
      },
    })
  }

  const validatedMessages = await safeValidateUIMessages<UIMessage>({
    messages: params.messages ?? [],
  })
  if (!validatedMessages.success) {
    const session = getVisitorSession(req)
    return appendVisitorCookie(NextResponse.json({ error: 'The chat messages were invalid.' }, { status: 400 }), session)
  }

  const session = getVisitorSession(req)

  if (!threadId) {
    return appendVisitorCookie(NextResponse.json({ error: 'A conversation thread is required.' }, { status: 400 }), session)
  }

  const memory = await getConversationMemory()
  const thread = await getOwnedConversationThread(memory, threadId, session.resourceId)

  if (!thread) {
    return appendVisitorCookie(NextResponse.json({ error: 'Conversation not found.' }, { status: 404 }), session)
  }

  let resolvedThread = thread
  const titleMessages = getUiMessagesForTitleGeneration(validatedMessages.data)

  if (!resolvedThread.title && titleMessages.length > 0) {
    try {
      const title = await mastra
        .getAgentById(CONVERSATION_AGENT_ID)
        .generateTitleFromUserMessage({
          messages: titleMessages,
          model: asoAuditModel,
          instructions: THREAD_TITLE_INSTRUCTIONS,
        })

      if (title) {
        resolvedThread = await memory.createThread({
          threadId: resolvedThread.id,
          resourceId: session.resourceId,
          metadata: resolvedThread.metadata,
          title,
        })
      }
    } catch (error) {
      console.error('Unable to generate audit thread title.', error)
    }
  }

  const autoResumeSuspendedTools = await getAutoResumeOverride(memory, thread.id, session.resourceId)
  const streamParams = {
    // Mastra's AI SDK currently carries its own bundled v6 UI message types.
    messages: validatedMessages.data as never[],
    ...(params.trigger ? { trigger: params.trigger } : {}),
    ...(autoResumeSuspendedTools === false ? { autoResumeSuspendedTools } : {}),
    memory: {
      thread: {
        id: resolvedThread.id,
        title: resolvedThread.title,
        metadata: resolvedThread.metadata,
      },
      resource: session.resourceId,
    },
  }
  const stream = await handleChatStream({
    version: 'v6',
    mastra,
    agentId: CONVERSATION_AGENT_ID,
    sendReasoning: true,
    params: streamParams,
  })
  const [clientStream, persistenceStream] = stream.tee()
  void persistSuspendedWorkflowPart(persistenceStream, memory, thread.id, session.resourceId).catch((error: unknown) => {
    console.error('Unable to persist suspended audit workflow event.', error)
  })

  return appendVisitorCookie(
    createUIMessageStreamResponse({ stream: clientStream as unknown as ReadableStream<UIMessageChunk> }),
    session,
  )
}

export async function GET(req: Request) {
  const session = getVisitorSession(req)
  const threadId = getThreadId(new URL(req.url).searchParams.get('threadId'))

  if (!threadId) {
    return appendVisitorCookie(NextResponse.json({ error: 'A conversation thread is required.' }, { status: 400 }), session)
  }

  const memory = await getConversationMemory()
  const thread = await getOwnedConversationThread(memory, threadId, session.resourceId)

  if (!thread) {
    return appendVisitorCookie(NextResponse.json({ error: 'Conversation not found.' }, { status: 404 }), session)
  }

  const recalled = await memory.recall({
    threadId,
    resourceId: session.resourceId,
    perPage: false,
  })
  const messageList = new MessageList({ threadId, resourceId: session.resourceId })
  messageList.add(recalled.messages, 'memory')

  return appendVisitorCookie(NextResponse.json(messageList.get.all.aiV6.ui()), session)
}
