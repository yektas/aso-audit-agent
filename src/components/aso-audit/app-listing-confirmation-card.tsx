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

export function AppListingConfirmationCard({
  payload,
  disabled,
  onConfirm,
  onReject,
}: {
  payload: ListingConfirmationPayload
  disabled: boolean
  onConfirm: () => void
  onReject: () => void
}) {
  const metadata = [payload.developer, payload.category, payload.country !== 'unknown' ? payload.country.toUpperCase() : null].filter(
    Boolean,
  )

  return (
    <section className="mt-3 w-full overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.035] backdrop-blur-2xl">
      <div className="flex items-start gap-4 p-4 sm:p-5">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5 text-lg font-semibold text-white/55">
          {payload.icon ? (
            <Image src={payload.icon} alt="" width={64} height={64} unoptimized className="size-full object-cover" />
          ) : (
            payload.name.slice(0, 1)
          )}
        </div>
        <div className="min-w-0 pt-0.5">
          <p className="text-base font-medium tracking-tight text-white">{payload.name}</p>
          {metadata.length > 0 && <p className="mt-1 text-sm text-white/55">{metadata.join(' / ')}</p>}
          <p className="mt-3 font-mono text-[11px] tracking-[0.14em] text-white/38 uppercase">ID {payload.appStoreId}</p>
        </div>
      </div>
      <div className="flex flex-col gap-2 border-t border-white/10 bg-black/15 p-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={onReject}
          className="h-10 rounded-xl border-white/15 bg-transparent px-4 text-white hover:bg-white/8 hover:text-white"
        >
          <XIcon className="size-4" />
          Not this app
        </Button>
        <Button
          type="button"
          disabled={disabled}
          onClick={onConfirm}
          className="h-10 rounded-xl bg-[#ccff00] px-4 font-semibold text-black hover:bg-[#d7ff39]"
        >
          <CheckIcon className="size-4" />
          Confirm and audit
        </Button>
      </div>
    </section>
  )
}
