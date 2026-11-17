import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
export const easeInOut = (t: number) => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

/** Progress of item i of n when a beat's progress p reveals them one after another. */
export function stagger(p: number, i: number, n: number, overlap = 2.5) {
  return clamp01((p * (n + overlap - 1) - i) / overlap);
}

/** A stable pseudo-random number in [0, 1) from a seed. Keeps animations deterministic. */
export function seeded(seed: number) {
  const h = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return h - Math.floor(h);
}

export function StageFrame({
  badges,
  children,
  className,
}: {
  badges?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex min-h-[420px] flex-col rounded-2xl border border-line bg-surface p-4 shadow-raised sm:p-6 lg:min-h-[500px]",
        className,
      )}
    >
      {badges && <div className="mb-4 flex flex-wrap items-center justify-end gap-2">{badges}</div>}
      {children}
    </div>
  );
}

export function Panel({
  title,
  children,
  className,
  tone = "plain",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  tone?: "plain" | "accent" | "dashed";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3.5",
        tone === "plain" && "border-line bg-surface",
        tone === "accent" && "border-accent-line bg-accent-soft/50",
        tone === "dashed" && "border-dashed border-line-2 bg-surface-2/60",
        className,
      )}
    >
      {title && <h3 className="mb-2 text-[13px] font-semibold text-ink-2">{title}</h3>}
      {children}
    </div>
  );
}

/** A mock chat window used by the first and the seventh stage. */
export function ChatWindow({
  children,
  footer,
  className,
}: {
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col overflow-hidden rounded-xl border border-line-2 bg-paper", className)}>
      <div className="border-b border-line bg-surface px-3.5 py-2 text-[13px] font-medium text-ink-2">Chat</div>
      <div className="flex min-h-[170px] flex-1 flex-col justify-end gap-2.5 p-3.5">{children}</div>
      {footer}
    </div>
  );
}

export function UserBubble({ text, style }: { text: string; style?: React.CSSProperties }) {
  return (
    <div
      style={style}
      className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-accent px-3.5 py-2 text-[15px] leading-snug break-words text-white"
    >
      {text}
    </div>
  );
}

export function AssistantBubble({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-line bg-surface px-3.5 py-2 text-[15px] leading-snug text-ink">
      {children}
    </div>
  );
}

export function Check({ done }: { done: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
        done ? "border-ok bg-ok text-white" : "border-line-2 bg-surface",
      )}
    >
      {done && (
        <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.5 6.5l2.5 2.5 4.5-5" />
        </svg>
      )}
    </span>
  );
}
