"use client";

import { forwardRef, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const TINTS = 6;

/** Visible form of a token: leading spaces become a subtle dot. */
export function showToken(text: string) {
  return text.replace(/ /g, "·").replace(/\n/g, "↵");
}

export function tintStyle(index: number) {
  const n = (index % TINTS) + 1;
  return {
    background: `var(--tok-${n})`,
    borderColor: `var(--tok-${n}-line)`,
  };
}

export const TokenChip = forwardRef<
  HTMLButtonElement,
  ComponentProps<"button"> & { text: string; index: number; size?: "sm" | "md" | "lg" }
>(function TokenChip({ text, index, size = "md", className, style, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "inline-flex items-center justify-center rounded-md border font-mono whitespace-pre text-ink",
        size === "sm" && "h-6 px-1.5 text-[12px]",
        size === "md" && "h-8 px-2 text-[14px]",
        size === "lg" && "h-11 px-2.5 text-[18px] sm:h-12 sm:text-[22px]",
        className,
      )}
      style={{ ...tintStyle(index), ...style }}
      {...props}
    >
      {showToken(text)}
    </button>
  );
});
