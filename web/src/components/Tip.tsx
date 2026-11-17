"use client";

import type { ReactElement, ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * A short tooltip on hover and keyboard focus. The child must be a focusable
 * element (a button, or an element with tabIndex) that accepts a ref.
 */
export function Tip({
  content,
  children,
  side = "top",
}: {
  content: ReactNode;
  children: ReactElement;
  side?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <Tooltip>
      <TooltipTrigger delay={250} render={children} />
      <TooltipContent side={side} className="max-w-64 text-[13px] leading-snug">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
