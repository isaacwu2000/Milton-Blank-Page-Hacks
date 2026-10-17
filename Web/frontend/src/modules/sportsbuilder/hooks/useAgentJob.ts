import { POLLING } from "../config";
import { useRef, useEffect } from "react";
import type { AgentJob } from "../types";
import { api } from "../services/api";
/** Poll one agent job; stop on completion, failure, or unmount. */
export function useAgentJob(
  id: string | null,
  onComplete: (job: AgentJob) => void,
  onError: (error: string) => void,
) {
  const done = useRef(onComplete),
    error = useRef(onError);
  done.current = onComplete;
  error.current = onError;
  useEffect(() => {
    if (!id) return;
    let stopped = false,
      timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const job = await api<AgentJob>(`/agent/jobs/${id}`);
        if (stopped) return;
        if (job.status === "complete") {
          done.current(job);
          return;
        }
        if (job.status === "failed") {
          error.current(
            job.error ?? "The agent could not finish. Please retry.",
          );
          return;
        }
        timer = setTimeout(poll, POLLING.agentJobMs);
      } catch (e) {
        if (!stopped) error.current((e as Error).message);
      }
    };
    poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [id]);
}
