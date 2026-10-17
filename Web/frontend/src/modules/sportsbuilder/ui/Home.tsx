import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  Activity,
  ArrowRight,
  Check,
  ChevronRight,
  CloudUpload,
  Film,
  Home,
  LoaderCircle,
  Plus,
  Target,
  Users,
  X,
} from "lucide-react";
import {
  pretty,
  sampleTool,
  type Session,
  type ToolConfig,
} from "../../../../../shared";
import { Input, IconButton } from "../../../components";
import { api, post } from "../services/api";
import { type HomeData } from "../types";
import { Logo, ErrorNote, Empty } from "./common";
import {
  SAMPLE,
  EMPTY_HOME_DATA,
  SAMPLING_INTERVALS,
  DEFAULT_SAMPLING_INTERVAL,
} from "../config";
import { formatDate } from "../runtime/format";
import { Builder } from "./Builder";
import { SessionWorkspace, Workspace } from "./Analysis";

export function Product() {
  const [data, setData] = useState<HomeData>(EMPTY_HOME_DATA),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(""),
    [view, setView] = useState<"home" | "profiles" | "tools">("home"),
    [builder, setBuilder] = useState(false),
    [profileForm, setProfileForm] = useState(false),
    [opened, setOpened] = useState<string | null>(null),
    [sample, setSample] = useState(false);
  const reload = useCallback(async () => {
    try {
      setData(await api<HomeData>("/api/home"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoaded(true);
    }
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);
  if (sample)
    return (
      <Workspace
        analysis={SAMPLE}
        tool={sampleTool}
        sample
        onBack={() => setSample(false)}
        profiles={data.profiles}
        sessions={data.sessions}
      />
    );
  if (opened)
    return (
      <SessionWorkspace
        sessionId={opened}
        data={data}
        onBack={() => {
          setOpened(null);
          reload();
        }}
      />
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand-link" href="/" aria-label="SportsBuilder home">
          <Logo />
        </a>
        <nav aria-label="Main navigation">
          {(
            [
              { id: "home", label: "Home", icon: Home },
              { id: "profiles", label: "Athletes", icon: Users },
              { id: "tools", label: "Coaching tools", icon: Target },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${view === id ? "active" : ""}`}
              onClick={() => {
                setView(id);
                setBuilder(false);
                setProfileForm(false);
              }}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="status-dot" />
          Local workspace
          <span className="small muted">Your movement, made clearer.</span>
        </div>
      </aside>
      <main className="home-main">
        <header className="topbar">
          <span className="muted">
            Workspace <ChevronRight size={13} />
            <span className="ink">
              {view === "home"
                ? "Home"
                : view === "tools"
                  ? "Coaching tools"
                  : "Athletes"}
            </span>
          </span>
          <button
            className="avatar"
            aria-label="View athletes"
            onClick={() => setView("profiles")}
          >
            <Users size={17} />
          </button>
        </header>
        <div className="home-content">
          <div className="page-heading">
            <div>
              <h1>
                {builder
                  ? "Build your coaching tool"
                  : view === "profiles"
                    ? "Your athletes"
                    : view === "tools"
                      ? "Your coaching tools"
                      : "See your next move."}
              </h1>
              <p>
                {builder
                  ? "A few questions. A coach built around what matters to you."
                  : view === "profiles"
                    ? "A little context helps your coach give more useful advice."
                    : view === "tools"
                      ? "Reusable metrics, a clear rubric, and a coach for your sport."
                      : "Look closer at your movement. Find one thing to practise."}
              </p>
            </div>
            {!builder && view === "home" && (
              <button
                className="button secondary"
                onClick={() => setBuilder(true)}
              >
                <Plus size={16} />
                Build a tool
              </button>
            )}
          </div>
          {error && <ErrorNote message={error} onClose={() => setError("")} />}
          {builder ? (
            <Builder
              onClose={() => setBuilder(false)}
              onBuilt={() => {
                setBuilder(false);
                reload();
              }}
            />
          ) : (
            <>
              {view === "home" && (
                <>
                  <UploadPanel
                    data={data}
                    onUploaded={(s) => {
                      setOpened(s.id);
                      reload();
                    }}
                    onCreateProfile={() => {
                      setView("profiles");
                      setProfileForm(true);
                    }}
                    onCreateTool={() => setBuilder(true)}
                  />
                  <div className="home-columns">
                    <section>
                      <div className="section-heading">
                        <h2>Recent videos</h2>
                        <span className="muted small">
                          {
                            data.sessions.filter(
                              (s) =>
                                !(s as Session & { reference?: boolean })
                                  .reference,
                            ).length
                          }{" "}
                          sessions
                        </span>
                      </div>
                      {!loaded ? (
                        <div className="skeleton" />
                      ) : data.sessions.filter(
                          (s) =>
                            !(s as Session & { reference?: boolean }).reference,
                        ).length ? (
                        <div className="session-list">
                          {data.sessions
                            .filter(
                              (s) =>
                                !(s as Session & { reference?: boolean })
                                  .reference,
                            )
                            .map((s) => (
                              <button
                                className="session-row"
                                key={s.id}
                                onClick={() => setOpened(s.id)}
                              >
                                <span className="video-icon">
                                  <Film size={20} />
                                </span>
                                <span className="session-copy">
                                  <strong>{s.name}</strong>
                                  <small>
                                    {data.profiles.find(
                                      (p) => p.id === s.profileId,
                                    )?.name ?? "Athlete"}{" "}
                                    · {s.duration.toFixed(1)}s ·{" "}
                                    {formatDate(s.createdAt)}
                                  </small>
                                </span>
                                <span
                                  className={`small ${s.status === "failed" ? "error-text" : "muted"}`}
                                >
                                  {s.status === "complete"
                                    ? "Ready"
                                    : pretty(s.status)}
                                </span>
                                <ChevronRight size={16} />
                              </button>
                            ))}
                        </div>
                      ) : (
                        <Empty title="Your first session starts here">
                          Upload a short video to see your movement, frame by
                          frame.
                        </Empty>
                      )}
                    </section>
                    <section className="tools-aside">
                      <div className="section-heading">
                        <h2>Your tools</h2>
                        <IconButton
                          label="Build a coaching tool"
                          surface="transparent"
                          onClick={() => setBuilder(true)}
                        >
                          <Plus size={17} />
                        </IconButton>
                      </div>
                      {data.tools.slice(0, 3).map((t) => (
                        <ToolSummary tool={t} key={t.id} />
                      ))}
                      {!data.tools.length && (
                        <p className="muted">
                          Create a coach for your sport. Choose what to measure
                          and what good form means.
                        </p>
                      )}
                      <button
                        className="sample-link"
                        onClick={() => setSample(true)}
                      >
                        <span className="sample-symbol">
                          <Activity size={21} />
                        </span>
                        <span>
                          <strong>Try a sample analysis</strong>
                          <small>Explore the player and motion graphs</small>
                        </span>
                        <ArrowRight size={17} />
                      </button>
                      <p className="small muted">
                        Synthetic movement. No video upload needed.
                      </p>
                    </section>
                  </div>
                </>
              )}
              {view === "profiles" && (
                <>
                  <div className="section-heading">
                    <span className="muted">
                      Profiles are shared in this local workspace.
                    </span>
                    <button
                      className="button"
                      onClick={() => setProfileForm(!profileForm)}
                    >
                      <Plus size={16} />
                      Add athlete
                    </button>
                  </div>
                  {profileForm && (
                    <ProfileForm
                      onCancel={() => setProfileForm(false)}
                      onSaved={() => {
                        setProfileForm(false);
                        reload();
                      }}
                    />
                  )}
                  <div className="profile-grid">
                    {data.profiles.map((p) => (
                      <article className="profile-card" key={p.id}>
                        <div className="profile-initial">
                          {p.name.charAt(0)}
                        </div>
                        <h3>{p.name}</h3>
                        <p>
                          {p.experience || "Athlete"}
                          {p.dominantSide ? ` · ${p.dominantSide} handed` : ""}
                        </p>
                        <dl>
                          <div>
                            <dt>Height</dt>
                            <dd>
                              {p.heightCm ? `${p.heightCm} cm` : "Not set"}
                            </dd>
                          </div>
                          <div>
                            <dt>Weight</dt>
                            <dd>
                              {p.weightKg ? `${p.weightKg} kg` : "Not set"}
                            </dd>
                          </div>
                        </dl>
                        {p.notes && <p>{p.notes}</p>}
                      </article>
                    ))}
                  </div>
                  {!data.profiles.length && !profileForm && (
                    <Empty title="Who is moving?">
                      Add your first athlete to keep their videos and progress
                      together.
                    </Empty>
                  )}
                </>
              )}
              {view === "tools" && (
                <>
                  <button className="button" onClick={() => setBuilder(true)}>
                    <Plus size={16} />
                    Build a coaching tool
                  </button>
                  <div className="tool-grid">
                    {data.tools.map((t) => (
                      <ToolSummary tool={t} key={t.id} />
                    ))}
                  </div>
                  {!data.tools.length && (
                    <Empty title="A coach for your kind of movement">
                      Start with your sport, the movement, and what you want to
                      improve.
                    </Empty>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
function ToolSummary({ tool }: { tool: ToolConfig }) {
  return (
    <article className="tool-summary">
      <div className="tool-symbol">
        <Target size={19} />
      </div>
      <div>
        <h3>{tool.name}</h3>
        <p>
          {tool.sport} · {tool.metrics.length} metrics
        </p>
      </div>
    </article>
  );
}
function UploadPanel({
  data,
  onUploaded,
  onCreateProfile,
  onCreateTool,
}: {
  data: HomeData;
  onUploaded: (s: Session) => void;
  onCreateProfile: () => void;
  onCreateTool: () => void;
}) {
  const [profile, setProfile] = useState(""),
    [tool, setTool] = useState(""),
    [interval, setInterval] = useState(DEFAULT_SAMPLING_INTERVAL),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const profileId = profile || data.profiles[0]?.id || "",
    toolId = tool || data.tools[0]?.id || "";
  async function upload(file: File) {
    if (!profileId || !toolId) {
      setError("Add an athlete and build a coaching tool first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("profileId", profileId);
      form.set("toolId", toolId);
      form.set("interval", String(interval));
      const s = await api<Session>("/api/upload", {
        method: "POST",
        body: form,
      });
      await post(`/api/sessions/${s.id}/analyze`, {});
      onUploaded(s);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="upload-panel"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (!busy && e.dataTransfer.files[0]) upload(e.dataTransfer.files[0]);
      }}
    >
      <div className="upload-icon">
        <CloudUpload size={28} strokeWidth={1.5} />
      </div>
      <h2>A little footage. A clearer picture.</h2>
      <p>Drop your video here, or choose one to get started.</p>
      <div className="upload-selects">
        <label>
          Athlete
          <select
            aria-label="Athlete for upload"
            value={profileId}
            onChange={(e) => setProfile(e.target.value)}
          >
            {!data.profiles.length && (
              <option value="">Add an athlete first</option>
            )}
            {data.profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Coaching tool
          <select
            aria-label="Coaching tool for upload"
            value={toolId}
            onChange={(e) => setTool(e.target.value)}
          >
            {!data.tools.length && <option value="">Build a tool first</option>}
            {data.tools.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <input
        ref={fileRef}
        className="sr-only"
        type="file"
        accept="video/mp4,video/quicktime,video/webm,.mov,.mp4,.webm"
        aria-label="Upload sports video"
        onChange={(e) => {
          if (e.target.files?.[0]) upload(e.target.files[0]);
          e.target.value = "";
        }}
      />
      <button
        className="button"
        disabled={busy || !profileId || !toolId}
        onClick={() => fileRef.current?.click()}
      >
        {busy ? (
          <LoaderCircle className="spin" size={17} />
        ) : (
          <Plus size={17} />
        )}{" "}
        {busy ? "Uploading video…" : "Choose video"}
      </button>
      <span className="small muted">
        Up to 30 seconds · MP4, MOV, WebM · 100 MiB
      </span>
      {(!profileId || !toolId) && (
        <div className="prerequisites">
          {!profileId && (
            <button className="text-button" onClick={onCreateProfile}>
              Add an athlete <ArrowRight size={13} />
            </button>
          )}
          {!toolId && (
            <button className="text-button" onClick={onCreateTool}>
              Build your first tool <ArrowRight size={13} />
            </button>
          )}
        </div>
      )}
      <details className="upload-settings">
        <summary>Sampling settings</summary>
        <label>
          Track a frame every{" "}
          <select
            aria-label="Tracking interval"
            value={interval}
            onChange={(e) => setInterval(Number(e.target.value))}
          >
            {SAMPLING_INTERVALS.map((v) => (
              <option key={v} value={v}>
                {v} seconds
              </option>
            ))}
          </select>
        </label>
        <p className="small muted">
          The same interval supplies frames to the coach. Shorter intervals
          capture more detail and take longer.
        </p>
      </details>
      {error && <ErrorNote message={error} />}
    </section>
  );
}
function ProfileForm({
  onSaved,
  onCancel,
}: {
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [imperial, setImperial] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await post("/api/profiles", {
        name: f.get("name"),
        heightCm: f.get("height")
          ? Number(f.get("height")) * (imperial ? 2.54 : 1)
          : null,
        weightKg: f.get("weight")
          ? Number(f.get("weight")) * (imperial ? 0.45359237 : 1)
          : null,
        dominantSide: f.get("side"),
        experience: f.get("experience"),
        notes: f.get("notes"),
      });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="inline-form" onSubmit={submit}>
      <div className="section-heading">
        <h2>Add athlete</h2>
        <IconButton label="Close athlete form" onClick={onCancel}>
          <X size={16} />
        </IconButton>
      </div>
      <label>
        Name
        <Input
          name="name"
          required
          maxLength={80}
          autoFocus
          placeholder="e.g. Alex"
        />
      </label>
      <div className="form-pair">
        <label>
          Height ({imperial ? "in" : "cm"})
          <input
            name="height"
            type="number"
            min={imperial ? 12 : 30}
            max={imperial ? 118 : 300}
            step="any"
          />
        </label>
        <label>
          Weight ({imperial ? "lb" : "kg"})
          <input
            name="weight"
            type="number"
            min="1"
            max={imperial ? 1320 : 600}
            step="any"
          />
        </label>
      </div>
      <label className="check-label">
        <input
          type="checkbox"
          checked={imperial}
          onChange={(e) => setImperial(e.target.checked)}
        />
        Use inches and pounds
      </label>
      <div className="form-pair">
        <label>
          Dominant side
          <select name="side">
            <option>Right</option>
            <option>Left</option>
            <option>Both</option>
          </select>
        </label>
        <label>
          Experience
          <Input name="experience" placeholder="e.g. Beginner" />
        </label>
      </div>
      <label>
        Anything your coach should know
        <textarea
          name="notes"
          rows={2}
          maxLength={1000}
          placeholder="Your goals, movement preferences, or relevant context"
        />
      </label>
      {error && <ErrorNote message={error} />}
      <button className="button" disabled={busy}>
        {busy ? "Saving…" : "Save athlete"}
        <Check size={15} />
      </button>
    </form>
  );
}
