import { DEFAULT_SAMPLING_INTERVAL } from "../config";
import { useEffect, useRef, useState } from "react";
import { Check, Plus, LoaderCircle, X } from "lucide-react";
import {
  sampleTool,
  validateTool,
  type Message,
  type Session,
  type ToolConfig,
  type SavedTool,
} from "../../../../../shared";
import { IconButton, PromptBar, ConfirmDialog } from "../../../components";
import { api, post } from "../services/api";
import { type Brief, type AgentJob } from "../types";
import { useAgentJob } from "../hooks/useAgentJob";
import { useConversationScroll } from "../hooks/useConversationScroll";
import { ErrorNote } from "./common";
import { BUILDER_WELCOME } from "../config";
import { BuilderPreview } from "./BuilderPreview";

const starter: ToolConfig = {
  ...sampleTool,
  name: "Your movement workspace",
  sport: "Example",
  audience: "Explore before building",
  description:
    "Play the sample, select a body point, and explore an angle over time.",
  rubric:
    "This starter demonstrates the workspace. Describe your sport to create your own rubric and metrics.",
  coachPrompt: "This is an example workspace, not an assessment of an athlete.",
  metrics: [sampleTool.metrics[0]],
};

/**
 * Swaps complete validated previews, then reviews each configuration before saving.
 * - New edits keep the current preview visible and queue behind an active review.
 * - Only the server's accepted job can be saved; failed edits retain the last checked coach.
 */
