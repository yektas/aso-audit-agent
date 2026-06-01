import { convertMessages, MessageList } from '@mastra/core/agent'
import type { MastraMemory } from '@mastra/core/memory'
import { handleChatStream, type WorkflowDataPart } from '@mastra/ai-sdk'
import { createUIMessageStreamResponse, type UIMessage } from 'ai'
import { NextResponse } from 'next/server'

import { appendAuditVisitorCookie, getAuditVisitorSession } from '@/lib/audit-session'
import { AUDIT_AGENT_ID, getAuditMemory, getOwnedAuditThread } from '@/lib/audit-conversations'
import { mastra } from '@/mastra'

type ChatParams = {
  memory?: Record<string, unknown>
  messages?: unknown[]
  threadId?: string
} & Record<string, unknown>

function getThreadId(value: unknown) {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function isSuspendedNestedWorkflowPart(part: unknown): part is WorkflowDataPart {
  return (
    typeof part === 'object' &&
    part !== null &&
    'type' in part &&
    part.type === 'data-tool-workflow' &&
    'data' in part &&
    part.data !== null &&
    typeof part.data === 'object' &&
    'status' in part.data &&
    part.data.status === 'suspended'
  )
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

  const persistedPart = {
    ...suspendedPart,
    data: {
      ...suspendedPart.data,
      runId: suspendedPart.id,
    },
  } as WorkflowDataPart
  const messages = convertMessages([
    {
      id: crypto.randomUUID(),
      role: 'assistant',
      parts: [persistedPart],
    } as UIMessage,
  ]).to('Mastra.V2')

  await memory.saveMessages({
    messages: messages.map((message) => ({ ...message, threadId, resourceId })),
  })
}

export async function POST(req: Request) {
  const session = getAuditVisitorSession(req)
  const params = (await req.json()) as ChatParams
  const threadId = getThreadId(params.threadId)

  if (!threadId) {
    return appendAuditVisitorCookie(NextResponse.json({ error: 'A conversation thread is required.' }, { status: 400 }), session)
  }

  const memory = await getAuditMemory()
  const thread = await getOwnedAuditThread(memory, threadId, session.resourceId)

  if (!thread) {
    return appendAuditVisitorCookie(NextResponse.json({ error: 'Conversation not found.' }, { status: 404 }), session)
  }

  const { threadId: _threadId, memory: _memory, ...mastraParams } = params
  const stream = await handleChatStream({
    version: 'v6',
    mastra,
    agentId: AUDIT_AGENT_ID,
    params: {
      ...mastraParams,
      memory: {
        thread: {
          id: thread.id,
          title: thread.title,
          metadata: thread.metadata,
        },
        resource: session.resourceId,
      },
    } as Parameters<typeof handleChatStream>[0]['params'],
  })
  const [clientStream, persistenceStream] = stream.tee()
  void persistSuspendedWorkflowPart(persistenceStream, memory, thread.id, session.resourceId).catch((error: unknown) => {
    console.error('Unable to persist suspended audit workflow event.', error)
  })

  return appendAuditVisitorCookie(createUIMessageStreamResponse({ stream: clientStream }), session)
}

export async function GET(req: Request) {
  const session = getAuditVisitorSession(req)
  const threadId = getThreadId(new URL(req.url).searchParams.get('threadId'))

  if (!threadId) {
    return appendAuditVisitorCookie(NextResponse.json({ error: 'A conversation thread is required.' }, { status: 400 }), session)
  }

  const memory = await getAuditMemory()
  const thread = await getOwnedAuditThread(memory, threadId, session.resourceId)

  if (!thread) {
    return appendAuditVisitorCookie(NextResponse.json({ error: 'Conversation not found.' }, { status: 404 }), session)
  }

  const recalled = await memory.recall({
    threadId,
    resourceId: session.resourceId,
    perPage: false,
  })
  const messageList = new MessageList({ threadId, resourceId: session.resourceId })
  messageList.add(recalled.messages, 'memory')

  return appendAuditVisitorCookie(NextResponse.json(messageList.get.all.aiV6.ui()), session)
}
