'use client'

import { MenuIcon, MessageSquareIcon, PlusIcon, XIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import type { ConversationThread } from './types'

function formatThreadDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

export function ConversationSidebar({
  threads,
  selectedThreadId,
  loading,
  open,
  onOpenChange,
  onCreate,
  onSelect,
}: {
  threads: ConversationThread[]
  selectedThreadId: string | null
  loading: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: () => void
  onSelect: (threadId: string) => void
}) {
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        onClick={() => onOpenChange(true)}
        aria-label="Open conversation history"
        className="absolute top-5 left-5 z-20 border-white/10 bg-black/20 text-white md:hidden"
      >
        <MenuIcon />
      </Button>
      {open && <div className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={() => onOpenChange(false)} />}
      <aside
        className={cn(
          'fixed inset-y-4 left-4 z-40 flex w-[min(300px,calc(100vw-2rem))] flex-col rounded-[2rem] border border-white/10 bg-[#0c0c0c]/95 backdrop-blur-2xl transition-transform duration-200 ease-out md:static md:inset-auto md:z-auto md:w-72 md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-[calc(100%+2rem)]',
        )}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] text-[#ccff00] uppercase">ASO / AI</p>
            <p className="mt-1 text-sm font-medium text-white/84">Audit conversations</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
            aria-label="Close conversation history"
            className="text-white/65 hover:bg-white/8 hover:text-white md:hidden"
          >
            <XIcon />
          </Button>
        </div>
        <div className="p-3">
          <Button
            type="button"
            onClick={onCreate}
            disabled={loading}
            className="h-11 w-full justify-start rounded-xl bg-[#ccff00] px-4 font-semibold text-black hover:bg-[#d7ff39]"
          >
            <PlusIcon />
            New conversation
          </Button>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4" aria-label="Conversation history">
          {threads.map((thread) => (
            <button
              type="button"
              key={thread.id}
              onClick={() => {
                onSelect(thread.id)
                onOpenChange(false)
              }}
              className={cn(
                'mb-1 flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition-colors',
                thread.id === selectedThreadId
                  ? 'border-[#ccff00]/22 bg-[#ccff00]/8 text-white'
                  : 'border-transparent text-white/60 hover:border-white/8 hover:bg-white/[0.035] hover:text-white/84',
              )}
            >
              <MessageSquareIcon className="mt-0.5 size-4 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{thread.title || 'New audit conversation'}</span>
                <span className="mt-1 block font-mono text-[10px] tracking-[0.14em] text-white/36 uppercase">
                  {formatThreadDate(thread.updatedAt)}
                </span>
              </span>
            </button>
          ))}
        </nav>
      </aside>
    </>
  )
}