export function Builder({
  onClose,
  onBuilt,
  initialTool,
  onUse,
}: {
  onClose: () => void;
  onBuilt: () => void;
  initialTool?: ToolConfig;
  onUse?: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: initialTool
        ? "What would you like to change? Your saved coach stays available while we review a new version."
        : BUILDER_WELCOME,
    },
  ]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [brief, setBrief] = useState<Brief | null>(null);
  const [ready, setReady] = useState(false);
  const [confirmEarlyBuild, setConfirmEarlyBuild] = useState(false);
  const [referenceId, setReferenceId] = useState<string | undefined>(
    initialTool?.referenceId,
  );
  const [referenceName, setReferenceName] = useState("");
  const [uploadingReference, setUploadingReference] = useState(false);
  const [job, setJob] = useState<string | null>(null);
  const [reviewedId, setReviewedId] = useState<string | null>(null);
  const [stage, setStage] = useState("");
  const [preview, setPreview] = useState<ToolConfig>(initialTool ?? starter);
  const [revision, setRevision] = useState(initialTool ? 1 : 0);
  const [saved, setSaved] = useState(Boolean(initialTool));
  const [queued, setQueued] = useState<ToolConfig | null>(null);
  const [startingReview, setStartingReview] = useState(false);
  const [failedDraft, setFailedDraft] = useState<ToolConfig | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  const lastChecked = useRef<
    | {
        tool: ToolConfig;
        jobId: string | null;
        revision: number;
        saved: boolean;
      }
    | undefined
  >(
    initialTool
      ? { tool: initialTool, jobId: null, revision: 1, saved: true }
      : undefined,
  );
  const nextRevision = useRef(initialTool ? 1 : 0);
  const reviewing = useRef<ToolConfig | null>(null);
  const reviewingRevision = useRef(revision);
  const pending = useRef(queued);
  pending.current = queued;
  const { conversationRef, latestRef } = useConversationScroll(messages, busy);

  function showPreview(tool: ToolConfig) {
    setPreview((previous) => {
      if (JSON.stringify(previous) === JSON.stringify(tool)) return previous;
      return tool;
    });
  }
  // Both review-start and in-flight failures restore the same checked snapshot.
  function restoreChecked(message: string, failed: ToolConfig | null) {
    setFailedDraft(failed);
    const checked = lastChecked.current;
    if (checked) {
      showPreview(checked.tool);
      setReviewedId(checked.jobId);
      setRevision(checked.revision);
      setSaved(checked.saved);
    }
    setStage(
      checked
        ? "Previous checked version · Update needs attention"
        : "Draft · Review needs attention",
    );
    setError(message);
  }
  useAgentJob(
    job,
    (result) => {
      const completedId = job;
      setJob(null);
      if (!result.preview) {
        setError("The review returned no coach. Please retry.");
        return;
      }
      const tool = validateTool(result.preview);
      nextRevision.current = Math.max(nextRevision.current, 1);
      setRevision((value) => value || 1);
      lastChecked.current = {
        tool,
        jobId: completedId,
        revision: reviewingRevision.current || 1,
        saved: false,
      };
      if (pending.current) return;
      showPreview(tool);
      setReviewedId(completedId);
      setSaved(false);
      setStage("Checked on desktop and mobile · Ready to save");
      setFailedDraft(null);
    },
    (message) => {
      setJob(null);
      if (pending.current) return;
      restoreChecked(message, reviewing.current);
    },
    (progress) => {
      if (pending.current) return;
      setStage(`Draft · ${progress.stage}`);
      if (progress.preview) {
        const tool = validateTool(progress.preview);
        showPreview(tool);
        reviewing.current = tool;
        nextRevision.current = Math.max(nextRevision.current, 1);
        setRevision((value) => value || nextRevision.current);
      }
    },
  );

  useEffect(() => {
    if (!queued || job || startingReview) return;
    const candidate = queued;
    pending.current = null;
    setQueued(null);
    setStartingReview(true);
    reviewing.current = candidate;
    reviewingRevision.current = revision;
    setStage("Draft · Preparing desktop and mobile review…");
    void post<{ id: string }>("/agent/build", {
      candidate,
      messages,
      referenceId,
      save: false,
    })
      .then((result) => setJob(result.id))
      .catch((problem: Error) => {
        if (!pending.current) restoreChecked(problem.message, candidate);
      })
      .finally(() => setStartingReview(false));
  }, [queued, job, startingReview, messages, referenceId, revision]);

  async function send(content = text) {
    if (!content.trim() || busy) return;
    const next = [
      ...messages,
      { role: "user" as const, content: content.trim() },
    ];
    setMessages(next);
    setText("");
    setBusy(true);
    setError("");
    try {
      const result = await post<{
        reply: string;
        brief?: Brief;
        ready: boolean;
        preview?: ToolConfig;
      }>("/agent/interview", {
        messages: next,
        ...(revision ? { current: preview } : {}),
      });
      // Validate the whole response before replacing either the conversation or preview.
      const tool = result.preview ? validateTool(result.preview) : undefined;
      setMessages([...next, { role: "assistant", content: result.reply }]);
      if (result.brief) setBrief(result.brief);
      setReady(result.ready);
      if (tool) {
        showPreview(tool);
        setRevision(++nextRevision.current);
        setReviewedId(null);
        setSaved(false);
        setFailedDraft(null);
        setQueued(tool);
      }
    } catch (problem) {
      setMessages(messages);
      setText(content);
      setError((problem as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function build() {
    setConfirmEarlyBuild(false);
    setBusy(true);
    setError("");
    setStage("Preparing your coach…");
    const next = text.trim()
      ? [...messages, { role: "user" as const, content: text.trim() }]
      : messages;
    try {
      const result = await post<{ id: string }>("/agent/build", {
        brief: ready && !text.trim() ? (brief ?? undefined) : undefined,
        messages: next,
        referenceId,
        save: false,
      });
      reviewing.current = null;
      setReviewedId(null);
      setSaved(false);
      setJob(result.id);
      if (text.trim()) {
        setMessages(next);
        setText("");
      }
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!reviewedId || busy || job || queued || startingReview) return;
    setBusy(true);
    setError("");
    try {
      await post<SavedTool>(`/agent/jobs/${reviewedId}/save`, {});
      setSaved(true);
      if (lastChecked.current?.jobId === reviewedId)
        lastChecked.current.saved = true;
      setStage("Saved · Ready for your recordings");
      onBuilt();
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function uploadRef(file: File) {
    setBusy(true);
    setUploadingReference(true);
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("reference", "true");
      form.set("interval", String(DEFAULT_SAMPLING_INTERVAL));
      const session = await api<Session>("/api/upload", {
        method: "POST",
        body: form,
      });
      await post(`/api/sessions/${session.id}/analyze`, {});
      setReferenceId(session.id);
      setReferenceName(file.name);
      // A reference change requires review too; it cannot reuse an older acceptance.
      if (revision) {
        const updated = { ...preview, referenceId: session.id };
        showPreview(updated);
        setRevision(++nextRevision.current);
        setReviewedId(null);
        setSaved(false);
        setQueued(updated);
      }
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setBusy(false);
      setUploadingReference(false);
    }
  }
  const checking = !!job || startingReview || !!queued;
  return (
    <section className="builder">
      <div className="section-heading">
        <h1>{initialTool ? "Refine your coach" : "Build your coach"}</h1>
        <IconButton
          label="Close tool builder"
          disabled={checking || busy}
          onClick={onClose}
        >
          <X size={17} />
        </IconButton>
      </div>
      <div className="builder-columns">
        <div className="interview">
          <div
            ref={conversationRef}
            className="conversation"
            aria-live="polite"
          >
            {messages.map((message, index) => (
              <div className={`message ${message.role}`} key={index}>
                <div>{message.content}</div>
              </div>
            ))}
            {busy && !uploadingReference && (
              <p className="muted small" role="status">
                <LoaderCircle
                  className="spin inline"
                  size={14}
                  aria-hidden="true"
                />{" "}
                {saved
                  ? "Saving your coach…"
                  : "Preparing your next question and preview…"}
              </p>
            )}
            <div ref={latestRef} />
          </div>
          <PromptBar
            value={text}
            onChange={setText}
            onSend={() => {
              void send();
            }}
            placeholder={
              revision
                ? "Describe a change to your coach…"
                : "Tell me about your idea…"
            }
            label="Answer the builder"
            sendLabel="Send answer"
            disabled={busy}
            actions={
              <>
                <input
                  hidden
                  ref={ref}
                  type="file"
                  aria-label="Upload optional good form reference"
                  accept=".mov,.mp4,.webm,video/*"
                  disabled={busy || checking}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadRef(file);
                    event.target.value = "";
                  }}
                />
                <IconButton
                  label="Add a good-form video"
                  surface="transparent"
                  disabled={busy || checking}
                  onClick={() => ref.current?.click()}
                >
                  <Plus size={18} aria-hidden="true" />
                </IconButton>
                <button
                  type="button"
                  className="button builder-build"
                  disabled={
                    busy ||
                    (!(text.trim() && revision > 0) &&
                      (checking || saved || (revision > 0 && !reviewedId)))
                  }
                  onClick={() => {
                    if (text.trim() && revision > 0) void send();
                    else if (reviewedId) void save();
                    else if (ready && !text.trim()) void build();
                    else setConfirmEarlyBuild(true);
                  }}
                >
                  {checking && <LoaderCircle className="spin" size={16} />}
                  {text.trim() && revision > 0 ? (
                    "Update preview"
                  ) : saved ? (
                    <>
                      <Check size={14} /> Saved
                    </>
                  ) : revision || reviewedId ? (
                    "Save coach"
                  ) : checking ? (
                    "Building your tool…"
                  ) : (
                    "Build my tool"
                  )}
                </button>
              </>
            }
            attachment={
              uploadingReference ? (
                <p className="prompt-bar-attachment" role="status">
                  <LoaderCircle
                    className="spin inline"
                    size={14}
                    aria-hidden="true"
                  />{" "}
                  Uploading reference video…
                </p>
              ) : referenceName ? (
                <p className="prompt-bar-attachment">{referenceName}</p>
              ) : undefined
            }
          />
          {error && <ErrorNote message={error} />}
          {failedDraft && (
            <button
              className="text-button"
              disabled={busy || checking}
              onClick={() => {
                setError("");
                showPreview(failedDraft);
                setRevision(++nextRevision.current);
                setReviewedId(null);
                setSaved(false);
                setQueued(failedDraft);
              }}
            >
              Retry review
            </button>
          )}
          {saved && onUse && (
            <button className="text-button builder-use" onClick={onUse}>
              Try on a recording
            </button>
          )}
        </div>
        <section className="coach-preview" aria-label="Coach preview">
          <div className="preview-toolbar">
            <span>
              Preview{" "}
              {revision > 0 && (
                <span className="muted">· Version {revision}</span>
              )}
            </span>
            <span className="small muted" role="status">
              {busy
                ? "Updating · Current preview stays visible"
                : stage ||
                  (saved
                    ? "Saved coach"
                    : "Example · Describe your coach to personalize it")}
            </span>
          </div>
          <BuilderPreview tool={preview} />
        </section>
      </div>
      {confirmEarlyBuild && !busy && (
        <ConfirmDialog
          title="Build before finishing the interview?"
          onClose={() => setConfirmEarlyBuild(false)}
        >
          <p className="small muted">
            Your coach may miss details you haven’t shared. We’ll use what
            you’ve told us and make conservative assumptions for the rest.
          </p>
          <div className="early-build-actions">
            <button
              autoFocus
              className="button"
              onClick={() => setConfirmEarlyBuild(false)}
            >
              Keep talking
            </button>
            <button className="button secondary" onClick={build}>
              Build anyway
            </button>
          </div>
        </ConfirmDialog>
      )}
    </section>
  );
}
