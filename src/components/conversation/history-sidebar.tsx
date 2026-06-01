"use client";

import {
  MenuIcon,
  MessageSquareIcon,
  MoreHorizontalIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import type { ConversationThread } from "./message-types";

function formatThreadDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function HistorySidebar({
  threads,
  selectedThreadId,
  loading,
  open,
  onOpenChange,
  onCreate,
  onSelect,
  onDelete,
}: {
  threads: ConversationThread[];
  selectedThreadId: string | null;
  loading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: () => void;
  onSelect: (threadId: string) => void;
  onDelete: (threadId: string) => void;
}) {
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        onClick={() => onOpenChange(true)}
        aria-label="Open conversation history"
        className="absolute top-5 left-5 z-20 border-border bg-background/60 text-foreground md:hidden"
      >
        <MenuIcon />
      </Button>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-foreground/35 md:hidden"
          onClick={() => onOpenChange(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-4 left-4 z-40 flex w-[min(300px,calc(100vw-2rem))] flex-col rounded-[2rem] border border-border bg-card/95 backdrop-blur-2xl transition-transform duration-200 ease-out md:static md:inset-auto md:z-auto md:w-72 md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-[calc(100%+2rem)]",
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-5">
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase">
              ASO / AI
            </p>
            <p className="mt-1 text-sm font-medium text-foreground/84">Audit conversations</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
            aria-label="Close conversation history"
            className="text-foreground/65 hover:bg-muted hover:text-foreground md:hidden"
          >
            <XIcon />
          </Button>
        </div>
        <div className="p-3">
          <Button
            type="button"
            onClick={onCreate}
            disabled={loading}
            className="h-11 w-full justify-start rounded-xl bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/80"
          >
            <PlusIcon />
            New conversation
          </Button>
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <nav className="px-3 pb-4" aria-label="Conversation history">
            {threads.map((thread) => (
              <div
                key={thread.id}
                className={cn(
                  "mb-1 flex items-start gap-2 rounded-2xl border px-3 py-3 transition-colors",
                  thread.id === selectedThreadId
                    ? "border-primary/30 bg-primary/12 text-foreground"
                    : "border-transparent text-foreground/60 hover:border-border hover:bg-muted hover:text-foreground/84",
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelect(thread.id);
                    onOpenChange(false);
                  }}
                  className="flex min-w-0 flex-1 items-start gap-3 text-left"
                >
                  <MessageSquareIcon className="mt-0.5 size-4 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span
                      className="block truncate text-sm"
                      title={thread.title || "New audit conversation"}
                    >
                      {thread.title || "New audit conversation"}
                    </span>
                    <span className="mt-1 block font-mono text-[10px] tracking-[0.14em] text-foreground/36 uppercase">
                      {formatThreadDate(thread.updatedAt)}
                    </span>
                  </span>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label={`Open actions for ${thread.title || "conversation"}`}
                    className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md text-foreground/45 transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <MoreHorizontalIcon className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-40 border-border bg-popover text-popover-foreground"
                  >
                    <DropdownMenuItem
                      onClick={() => onDelete(thread.id)}
                      className="cursor-pointer text-red-200 focus:bg-red-500/10 focus:text-red-100"
                    >
                      <Trash2Icon className="mr-2 size-4" />
                      Delete conversation
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </nav>
        </ScrollArea>
      </aside>
    </>
  );
}
