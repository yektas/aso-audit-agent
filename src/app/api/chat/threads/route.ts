import { NextResponse } from 'next/server'

import { appendAuditVisitorCookie, getAuditVisitorSession } from '@/lib/audit-session'
import { AUDIT_THREAD_METADATA, getAuditMemory } from '@/lib/audit-conversations'

export async function GET(req: Request) {
  const session = getAuditVisitorSession(req)
  const memory = await getAuditMemory()
  const result = await memory.listThreads({
    filter: {
      resourceId: session.resourceId,
      metadata: AUDIT_THREAD_METADATA,
    },
    orderBy: {
      field: 'updatedAt',
      direction: 'DESC',
    },
    page: 0,
    perPage: 50,
  })

  return appendAuditVisitorCookie(NextResponse.json(result.threads), session)
}

export async function POST(req: Request) {
  const session = getAuditVisitorSession(req)
  const memory = await getAuditMemory()
  const thread = await memory.createThread({
    resourceId: session.resourceId,
    metadata: AUDIT_THREAD_METADATA,
  })

  return appendAuditVisitorCookie(NextResponse.json(thread, { status: 201 }), session)
}
