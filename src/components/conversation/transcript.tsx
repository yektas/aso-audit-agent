"use client";

import type { DynamicToolUIPart, ToolUIPart } from "ai";
import { PanelRightOpen } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion, type Transition } from "motion/react";
import { useMemo, useState } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";

import { ErrorPanel, summarizeErrorDetail } from "./error-panel";
import { WorkflowProgressPanel, WorkflowStickyTimeline } from "./workflow-progress";
import { WorkflowEvent } from "./workflow-event";
import {
  hasActiveWorkflow,
  hasCompletedReport,
  isWorkflowPart,
  isWorkflowSnapshotPart,
  type WorkflowPart,
} from "@/lib/workflow-parts";
import type { ConversationMessage } from "./message-types";
import { Shimmer } from "../ai-elements/shimmer";

type ToolLikePart = ToolUIPart | DynamicToolUIPart;

function isToolPart(part: unknown): part is ToolLikePart {
  return (
    typeof part === "object" &&
    part !== null &&
    "type" in part &&
    ((typeof part.type === "string" && part.type.startsWith("tool-")) ||
      part.type === "dynamic-tool") &&
    "state" in part
  );
}

function getToolLabel(part: ToolLikePart) {
  return part.type === "dynamic-tool" ? part.toolName : part.type.slice("tool-".length);
}

function getLatestWorkflowSnapshot(messages: ConversationMessage[]): WorkflowPart | null {
  for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
    const parts = messages[messageIndex].parts;
    for (let partIndex = parts.length - 1; partIndex >= 0; partIndex -= 1) {
      const part = parts[partIndex];
      if (isWorkflowPart(part) && isWorkflowSnapshotPart(part)) {
        return part;
      }
    }
  }

  return null;
}

function getMessagePartKey(messageId: string, part: ConversationMessage["parts"][number]) {
  const record = part as Record<string, unknown>;
  const stableId =
    typeof record.id === "string"
      ? record.id
      : typeof record.toolCallId === "string"
        ? record.toolCallId
        : typeof record.callId === "string"
          ? record.callId
          : null;

  if (stableId) {
    return `${messageId}-${part.type}-${stableId}`;
  }

  if (part.type === "text") {
    return `${messageId}-text-${part.text.slice(0, 80)}`;
  }

  return `${messageId}-${part.type}-${JSON.stringify(part).slice(0, 120)}`;
}

export function Transcript({
  messages,
  status,
  pendingRunId,
  onConfirm,
  onReject,
}: {
  messages: ConversationMessage[];
  status: string;
  pendingRunId: string | null;
  onConfirm: (runId: string) => void;
  onReject: (runId: string) => void;
}) {
  const latestWorkflowSnapshot = getLatestWorkflowSnapshot(messages);
  const [progressOpen, setProgressOpen] = useState(true);
  const shouldReduceMotion = useReducedMotion();
  const isWorking = status === "submitted" || status === "streaming";
  const panelTransition: Transition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.28, ease: [0.645, 0.045, 0.355, 1] as [number, number, number, number] };

   const workingText = useMemo(() => {
      return messages.some((message) => hasActiveWorkflow(message.parts)) ? "... Running audit" : "... Working"
    }, [messages])
  return (
    <Conversation className="min-h-0 flex-1 lg:flex">
      <ConversationContent className="min-w-0 flex-1 gap-6 px-5 pt-8 pb-10 sm:px-7">
        <div className="w-full">
          {latestWorkflowSnapshot ? (
            <div className="sticky top-4 z-10 mx-auto mb-6 max-w-3xl lg:hidden">
              <WorkflowStickyTimeline
                part={latestWorkflowSnapshot}
                open={progressOpen}
                onOpenChange={setProgressOpen}
              />
            </div>
          ) : null}
          <div className="mx-auto min-w-0 max-w-5xl space-y-6">
            {messages.map((message) => (
              <Message key={message.id} from={message.role}>
                <MessageContent
                  className={
                    message.role === "user"
                      ? "rounded-2xl bg-muted! px-4 py-3"
                      : "w-full gap-1 text-foreground/86"
                  }
                >
                  {message.parts.map((part) => {
                    const partKey = getMessagePartKey(message.id, part);

                    if (
                      part.type === "text" &&
                      part.text.trim().length > 0 &&
                      !hasCompletedReport(message.parts)
                    ) {
                      return message.role === "assistant" ? (
                        <MessageResponse
                          key={partKey}
                          className="prose prose-sm dark:prose-invert max-w-3xl leading-7 text-foreground/78"
                        >
                          {part.text}
                        </MessageResponse>
                      ) : (
                        <p
                          key={partKey}
                          className="prose dark:prose-invert text-foreground/84 whitespace-pre-wrap text-sm leading-6"
                        >
                          {part.text}
                        </p>
                      );
                    }

                    if (isWorkflowPart(part)) {
                      return (
                        <WorkflowEvent
                          key={partKey}
                          part={part}
                          pendingRunId={pendingRunId}
                          disabled={status !== "ready"}
                          onConfirm={onConfirm}
                          onReject={onReject}
                        />
                      );
                    }

                    if (
                      isToolPart(part) &&
                      part.state === "output-error" &&
                      part.errorText.trim().length > 0
                    ) {
                      return (
                        <ErrorPanel
                          key={partKey}
                          title={`${getToolLabel(part)} failed`}
                          summary={summarizeErrorDetail(part.errorText, "Tool execution failed.")}
                          detail={part.errorText}
                          className="mt-2 w-full max-w-2xl"
                        />
                      );
                    }

                    return null;
                  })}
                </MessageContent>
              </Message>
            ))}
            {isWorking && (
              <Message from="assistant">
                <MessageContent className="font-mono text-xs flex items-center gap-2 tracking-[0.16em] text-primary/70 uppercase">
                  <Shimmer>{workingText}</Shimmer>
                </MessageContent>
              </Message>
            )}
          </div>
        </div>
      </ConversationContent>
      {latestWorkflowSnapshot ? (
        <>
          <AnimatePresence>
            {progressOpen ? (
              <motion.div
                key="workflow-progress-sidebar"
                initial={{ opacity: 0, width: 0, x: 18 }}
                animate={{ opacity: 1, width: "var(--workflow-progress-sidebar-width)", x: 0 }}
                exit={{ opacity: 0, width: 0, x: 18 }}
                transition={panelTransition}
                className="hidden min-h-0 shrink-0 overflow-hidden border-l border-border [--workflow-progress-sidebar-width:21rem] lg:block xl:[--workflow-progress-sidebar-width:23rem]"
              >
                <WorkflowProgressPanel
                  part={latestWorkflowSnapshot}
                  onClose={() => setProgressOpen(false)}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
          <AnimatePresence initial={false}>
            {!progressOpen ? (
              <motion.div
                key="workflow-progress-toggle"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "3.25rem" }}
                exit={{ opacity: 0, width: 0 }}
                transition={panelTransition}
                className="hidden min-h-0 shrink-0 overflow-hidden border-l border-border bg-card lg:flex"
              >
                <button
                  type="button"
                  onClick={() => setProgressOpen(true)}
                  title="Show audit progress"
                  aria-label="Show audit progress"
                  className="flex h-full w-[3.25rem] shrink-0 items-start justify-center pt-5 text-foreground/55 transition-colors hover:bg-muted hover:text-foreground"
                >
                  <PanelRightOpen className="size-4" aria-hidden="true" />
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </>
      ) : null}
      <ConversationScrollButton className="border-border bg-card/90 text-foreground hover:bg-muted" />
    </Conversation>
  );
}
