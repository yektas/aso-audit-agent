'use client'

import { ArrowRightIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'

const starters = [
  'Audit an App Store listing',
  'What can you evaluate in an ASO audit?',
  'I have an App Store ID to audit',
]

export function WelcomePanel({ disabled, onStarter }: { disabled: boolean; onStarter: (prompt: string) => void }) {
  return (
    <section className="welcome-panel relative mx-auto my-auto w-full max-w-3xl overflow-hidden rounded-[2.5rem] border border-border bg-secondary/45 p-7 backdrop-blur-2xl sm:p-10">
      <div className="relative z-10 max-w-xl">
        <p className="font-mono text-[11px] tracking-[0.24em] text-primary uppercase">App Store intelligence</p>
        <h1 className="mt-5 font-heading text-4xl leading-[1.06] font-semibold tracking-[-0.065em] text-foreground sm:text-6xl">
          Talk through your next <span className="text-primary">ASO audit.</span>
        </h1>
        <p className="mt-5 max-w-lg text-sm leading-6 text-foreground/58 sm:text-base">
          Provide an App Store URL or numeric app ID. I will find the listing, ask you to confirm it, and keep the
          audit discussion in this thread.
        </p>
      </div>
      <div className="relative z-10 mt-9 flex flex-col gap-2 sm:max-w-xl">
        {starters.map((starter) => (
          <Button
            key={starter}
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => onStarter(starter)}
            className="h-auto justify-between rounded-2xl border-border bg-background/50 px-4 py-3.5 text-left text-foreground/74 hover:border-primary/40 hover:bg-primary/10 hover:text-foreground"
          >
            <span>{starter}</span>
            <ArrowRightIcon className="size-4 text-primary/80" />
          </Button>
        ))}
      </div>
    </section>
  )
}
