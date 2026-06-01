'use client'

import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input'
import type { ChatStatus } from 'ai'

export function AuditComposer({
  disabled,
  status,
  onSubmit,
  onStop,
}: {
  disabled: boolean
  status: ChatStatus
  onSubmit: (text: string) => void
  onStop: () => void
}) {
  return (
    <div className="audit-composer mx-auto w-full max-w-3xl px-4 pb-4 sm:px-7 sm:pb-6">
      <PromptInput
        onSubmit={({ text }) => onSubmit(text)}
        className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-1 backdrop-blur-2xl"
      >
        <PromptInputBody>
          <PromptInputTextarea
            disabled={disabled}
            placeholder="Paste an App Store URL or ask about an ASO audit..."
            className="min-h-14 px-4 pt-4 text-white placeholder:text-white/35"
          />
        </PromptInputBody>
        <PromptInputFooter className="px-3 pb-3">
          <PromptInputTools>
            <p className="font-mono text-[10px] tracking-[0.14em] text-white/32 uppercase">URL or app ID</p>
          </PromptInputTools>
          <PromptInputSubmit
            status={status}
            onStop={onStop}
            disabled={disabled && status === 'ready'}
            className="size-10 rounded-xl bg-[#ccff00] text-black hover:bg-[#d7ff39]"
          />
        </PromptInputFooter>
      </PromptInput>
    </div>
  )
}
