'use client'

import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input'
import { Spinner } from '@/components/ui/spinner'
import type { ChatStatus } from 'ai'

export function PromptComposer({
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
  const isWorking = status === 'submitted' || status === 'streaming'

  return (
    <div className="prompt-composer mx-auto w-full max-w-3xl px-4 pb-4 sm:px-7 sm:pb-6">
      <PromptInput
        onSubmit={({ text }) => onSubmit(text)}
        className="rounded-[2rem] border border-border bg-secondary/45 p-1 backdrop-blur-2xl"
      >
        <PromptInputBody>
          <PromptInputTextarea
            disabled={disabled}
            placeholder="Paste an App Store URL or ask about an ASO audit..."
            className="min-h-14 px-4 pt-4 text-foreground placeholder:text-foreground/35"
          />
        </PromptInputBody>
        <PromptInputFooter className="px-3 pb-3">
          <PromptInputTools>
            {isWorking ? (
              <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-primary/78 uppercase">
                <Spinner className="size-3" />
                Agent working
              </div>
            ) : (
              <p className="font-mono text-[10px] tracking-[0.14em] text-foreground/32 uppercase">URL or app ID</p>
            )}
          </PromptInputTools>
          <PromptInputSubmit
            status={status}
            onStop={onStop}
            disabled={disabled && status === 'ready'}
            className="size-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/80"
          />
        </PromptInputFooter>
      </PromptInput>
    </div>
  )
}
