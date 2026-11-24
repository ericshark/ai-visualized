"use client";

import { AlertTriangle, Loader2, OctagonX } from "lucide-react";
import type { ReactNode } from "react";
import { StageFrame } from "@/lessons/ai-request/stages/shared";

const action =
  "inline-flex h-10 items-center rounded-lg border px-4 text-sm font-medium transition-colors";

/** Shown in place of a stage's visual when the data it needs has not arrived, or never will. */
export function StageNotice({
  kind,
  waitingFor,
  message,
  onRetry,
  onUseDemo,
}: {
  kind: "waiting" | "error" | "cancelled";
  waitingFor?: string;
  message?: string;
  onRetry?: () => void;
  onUseDemo?: () => void;
}) {
  let icon: ReactNode;
  let title: string;
  let body: string;

  if (kind === "waiting") {
    icon = <Loader2 className="size-6 animate-spin text-accent" />;
    title = `Waiting for ${waitingFor}`;
    body = "This stage continues as soon as it arrives.";
  } else if (kind === "cancelled") {
    icon = <OctagonX className="size-6 text-ink-3" />;
    title = "This request was stopped";
    body = "Send it again to see the rest of the journey.";
  } else {
    icon = <AlertTriangle className="size-6 text-danger" />;
    title = "The live request did not finish";
    body = message ?? "Something went wrong.";
  }

  return (
    <StageFrame className="items-center justify-center text-center">
      <div
        role={kind === "error" ? "alert" : "status"}
        className={
          kind === "waiting" ? "animate-in fade-in fill-mode-both delay-500 duration-300" : "animate-in fade-in duration-300"
        }
      >
        <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-line bg-surface-2">{icon}</div>
        <h3 className="mt-4 text-[17px] font-semibold text-ink">{title}</h3>
        <p className="mx-auto mt-1.5 max-w-sm text-[14.5px] leading-snug text-ink-2">{body}</p>
        {kind !== "waiting" && (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {onRetry && (
              <button type="button" onClick={onRetry} className={`${action} border-accent bg-accent text-white hover:bg-accent-strong`}>
                Try again
              </button>
            )}
            {onUseDemo && (
              <button type="button" onClick={onUseDemo} className={`${action} border-line-2 bg-surface text-ink hover:border-ink-3 hover:bg-surface-2`}>
                Try a sample
              </button>
            )}
          </div>
        )}
      </div>
    </StageFrame>
  );
}
