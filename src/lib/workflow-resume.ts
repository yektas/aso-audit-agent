import { convertMessages, MessageList } from '@mastra/core/agent'
import type { MastraMemory } from '@mastra/core/memory'
import { handleWorkflowStream, type WorkflowDataPart } from '@mastra/ai-sdk'
import { createUIMessageStreamResponse, type UIMessage } from 'ai'
import { NextResponse } from 'next/server'

import { getConversationMemory, getOwnedConversationThread } from '@/lib/conversation-memory'
import { appendVisitorCookie, getVisitorSession } from '@/lib/visitor-session'
import { mastra } from '@/mastra'
import { LISTING_AUDIT_STEP_IDS, LISTING_AUDIT_WORKFLOW_KEY } from '@/mastra/workflows/listing-audit/contract'
import { workflowRejectedOutputSchema, workflowReportOutputSchema } from '@/mastra/workflows/listing-audit/schemas'

export type WorkflowResumeParams = {
  runId?: unknown
  resumeData?: Record<string, unknown>
  threadId?: unknown
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function isWorkflowPart(part: unknown): part is WorkflowDataPart {
  return (
    typeof part === 'object' &&
    part !== null &&
    'type' in part &&
    (part.type === 'data-tool-workflow' || part.type === 'data-workflow') &&
    'data' in part &&
    part.data !== null &&
    typeof part.data === 'object'
  )
}

function getWorkflowRunId(part: WorkflowDataPart) {
  const persistedRunId =
    'runId' in part.data && typeof part.data.runId === 'string' ? part.data.runId : null
  return part.id ?? persistedRunId
}

async function loadStoredMessages(memory: MastraMemory, threadId: string, resourceId: string) {
  const recalled = await memory.recall({ threadId, resourceId, perPage: false })
  const messageList = new MessageList({ threadId, resourceId })
  messageList.add(recalled.messages, 'memory')
  return messageList.get.all.aiV6.ui() as UIMessage[]
}

function hasSuspendedRun(messages: UIMessage[], runId: string) {
  return messages.some((message) =>
    message.parts.some(
      (part) =>
        isWorkflowPart(part) &&
        getWorkflowRunId(part) === runId &&
        part.type === 'data-tool-workflow' &&
        part.data.status === 'suspended',
    ),
  )
}

async function isStoredRunSuspended(runId: string) {
  const state = await mastra.getWorkflow(LISTING_AUDIT_WORKFLOW_KEY).getWorkflowRunById(runId)
  return state?.status === 'suspended'
}

function getWorkflowContextText(part: WorkflowDataPart) {
  const reportOutput = part.data.steps?.[LISTING_AUDIT_STEP_IDS.fullAsoAudit]?.output
  const parsedReportOutput = workflowReportOutputSchema.safeParse(reportOutput)

  if (part.data.status === 'success' && parsedReportOutput.success) {
    return `The ASO audit completed successfully. Structured audit report:\n${JSON.stringify(parsedReportOutput.data.report)}`
  }

  const confirmationOutput = part.data.steps?.[LISTING_AUDIT_STEP_IDS.userConfirmation]?.output
  const parsedRejectedOutput = workflowRejectedOutputSchema.safeParse(confirmationOutput)

  if (parsedRejectedOutput.success) {
    return parsedRejectedOutput.data.narrative
  }

  return null
}

async function persistFinalWorkflowPart(
  stream: ReadableStream<unknown>,
  memory: MastraMemory,
  threadId: string,
  resourceId: string,
) {
  let finalPart: WorkflowDataPart | null = null
  const reader = stream.getReader()

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }

      if (isWorkflowPart(value) && value.type === 'data-workflow' && value.data.status !== 'running') {
        finalPart = value
      }
    }
  } finally {
    reader.releaseLock()
  }

  if (!finalPart) {
    return
  }

  const persistedPart = {
    ...finalPart,
    data: {
      ...finalPart.data,
      runId: finalPart.id,
    },
  } as WorkflowDataPart
  const contextText = getWorkflowContextText(finalPart)
  const uiMessages: UIMessage[] = [
    ...(contextText
      ? [
          {
            id: crypto.randomUUID(),
            role: 'assistant' as const,
            metadata: { hiddenWorkflowContext: true },
            parts: [{ type: 'text' as const, text: contextText }],
          },
        ]
      : []),
    {
      id: crypto.randomUUID(),
      role: 'assistant',
      parts: [persistedPart],
    },
  ]
  const messages = convertMessages(uiMessages).to('Mastra.V2')

  await memory.saveMessages({
    messages: messages.map((message) => ({ ...message, threadId, resourceId })),
  })
}

export async function handleWorkflowResume(req: Request, params: WorkflowResumeParams) {
  const session = getVisitorSession(req)
  const threadId = readString(params.threadId)
  const runId = readString(params.runId)

  if (!threadId || !runId || !params.resumeData) {
    return appendVisitorCookie(NextResponse.json({ error: 'A suspended audit decision is required.' }, { status: 400 }), session)
  }

  const memory = await getConversationMemory()
  const thread = await getOwnedConversationThread(memory, threadId, session.resourceId)
  if (!thread) {
    return appendVisitorCookie(NextResponse.json({ error: 'Conversation not found.' }, { status: 404 }), session)
  }

  const messages = await loadStoredMessages(memory, threadId, session.resourceId)
  if (!hasSuspendedRun(messages, runId) || !(await isStoredRunSuspended(runId))) {
    return appendVisitorCookie(NextResponse.json({ error: 'Suspended audit not found.' }, { status: 404 }), session)
  }

  const stream = await handleWorkflowStream({
    version: 'v6',
    mastra,
    workflowId: LISTING_AUDIT_WORKFLOW_KEY,
    includeTextStreamParts: true,
    sendReasoning: true,
    params: {
      runId,
      resumeData: params.resumeData,
      resourceId: session.resourceId,
    },
  })
  const [clientStream, persistenceStream] = stream.tee()
  void persistFinalWorkflowPart(persistenceStream, memory, threadId, session.resourceId).catch((error: unknown) => {
    console.error('Unable to persist completed audit workflow event.', error)
  })

  return appendVisitorCookie(createUIMessageStreamResponse({ stream: clientStream }), session)
}
