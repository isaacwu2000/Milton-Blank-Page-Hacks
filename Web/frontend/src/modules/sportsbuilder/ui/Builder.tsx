import { POLLING, DEFAULT_SAMPLING_INTERVAL } from "../config";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Plus,
  LoaderCircle,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { type Message, type Session } from "../../../../../shared";
import {
  Input,
  IconButton,
  PromptBar,
  ConfirmDialog,
} from "../../../components";
import { api, post } from "../services/api";
import { type Brief, type AgentJob } from "../types";
import { useAgentJob } from "../hooks/useAgentJob";
import { ErrorNote } from "./common";
import { BUILDER_WELCOME, BUILDER_EXAMPLE } from "../config";

export function Builder({
  onClose,
  onBuilt,
}: {
  onClose: () => void;
  onBuilt: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([
      {
        role: "assistant",
        content: BUILDER_WELCOME,
      },
    ]),
    [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [brief, setBrief] = useState<Brief | null>(null),
    [ready, setReady] = useState(false),
    [confirmEarlyBuild, setConfirmEarlyBuild] = useState(false),
    [referenceId, setReferenceId] = useState<string | undefined>(),
    [referenceName, setReferenceName] = useState(""),
    [uploadingReference, setUploadingReference] = useState(false),
    [job, setJob] = useState<string | null>(null),
    [stage, setStage] = useState("Preparing your tool");
  const ref = useRef<HTMLInputElement>(null);
  useAgentJob(
    job,
    () => {
      setJob(null);
      onBuilt();
    },
    (e) => {
      setJob(null);
      setBusy(false);
      setError(e);
    },
  );
  useEffect(() => {
    if (!job) return;
    const t = setInterval(() => {
      api<AgentJob>(`/agent/jobs/${job}`)
        .then((j) => setStage(j.stage))
        .catch(() => {});
    }, POLLING.agentStageMs);
    return () => clearInterval(t);
  }, [job]);
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
      }>("/agent/interview", { messages: next });
      setMessages([...next, { role: "assistant", content: result.reply }]);
      if (result.brief) setBrief(result.brief);
      setReady(result.ready);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function build() {
    const buildMessages = text.trim()
      ? [...messages, { role: "user" as const, content: text.trim() }]
      : messages;
    setConfirmEarlyBuild(false);
    setBusy(true);
    setError("");
    try {
      const result = await post<{ id: string }>("/agent/build", {
        brief: ready && !text.trim() ? (brief ?? undefined) : undefined,
        messages: buildMessages,
        referenceId,
      });
      setJob(result.id);
    } catch (e) {
      setBusy(false);
      setError((e as Error).message);
    }
  }
  async function uploadRef(file: File) {
    setBusy(true);
    setUploadingReference(true);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("reference", "true");
      form.set("interval", String(DEFAULT_SAMPLING_INTERVAL));
      const s = await api<Session>("/api/upload", {
        method: "POST",
        body: form,
      });
      setReferenceId(s.id);
      setReferenceName(file.name);
      await post(`/api/sessions/${s.id}/analyze`, {});
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setUploadingReference(false);
    }
  }
  return (
    <section className="builder">
      <div className="section-heading">
        <span className="step-label">
          <span className={ready ? "done" : ""}>1</span> Interview{" "}
          <ChevronRight size={13} />
          <span className={ready ? "" : "pending"}>2</span> Review & build
        </span>
        <IconButton
          label="Close tool builder"
          disabled={!!job}
          onClick={onClose}
        >
          <X size={17} />
        </IconButton>
      </div>
      <div className="builder-columns">
        <div className="interview">
          <div className="conversation" aria-live="polite">
            {messages.map((m, i) => (
              <div className={`message ${m.role}`} key={i}>
                <div>{m.content}</div>
              </div>
            ))}
            {busy && !job && (
              <p className="muted small">
                <LoaderCircle className="spin inline" size={14} /> Thinking…
              </p>
            )}
          </div>
          {messages.length === 1 && (
            <button
              className="example-prompt"
              onClick={() => send(BUILDER_EXAMPLE)}
            >
              <Target size={16} />
              Try a squat coaching tool
              <ArrowRight size={15} />
            </button>
          )}
          <PromptBar
            value={text}
            onChange={setText}
            onSend={() => {
              void send();
            }}
            placeholder="Tell me about your idea…"
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
                  disabled={busy}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadRef(file);
                    event.target.value = "";
                  }}
                />
                <IconButton
                  label="Add a good-form video"
                  surface="transparent"
                  disabled={busy}
                  onClick={() => ref.current?.click()}
                >
                  <Plus size={18} aria-hidden="true" />
                </IconButton>
              </>
            }
            attachment={
              uploadingReference ? (
                <p className="prompt-bar-attachment" role="status">
                  Uploading reference video…
                </p>
              ) : referenceName ? (
                <p className="prompt-bar-attachment">{referenceName}</p>
              ) : undefined
            }
          />
        </div>
        <aside className="brief-panel">
          <h2>Your tool, taking shape</h2>
          {brief ? (
            <>
              <label>
                Name
                <Input
                  value={brief.name}
                  onChange={(e) => setBrief({ ...brief, name: e.target.value })}
                />
              </label>
              <dl>
                <div>
                  <dt>Sport</dt>
                  <dd>{brief.sport}</dd>
                </div>
                <div>
                  <dt>For</dt>
                  <dd>{brief.audience}</dd>
                </div>
              </dl>
              <label>
                What good form means
                <textarea
                  rows={5}
                  value={brief.rubric}
                  onChange={(e) =>
                    setBrief({ ...brief, rubric: e.target.value })
                  }
                />
              </label>
              <h3>What to measure</h3>
              <ul className="metric-list">
                {brief.metrics.map((m, i) => (
                  <li key={i}>
                    <Check size={14} />
                    {m}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="muted">
              As we talk, your sport, goals, metrics, and form rubric will
              appear here.
            </p>
          )}
          <button
            className="button"
            disabled={busy}
            onClick={() =>
              ready && !text.trim() ? build() : setConfirmEarlyBuild(true)
            }
          >
            {job ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <Sparkles size={16} />
            )}{" "}
            {job ? "Building your tool…" : "Build my tool"}
          </button>
          {job && (
            <p className="small muted" role="status">
              {stage}
            </p>
          )}
        </aside>
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
      {error && <ErrorNote message={error} />}
    </section>
  );
}
