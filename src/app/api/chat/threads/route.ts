import { NextResponse } from 'next/server'

import { appendVisitorCookie, getVisitorSession } from '@/lib/visitor-session'
import { CONVERSATION_THREAD_METADATA, getConversationMemory, getOwnedConversationThread } from '@/lib/conversation-memory'

function getThreadId(value: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export async function GET(req: Request) {
  const session = getVisitorSession(req)
  const memory = await getConversationMemory()
  const result = await memory.listThreads({
    filter: {
      resourceId: session.resourceId,
      metadata: CONVERSATION_THREAD_METADATA,
    },
    orderBy: {
      field: 'updatedAt',
      direction: 'DESC',
    },
    page: 0,
    perPage: 50,
  })

  return appendVisitorCookie(NextResponse.json(result.threads), session)
}

export async function POST(req: Request) {
  const session = getVisitorSession(req)
  const memory = await getConversationMemory()
  const thread = await memory.createThread({
    resourceId: session.resourceId,
    metadata: CONVERSATION_THREAD_METADATA,
  })

  return appendVisitorCookie(NextResponse.json(thread, { status: 201 }), session)
}

export async function DELETE(req: Request) {
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

  await memory.deleteThread(thread.id)

  return appendVisitorCookie(NextResponse.json({ success: true }), session)
}
