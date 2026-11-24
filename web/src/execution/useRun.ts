"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import type { ExecutionAdapter } from "./adapter";
import { initialRun, runReducer } from "./runReducer";

interface StartRequest {
  prompt: string;
  exampleId: string;
}

let runCounter = 0;

/**
 * Owns one run at a time. Starting a new run cancels the previous one, and the
 * reducer ignores any late events from it.
 */
export function useRun(adapter: ExecutionAdapter) {
  const [run, dispatch] = useReducer(runReducer, initialRun);
  const cancelRef = useRef<(() => void) | null>(null);

  const cancel = useCallback(() => {
    cancelRef.current?.();
    cancelRef.current = null;
  }, []);

  const start = useCallback(
    ({ prompt, exampleId }: StartRequest) => {
      cancel();
      runCounter += 1;
      const runId = `run-${runCounter}`;
      dispatch({ type: "start", runId, prompt });
      cancelRef.current = adapter.start({ runId, prompt, exampleId }, (event) =>
        dispatch({ type: "event", event }),
      );
    },
    [cancel, adapter],
  );

  useEffect(() => cancel, [cancel]);

  return { run, start };
}
