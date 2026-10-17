import { POLLING } from "../config";
import { useRef, useEffect } from "react";
import type { AgentJob } from "../types";
import { api } from "../services/api";
/**
 * Polls one agent job and reports progress until completion, failure or unmount.
 * - Independent deadlines release the caller even if a status request never settles.
 * - Old requests cannot complete a newer job; pending reads abort on cleanup.
 */
export function useAgentJob(
  id: string | null,
  onComplete: (job: AgentJob) => void,
  onError: (error: string) => void,
  onProgress?: (job: AgentJob) => void,
) {
  const done = useRef(onComplete),
    error = useRef(onError),
    progress = useRef(onProgress);
  done.current = onComplete;
  error.current = onError;
  progress.current = onProgress;
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let readDeadline: ReturnType<typeof setTimeout>;
    function stop() {
      stopped = true;
      clearTimeout(timer);
      clearTimeout(readDeadline);
      clearTimeout(deadline);
      controller.abort();
    }
    const deadline = setTimeout(() => {
      stop();
      error.current("This review is taking too long. Please retry your message.");
    }, POLLING.agentMaxWaitMs);
    const poll = async () => {
      readDeadline = setTimeout(() => {
        stop();
        error.current("Could not check this review. Please retry your message.");
      }, POLLING.agentStatusTimeoutMs);
      try {
        const job = await api<AgentJob>(`/agent/jobs/${id}`, { signal: controller.signal });
        clearTimeout(readDeadline);
        if (stopped) return;
        if (job.status === "complete") {
          stop();
          done.current(job);
          return;
        }
        if (job.status === "failed") {
          stop();
          error.current(job.error ?? "The agent could not finish. Please retry.");
          return;
        }
        progress.current?.(job);
        timer = setTimeout(poll, POLLING.agentJobMs);
      } catch (e) {
        if (!stopped) {
          stop();
          error.current((e as Error).message);
        }
      }
    };
    void poll();
    return stop;
  }, [id]);
}
