'use client'

import { CheckIcon, XIcon } from 'lucide-react'
import Image from 'next/image'

import { Button } from '@/components/ui/button'

export type ListingConfirmationPayload = {
  appStoreId: string
  name: string
  developer: string
  icon: string
  category: string
  country: string
}

export function ListingConfirmationCard({
  payload,
  disabled,
  resolved,
  onConfirm,
  onReject,
}: {
  payload: ListingConfirmationPayload
  disabled: boolean
  resolved?: boolean
  onConfirm: () => void
  onReject: () => void
}) {
  const metadata = [payload.developer, payload.category, payload.country !== 'unknown' ? payload.country.toUpperCase() : null].filter(
    Boolean,
  )

  return (
    <section className="mt-3 w-full overflow-hidden rounded-2xl border border-border bg-secondary/45 backdrop-blur-2xl">
      <div className="flex items-start gap-4 p-4 sm:p-5">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted text-lg font-semibold text-foreground/55">
          {payload.icon ? (
            <Image src={payload.icon} alt="" width={64} height={64} unoptimized className="size-full object-cover" />
          ) : (
            payload.name.slice(0, 1)
          )}
        </div>
        <div className="min-w-0 pt-0.5">
          <p className="text-base font-medium tracking-tight text-foreground">{payload.name}</p>
          {metadata.length > 0 && <p className="mt-1 text-sm text-foreground/55">{metadata.join(' / ')}</p>}
          <p className="mt-3 font-mono text-[11px] tracking-[0.14em] text-foreground/38 uppercase">ID {payload.appStoreId}</p>
        </div>
      </div>
      {resolved ? (
        <div className="border-t border-border bg-muted/50 px-4 py-3 font-mono text-[11px] tracking-[0.14em] text-foreground/42 uppercase">
          Listing confirmation recorded
        </div>
      ) : (
        <div className="flex flex-col gap-2 border-t border-border bg-muted/50 p-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={onReject}
            className="h-10 rounded-xl border-border bg-transparent px-4 text-foreground hover:bg-muted hover:text-foreground"
          >
            <XIcon className="size-4" />
            Not this app
          </Button>
          <Button
            type="button"
            disabled={disabled}
            onClick={onConfirm}
            className="h-10 rounded-xl bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/80"
          >
            <CheckIcon className="size-4" />
            Confirm and audit
          </Button>
        </div>
      )}
    </section>
  )
}
