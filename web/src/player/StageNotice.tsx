"use client";

import { AlertTriangle, Loader2, OctagonX } from "lucide-react";
import type { ReactNode } from "react";
import { StageFrame } from "@/lessons/ai-request/stages/shared";

/** Shown in place of a stage's visual when the data it needs has not arrived, or never will. */
export function StageNotice({
  kind,
  waitingFor,
  message,
}: {
  kind: "waiting" | "error" | "cancelled";
  waitingFor?: string;
  message?: string;
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
    body = "Choose another question to start a new walkthrough.";
  } else {
    icon = <AlertTriangle className="size-6 text-danger" />;
    title = "The walkthrough did not finish";
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
      </div>
    </StageFrame>
  );
}
