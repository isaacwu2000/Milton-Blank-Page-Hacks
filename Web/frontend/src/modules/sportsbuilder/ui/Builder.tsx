import { DEFAULT_SAMPLING_INTERVAL } from "../config";
import { useEffect, useRef, useState } from "react";
import { Check, Plus, LoaderCircle } from "lucide-react";
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
import { streamBuilder } from "../services/builderStream";
import { useConversationScroll } from "../hooks/useConversationScroll";
import { ErrorNote } from "./common";
import { BUILDER_WELCOME } from "../config";
import { BuilderColumns } from "./BuilderColumns";
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
 * Streams conversation while preserving an atomic, validated coach preview.
 * - A follow-up cancels the old turn; late callbacks cannot replace the latest coach.
 * - Only server-held validated configurations can be saved; failed edits preserve the preview.
 */
export function Builder({
  onBuilt,
  initialTool,
  onUse,
}: {
  onClose?: () => void;
  onBuilt: () => void;
  initialTool?: ToolConfig;
  onUse?: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: initialTool
        ? "What would you like to change? Your saved coach stays available while we update it."
        : BUILDER_WELCOME,
    },
  ]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [confirmEarlyBuild, setConfirmEarlyBuild] = useState(false);
  const [referenceId, setReferenceId] = useState<string | undefined>(
    initialTool?.referenceId,
  );
  const [referenceName, setReferenceName] = useState("");
  const [uploadingReference, setUploadingReference] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validatedId, setValidatedId] = useState<string | null>(null);
  const [stage, setStage] = useState("");
  const [preview, setPreview] = useState<ToolConfig>(initialTool ?? starter);
  const [revision, setRevision] = useState(initialTool ? 1 : 0);
  const [saved, setSaved] = useState(Boolean(initialTool));
  const [retry, setRetry] = useState<{
    content: string;
    force: boolean;
  } | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  const active = useRef<AbortController | null>(null);
  const history = useRef(messages);
  history.current = messages;
  const { conversationRef, latestRef } = useConversationScroll(messages, busy);
  useEffect(() => () => active.current?.abort(), []);

  /**
   * Streams a turn and aborts its predecessor; only the active turn may publish state.
   * - Failure restores history and retains the last valid preview and any typed follow-up.
   * - Retry keeps a different unsent draft when keepDraft is true.
   */
  async function send(
    content = text,
    force = false,
    attachedReference = referenceId,
    keepDraft = false,
  ) {
    if ((!content.trim() && !force) || saving || uploadingReference) return;
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    const before = history.current;
    const requestText =
      content.trim() ||
      "Build my coach now using conservative assumptions for anything missing.";
    const next = [...before, { role: "user" as const, content: requestText }];
    history.current = next;
    setMessages(next);
    if (!keepDraft) setText("");
    setBusy(true);
    setReady(false);
    setError("");
    setRetry(null);
    setStage("Preparing your coach…");
    let reply = "";
    try {
      await streamBuilder(
        {
          messages: next,
          current: revision ? preview : undefined,
          revision,
          force,
          referenceId: attachedReference,
        },
        (event) => {
          if (active.current !== controller || controller.signal.aborted)
            return;
          if (event.type === "text") {
            reply += event.text;
            history.current = [...next, { role: "assistant", content: reply }];
            setMessages(history.current);
            setStage("Updating your coach…");
          } else if (event.type === "status") setStage(event.message);
          else if (event.type === "complete") {
            const tool = event.preview
              ? validateTool(event.preview)
              : undefined;
            if (tool && !event.id)
              throw Error(
                "The coach update has no save reference. Please retry.",
              );
            history.current = [
              ...next,
              { role: "assistant", content: event.reply },
            ];
            setMessages(history.current);
            setReady(event.ready);
            if (tool) {
              setPreview(tool);
              setRevision(event.revision);
              setValidatedId(event.id!);
              setSaved(false);
              setStage("Validated · Ready to save");
            } else
              setStage(
                saved
                  ? "Saved coach"
                  : validatedId
                    ? "Validated · Ready to save"
                    : "Tell me more about your coach",
              );
          }
        },
        controller.signal,
      );
    } catch (problem) {
      if (active.current !== controller || controller.signal.aborted) return;
      history.current = before;
      setMessages(before);
      setText((draft) => draft || content);
      setRetry({ content: requestText, force });
      setStage(
        revision
          ? "Previous version · Update needs attention"
          : "Your idea is ready to retry",
      );
      setError((problem as Error).message);
    } finally {
      if (active.current === controller) {
        active.current = null;
        setBusy(false);
      }
    }
  }
  function build() {
    setConfirmEarlyBuild(false);
    void send(text, true);
  }
  /** Saves the server-held validated draft once; generation and uploads block saving. */
  async function save() {
    if (!validatedId || busy || saving || uploadingReference) return;
    setSaving(true);
    setError("");
    try {
      await post<SavedTool>(`/agent/jobs/${validatedId}/save`, {});
      setSaved(true);
      setStage("Saved · Ready for your recordings");
      onBuilt();
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setSaving(false);
    }
  }
  /** Uploads optional evidence; a new association invalidates the previous save reference. */
  async function uploadRef(file: File) {
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
      // Reference association is validated by the server on the next configuration update.
      if (revision) {
        setValidatedId(null);
        setSaved(false);
        setStage("Reference added · Send a message to update your coach");
      }
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setUploadingReference(false);
    }
  }
  return (
    <section className="builder">
      <BuilderColumns>
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
            {(busy || saving) && !uploadingReference && (
              <p className="muted small" role="status">
                <LoaderCircle
                  className="spin inline"
                  size={14}
                  aria-hidden="true"
                />{" "}
                {saving ? "Saving your coach…" : stage}
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
            disabled={saving || uploadingReference}
            actions={
              <>
                <input
                  hidden
                  ref={ref}
                  type="file"
                  aria-label="Upload optional good form reference"
                  accept=".mov,.mp4,.webm,video/*"
                  disabled={busy || saving || uploadingReference}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadRef(file);
                    event.target.value = "";
                  }}
                />
                <IconButton
                  label="Add a good-form video"
                  surface="transparent"
                  disabled={busy || saving || uploadingReference}
                  onClick={() => ref.current?.click()}
                >
                  <Plus size={18} aria-hidden="true" />
                </IconButton>
                <button
                  type="button"
                  className="button builder-build"
                  disabled={
                    saving ||
                    uploadingReference ||
                    (!text.trim() && (busy || saved))
                  }
                  onClick={() => {
                    if (text.trim() && revision > 0) void send();
                    else if (validatedId && !text.trim()) void save();
                    else if (ready && !text.trim()) build();
                    else setConfirmEarlyBuild(true);
                  }}
                >
                  {(busy || saving) && (
                    <LoaderCircle className="spin" size={16} />
                  )}
                  {text.trim() && revision > 0 ? (
                    "Update preview"
                  ) : saved ? (
                    <>
                      <Check size={14} /> Saved
                    </>
                  ) : validatedId ? (
                    "Save coach"
                  ) : busy ? (
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
          {retry && (
            <button
              className="text-button"
              disabled={busy || saving || uploadingReference}
              onClick={() =>
                void send(
                  retry.content,
                  retry.force,
                  referenceId,
                  Boolean(text.trim() && text.trim() !== retry.content),
                )
              }
            >
              Retry update
            </button>
          )}
          {saved && onUse && (
            <button className="text-button builder-use" onClick={onUse}>
              Try on a recording
            </button>
          )}
        </div>
        <section className="coach-preview brief-panel" aria-label="Coach preview">
          <div className="preview-toolbar">
            <span>
              Preview{" "}
              {revision > 0 && (
                <span className="muted">· Version {revision}</span>
              )}
            </span>
            <span className="small muted" role="status">
              {busy
                ? stage + " · Current preview stays visible"
                : stage ||
                  (saved
                    ? "Saved coach"
                    : "Example · Describe your coach to personalize it")}
            </span>
          </div>
          <BuilderPreview tool={preview} />
        </section>
      </BuilderColumns>
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
              data-dialog-initial-focus
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
