import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowRight,
  CloudUpload,
  Home,
  UserRound,
  LoaderCircle,
  Menu,
  Target,
} from "lucide-react";
import {
  pretty,
  sampleTool,
  type Profile,
  type Session,
  type ToolConfig,
} from "../../../../../shared";
import { IconButton, DropdownSelect, NumberInput } from "../../../components";
import { api, post } from "../services/api";
import { type HomeData } from "../types";
import { Logo, ErrorNote, Empty } from "./common";
import {
  SAMPLE,
  EMPTY_HOME_DATA,
  SAMPLING_RANGE,
  DEFAULT_SAMPLING_INTERVAL,
} from "../config";
import { formatDate, formatFrameRate } from "../runtime/format";
import { Builder } from "./Builder";
import { SessionPreview } from "./SessionPreview";
import { SessionWorkspace, Workspace } from "./Analysis";

export function Product() {
  const [data, setData] = useState<HomeData>(EMPTY_HOME_DATA),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(""),
    [view, setView] = useState<"coached" | "profile" | "builder">("coached"),
    [builder, setBuilder] = useState(false),
    [opened, setOpened] = useState<string | null>(null),
    [sample, setSample] = useState(false),
    [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
      try {
        return (
          window.localStorage.getItem("sportsbuilder.sidebar.collapsed") ===
          "true"
        );
      } catch {
        return false;
      }
    });
  const collapseButton = useRef<HTMLButtonElement>(null);
  const expandButton = useRef<HTMLButtonElement>(null);
  const restoreSidebarFocus = useRef(false);
  function toggleSidebar() {
    const collapsed = !sidebarCollapsed;
    try {
      window.localStorage.setItem(
        "sportsbuilder.sidebar.collapsed",
        String(collapsed),
      );
    } catch {
      /* Navigation still works if browser storage is unavailable. */
    }
    restoreSidebarFocus.current = true;
    setSidebarCollapsed(collapsed);
  }
  useEffect(() => {
    if (!restoreSidebarFocus.current) return;
    (sidebarCollapsed ? expandButton : collapseButton).current?.focus();
    restoreSidebarFocus.current = false;
  }, [sidebarCollapsed]);
  const profile = data.profiles.find((p) => p.name === "Athlete");
  const needsProfile = !profile?.heightCm;
  function profileSaved(saved: Profile) {
    setData((previous) => ({
      ...previous,
      profiles: [...previous.profiles.filter((p) => p.id !== saved.id), saved],
    }));
    setView("coached");
    reload();
  }
  const reload = useCallback(async () => {
    setLoaded(false);
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
  useEffect(() => {
    if (loaded && needsProfile && !error) setView("profile");
  }, [loaded, needsProfile, error]);
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
    <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      {sidebarCollapsed && (
        <IconButton
          ref={expandButton}
          label="Expand sidebar"
          className="sidebar-expand"
          aria-controls="sportsbuilder-sidebar"
          aria-expanded={false}
          onClick={toggleSidebar}
        >
          <Menu size={18} strokeWidth={1.75} />
        </IconButton>
      )}
      <aside
        id="sportsbuilder-sidebar"
        className="sidebar"
        hidden={sidebarCollapsed}
      >
        <div className="sidebar-header">
          <a className="brand-link" href="/" aria-label="SportsBuilder home">
            <Logo />
          </a>
          <IconButton
            ref={collapseButton}
            label="Collapse sidebar"
            surface="transparent"
            className="sidebar-collapse"
            aria-controls="sportsbuilder-sidebar"
            aria-expanded={true}
            onClick={toggleSidebar}
          >
            <Menu size={18} strokeWidth={1.75} />
          </IconButton>
        </div>
        <nav aria-label="Main navigation" className="flex-1 pb-4">
          {(
            [
              { id: "builder", label: "Build your coach", icon: Target },
              { id: "coached", label: "Get coached", icon: Home },
              { id: "profile", label: "Your profile", icon: UserRound },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${view === id ? "active" : ""} ${id === "profile" ? "mt-auto" : ""}`}
              onClick={() => {
                setView(id);
                if (id === "builder") setBuilder(true);
              }}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="home-main">
        <div className="home-content">
          {view !== "coached" && (
            <div className="page-heading">
              <div>
                <h1>
                  {view === "profile"
                    ? "Your profile"
                    : view === "builder"
                      ? "Build your coach"
                      : "See your next move."}
                </h1>
                <p>
                  {view === "profile"
                    ? "A little context for measurements that make sense."
                    : view === "builder"
                      ? "A few questions. A coach built around what matters to you."
                      : "Look closer at your movement. Find one thing to practise."}
                </p>
              </div>
            </div>
          )}
          {!loaded && (
            <p className="small muted" role="status" aria-live="polite">
              Loading saved workspace…
            </p>
          )}
          {error && (
            <div>
              <ErrorNote message={error} onClose={() => setError("")} />
              <button
                className="text-button"
                disabled={!loaded}
                onClick={reload}
              >
                Retry loading workspace
              </button>
            </div>
          )}
          {loaded && (
            <div hidden={view !== "profile"}>
              <ProfileSetup
                key={profile?.id ?? "new"}
                profile={profile}
                onSaved={profileSaved}
                editing={!needsProfile}
              />
            </div>
          )}
          {builder && (
            <div hidden={view !== "builder"}>
              <Builder
                onClose={() => setView("coached")}
                onBuilt={() => {
                  setView("coached");
                  reload();
                }}
              />
              {data.tools.length > 0 && (
                <section className="mt-8">
                  <h2>Your coaches</h2>
                  <div className="tool-grid">
                    {data.tools.map((tool) => (
                      <ToolSummary key={tool.id} tool={tool} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
          <div hidden={view !== "coached"}>
            <UploadPanel
              data={data}
              profile={profile}
              profileReady={!needsProfile}
              loading={!loaded}
              onUploaded={(s) => {
                setOpened(s.id);
                reload();
              }}
              onCreateTool={() => {
                setBuilder(true);
                setView("builder");
              }}
            />
            <div className="recent-videos">
              <section>
                <div className="section-heading">
                  <h2>Recent videos</h2>
                </div>
                {!loaded ? (
                  <div className="skeleton" />
                ) : data.sessions.filter(
                    (s) => !(s as Session & { reference?: boolean }).reference,
                  ).length ? (
                  <div className="session-list">
                    {data.sessions
                      .filter(
                        (s) =>
                          !(s as Session & { reference?: boolean }).reference,
                      )
                      .map((s) => (
                        <div className="session-row" key={s.id}>
                          <SessionPreview sessionId={s.id} />
                          <span className="session-copy">
                            <strong>{s.name}</strong>
                            <small>
                              {s.duration.toFixed(1)}s ·{" "}
                              {formatDate(s.createdAt)}
                            </small>
                          </span>
                          {s.status !== "complete" && (
                            <span
                              className={`small ${s.status === "failed" ? "error-text" : "muted"}`}
                            >
                              {pretty(s.status)}
                            </span>
                          )}
                          <IconButton
                            label={`Open ${s.name}`}
                            onClick={() => setOpened(s.id)}
                          >
                            <ArrowRight size={17} />
                          </IconButton>
                        </div>
                      ))}
                  </div>
                ) : (
                  <Empty title="Your first session starts here">
                    Upload a short video to see your movement, frame by frame.
                  </Empty>
                )}
              </section>
            </div>
          </div>
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
  profile,
  profileReady,
  loading = false,
  onUploaded,
  onCreateTool,
}: {
  data: HomeData;
  profile?: Profile;
  profileReady: boolean;
  loading?: boolean;
  onUploaded: (s: Session) => void;
  onCreateTool: () => void;
}) {
  const [tool, setTool] = useState(""),
    [interval, setInterval] = useState(DEFAULT_SAMPLING_INTERVAL),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const toolId = tool || data.tools[0]?.id || "";
  async function upload(file: File) {
    if (loading || busy || !profileReady || !profile) return;
    if (!toolId) {
      setError("Build a coaching tool first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("profileId", profile.id);
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
        if (!loading && !busy && e.dataTransfer.files[0])
          upload(e.dataTransfer.files[0]);
      }}
    >
      <div className="upload-icon">
        <CloudUpload size={28} strokeWidth={1.5} />
      </div>
      <h1>Your Athletic Dreams Will Become a Reality</h1>
      <div className="upload-selects">
        <div className="flex min-w-0 flex-1 flex-col gap-2 text-[12px] text-(--neutral-dark-400)">
          <span>Coaching tool</span>
          <DropdownSelect
            label="Coaching tool for upload"
            disabled={loading || busy || !data.tools.length}
            value={toolId}
            onChange={setTool}
            options={
              loading
                ? [{ value: toolId, label: "Loading saved workspace…" }]
                : data.tools.length
                  ? data.tools.map((t) => ({ value: t.id, label: t.name }))
                  : [{ value: "", label: "Build a tool first" }]
            }
          />
        </div>
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
        disabled={loading || busy || !profileReady || !toolId}
        onClick={() => fileRef.current?.click()}
      >
        {busy ? (
          <LoaderCircle className="spin" size={17} />
        ) : (
          <CloudUpload size={17} />
        )}{" "}
        {busy ? "Uploading video…" : "Upload video"}
      </button>
      <span className="small muted">
        Up to 30 seconds · MP4, MOV, WebM · 100 MiB
      </span>
      {!loading && !toolId && (
        <div className="prerequisites">
          {!toolId && (
            <button className="text-button" onClick={onCreateTool}>
              Build your first tool <ArrowRight size={13} />
            </button>
          )}
        </div>
      )}
      <div className="w-full max-w-[420px] text-left">
        <label htmlFor="sampling-interval">
          {formatFrameRate(interval)} fps
        </label>
        <input
          id="sampling-interval"
          aria-label="Frame sampling rate"
          aria-valuetext={`${formatFrameRate(interval)} frames per second`}
          type="range"
          min={SAMPLING_RANGE.min}
          max={SAMPLING_RANGE.max}
          step={SAMPLING_RANGE.step}
          value={interval}
          disabled={loading || busy}
          className="h-8 w-full appearance-none bg-transparent! p-0! accent-(--accent-700) [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-(--neutral-light-500) [&::-webkit-slider-runnable-track]:shadow-(--shadow-inner) [&::-webkit-slider-thumb]:-mt-[5px] [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-(--accent-700) [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-(--neutral-light-500) [&::-moz-range-track]:shadow-(--shadow-inner) [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-(--accent-700)"
          onChange={(event) => setInterval(Number(event.target.value))}
        />
        <div className="flex justify-between gap-6 text-[10px] text-(--neutral-dark-500)">
          <span>
            {formatFrameRate(SAMPLING_RANGE.min)} fps
            <span className="mt-1 block">Slower loading, more precision</span>
          </span>
          <span className="text-right">
            {formatFrameRate(SAMPLING_RANGE.max)} fps
            <span className="mt-1 block">Faster loading, less precision</span>
          </span>
        </div>
      </div>
      {error && <ErrorNote message={error} />}
    </section>
  );
}

function ProfileSetup({
  profile,
  onSaved,
  editing = false,
}: {
  profile?: Profile;
  onSaved: (profile: Profile) => void;
  editing?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const fields = new FormData(form);
    const payload = { heightCm: Number(fields.get("heightCm")) };
    if (
      !Number.isFinite(payload.heightCm) ||
      payload.heightCm < 30 ||
      payload.heightCm > 300
    ) {
      setError("Enter a height between 30 and 300 cm.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const saved = profile
        ? await api<Profile>(`/api/profiles/${profile.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : await post<Profile>("/api/profiles", { name: "Athlete", ...payload });
      onSaved(saved);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="inline-form" onSubmit={save}>
      <h2>{editing ? "Your height" : "Before your first video"}</h2>
      <p className="small muted">
        Your height helps estimate a scale for movement measurements. You can
        adjust it later.
      </p>
      <div className="form-pair">
        <label htmlFor="profile-height">
          Height (cm)
          <NumberInput
            id="profile-height"
            name="heightCm"
            required
            min={30}
            max={300}
            step="any"
            suffix="cm"
            defaultValue={profile?.heightCm ?? ""}
            placeholder="178"
            disabled={busy}
          />
        </label>
      </div>
      {error && <ErrorNote message={error} />}
      <button className="button" disabled={busy}>
        {busy ? "Saving…" : editing ? "Save profile" : "Save and continue"}
      </button>
    </form>
  );
}
