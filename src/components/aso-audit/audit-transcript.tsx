'use client'

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message'

import { AuditWorkflowEvent, isAuditWorkflowPart } from './audit-workflow-event'
import type { AuditMessage } from './types'

export function AuditTranscript({
  messages,
  status,
  pendingRunId,
  onConfirm,
  onReject,
}: {
  messages: AuditMessage[]
  status: string
  pendingRunId: string | null
  onConfirm: (runId: string) => void
  onReject: (runId: string) => void
}) {
  return (
    <Conversation className="min-h-0 flex-1">
      <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-5 pt-8 pb-10 sm:px-7">
        {messages.map((message) => (
          <Message key={message.id} from={message.role}>
            <MessageContent
              className={
                message.role === 'user'
                  ? 'rounded-2xl bg-[#ccff00] px-4 py-3 text-black'
                  : 'w-full gap-1 text-white/86'
              }
            >
              {message.parts.map((part, index) => {
                if (
                  part.type === 'text' &&
                  part.text.trim().length > 0 &&
                  !message.parts.some((messagePart) => isAuditWorkflowPart(messagePart))
                ) {
                  return message.role === 'assistant' ? (
                    <MessageResponse key={`${message.id}-text-${index}`} className="leading-7 text-white/78">
                      {part.text}
                    </MessageResponse>
                  ) : (
                    <p key={`${message.id}-text-${index}`} className="whitespace-pre-wrap text-sm leading-6">
                      {part.text}
                    </p>
                  )
                }

                if (isAuditWorkflowPart(part)) {
                  return (
                    <AuditWorkflowEvent
                      key={`${message.id}-workflow-${index}`}
                      part={part}
                      pendingRunId={pendingRunId}
                      disabled={status !== 'ready'}
                      onConfirm={onConfirm}
                      onReject={onReject}
                    />
                  )
                }

                return null
              })}
            </MessageContent>
          </Message>
        ))}
        {(status === 'submitted' || status === 'streaming') && (
          <Message from="assistant">
            <MessageContent className="font-mono text-xs tracking-[0.16em] text-[#ccff00]/70 uppercase">
              Working
              <span className="audit-working-dots" aria-hidden="true">
                ...
              </span>
            </MessageContent>
          </Message>
        )}
      </ConversationContent>
      <ConversationScrollButton className="border-white/12 bg-[#111]/90 text-white hover:bg-[#1b1b1b]" />
    </Conversation>
  )
}
