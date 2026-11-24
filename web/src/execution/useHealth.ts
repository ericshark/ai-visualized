"use client";

import { useCallback, useEffect, useState } from "react";

export type Health =
  | { status: "checking" }
  | { status: "offline" }
  | { status: "no-key" }
  | { status: "ready"; model: string; provider: string; maxInputChars: number };

/**
 * Asks the backend whether live mode is possible. Demo mode never depends on
 * the answer, so every failure just means "live is unavailable".
 */
export function useHealth() {
  const [health, setHealth] = useState<Health>({ status: "checking" });

  const check = useCallback(
    async (signal?: AbortSignal) => {
      const timeout = AbortSignal.timeout(2500);
      try {
        const response = await fetch("/api/health", {
          signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
        });
        if (!response.ok) throw new Error("bad status");
        const body = await response.json();
        setHealth(
          body.liveAvailable
            ? {
                status: "ready",
                model: String(body.model),
                provider: String(body.provider ?? "the provider"),
                maxInputChars: Number(body.maxInputChars) || 500,
              }
            : { status: "no-key" },
        );
      } catch {
        if (!signal?.aborted) setHealth({ status: "offline" });
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    // Checked after mount: the answer comes from the network, not from render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void check(controller.signal);
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      controller.abort();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [check]);

  return health;
}
