'use client'

import { ArrowRightIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { OpenaiDark } from '@/components/ui/svgs/openaiDark'
import { Spotify } from '@/components/ui/svgs/spotify'
import { Youtube } from '@/components/ui/svgs/youtube'

const FEATURED_APPS = [
  {
    name: 'Spotify',
    category: 'Music & Audio',
    url: 'https://apps.apple.com/us/app/spotify-music-and-podcasts/id324684580',
    icon: Spotify,
  },
  {
    name: 'ChatGPT',
    category: 'Productivity',
    url: 'https://apps.apple.com/us/app/chatgpt/id6448311069',
    icon: OpenaiDark,
  },
  {
    name: 'YouTube',
    category: 'Entertainment',
    url: 'https://apps.apple.com/us/app/youtube-watch-listen-stream/id544007664',
    icon: Youtube,
  },
]

export function WelcomePanel({ disabled, onStarter }: { disabled: boolean; onStarter: (prompt: string) => void }) {
  return (
    <section className="welcome-panel relative mx-auto my-auto w-full max-w-3xl overflow-hidden rounded-[2.5rem] border border-border bg-secondary/45 p-7 backdrop-blur-2xl sm:p-10">
      <div className="relative z-10 max-w-xl">
        <h1 className="font-heading text-4xl leading-[1.06] font-semibold tracking-[-0.065em] text-foreground sm:text-6xl">
          Audit any <span className="text-primary">App Store listing.</span>
        </h1>
        <p className="mt-5 max-w-lg text-sm leading-6 text-foreground/58 sm:text-base">
          Paste an App Store URL or app ID below — or pick a popular app to audit it right now.
        </p>
      </div>
      <div className="relative z-10 mt-9 flex flex-col gap-2 sm:max-w-xl">
        {FEATURED_APPS.map((app) => (
          <Button
            key={app.url}
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => onStarter(app.url)}
            className="h-auto justify-between rounded-2xl border-border bg-background/50 px-4 py-3.5 text-left hover:border-primary/40 hover:bg-primary/10"
          >
            <span className="flex items-center gap-3">
              <app.icon className="size-6 shrink-0" aria-hidden="true" />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">Audit {app.name}</span>
                <span className="text-xs text-foreground/45">{app.category}</span>
              </span>
            </span>
            <ArrowRightIcon className="size-4 text-primary/80" />
          </Button>
        ))}
      </div>
    </section>
  )
}
