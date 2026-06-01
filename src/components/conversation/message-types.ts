import type { UIMessage } from 'ai'

export type ConversationThread = {
  id: string
  title?: string
  createdAt: string
  updatedAt: string
  metadata?: Record<string, unknown>
}

export type ConversationMessageMetadata = {
  hiddenWorkflowContext?: boolean
  workflowResume?: {
    runId: string
    confirmed: boolean
  }
  transient?: boolean
}

export type ConversationMessage = UIMessage<ConversationMessageMetadata>
