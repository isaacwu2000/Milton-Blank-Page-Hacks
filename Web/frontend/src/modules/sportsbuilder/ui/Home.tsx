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
  X,
} from "lucide-react";
import {
  sampleTool,
  type Profile,
  type Session,
  type SavedTool,
} from "../../../../../shared";
import { IconButton, DropdownSelect, NumberInput } from "../../../components";
import { api, post } from "../services/api";
import { type HomeData } from "../types";
import { Logo, ErrorNote, Empty, LoadingStatus } from "./common";
import {
  SAMPLE,
  EMPTY_HOME_DATA,
  DEFAULT_SAMPLING_INTERVAL,
} from "../config";
import { Builder } from "./Builder";
import { RecentVideo } from "./RecentVideo";
import { SamplingControl } from "./SamplingControl";
import { SessionWorkspace, Workspace } from "./Analysis";

export function Product() {
  const recentHeading = useRef<HTMLHeadingElement>(null);
  const [data, setData] = useState<HomeData>(EMPTY_HOME_DATA),
    [loaded, setLoaded] = useState(false),
    [workspaceAvailable, setWorkspaceAvailable] = useState(false),
    [error, setError] = useState(""),
    [view, setView] = useState<"coached" | "profile" | "builder">("coached"),
    [builder, setBuilder] = useState(false),
    [opened, setOpened] = useState<string | null>(null),
    [sample, setSample] = useState(false),
    [isMobile, setIsMobile] = useState(() => window.innerWidth <= 900),
    [mobileSidebarOpen, setMobileSidebarOpen] = useState(false),
    [desktopCollapsed, setDesktopCollapsed] = useState(() => {
      try {
        return (
          window.localStorage.getItem("sportsbuilder.sidebar.collapsed") ===
          "true"
        );
      } catch {
        return false;
      }
    });
  const sidebarCollapsed = isMobile ? !mobileSidebarOpen : desktopCollapsed;
  const sidebar = useRef<HTMLElement>(null);
  const collapseButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    function resize() {
      setIsMobile(window.innerWidth <= 900);
      setMobileSidebarOpen(false);
    }
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  useEffect(() => {
    if (!isMobile || sidebarCollapsed) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobile, sidebarCollapsed]);
  const expandButton = useRef<HTMLButtonElement>(null);
  const restoreSidebarFocus = useRef(false);
  function toggleSidebar() {
    const collapsed = !sidebarCollapsed;
    if (isMobile) {
      restoreSidebarFocus.current = true;
      setMobileSidebarOpen(collapsed === false);
      return;
    }
    try {
      window.localStorage.setItem(
        "sportsbuilder.sidebar.collapsed",
        String(collapsed),
      );
    } catch {
      /* Navigation still works if browser storage is unavailable. */
    }
    restoreSidebarFocus.current = true;
    setDesktopCollapsed(collapsed);
  }
  useEffect(() => {
    if (!restoreSidebarFocus.current) return;
    (sidebarCollapsed ? expandButton : collapseButton).current?.focus();
    restoreSidebarFocus.current = false;
  }, [sidebarCollapsed]);
  const [removingTool, setRemovingTool] = useState<string>();
  const visibleTools = data.tools.filter((tool) => !tool.hidden);
  async function removeTool(id: string) {
    if (removingTool) return;
    setRemovingTool(id);
    try {
      const saved = await api<SavedTool>(`/api/tools/${id}`, { method: "DELETE" });
      setData((previous) => ({
        ...previous,
        tools: previous.tools.map((tool) => tool.id === id ? saved : tool),
      }));
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setRemovingTool(undefined);
    }
  }
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
    setError("");
    try {
      setData(await api<HomeData>("/api/home"));
      setWorkspaceAvailable(true);
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
    if (loaded && workspaceAvailable && needsProfile && !error)
      setView("profile");
  }, [loaded, workspaceAvailable, needsProfile, error]);
  return (
    <>
      {sample && (
      <Workspace
        analysis={SAMPLE}
        tool={sampleTool}
        sample
        onBack={() => setSample(false)}
        profiles={data.profiles}
        sessions={data.sessions}
      />
      )}
      {opened && (
      <SessionWorkspace
        sessionId={opened}
        data={data}
        onBack={() => {
          setOpened(null);
          reload();
        }}
      />
      )}
    <div hidden={sample || !!opened} className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      {sidebarCollapsed && (
        <IconButton
          ref={expandButton}
          label="Expand sidebar"
          className="sidebar-expand"
          aria-controls="sportsbuilder-sidebar"
          aria-expanded={false}
          onClick={toggleSidebar}
        >
          <Menu size={18} />
        </IconButton>
      )}
      {isMobile && !sidebarCollapsed && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          tabIndex={-1}
          onClick={toggleSidebar}
        />
      )}
      <aside
        ref={sidebar}
        role={isMobile ? "dialog" : undefined}
        aria-modal={isMobile && !sidebarCollapsed ? true : undefined}
        aria-label="Application sidebar"
        onKeyDown={(event) => {
          if (!isMobile) return;
          if (event.key === "Escape") {
            event.preventDefault();
            toggleSidebar();
          }
          if (event.key === "Tab") {
            const items = sidebar.current?.querySelectorAll<HTMLElement>(
              "a[href], button:not(:disabled)",
            );
            const first = items?.[0],
              last = items?.[items.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            }
            if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }
        }}
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
            <Menu size={18} />
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
                if (isMobile) toggleSidebar();
              }}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="home-main" inert={isMobile && !sidebarCollapsed}>
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
            <LoadingStatus>Loading saved workspace…</LoadingStatus>
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
          {loaded && workspaceAvailable && (
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
              {visibleTools.length > 0 && (
                <section className="mt-8">
                  <h2>Your coaches</h2>
                  <div className="tool-grid">
                    {visibleTools.map((tool) => (
                      <ToolSummary
                        key={tool.id}
                        tool={tool}
                        removing={removingTool === tool.id}
                        disabled={!!removingTool}
                        onRemove={() => removeTool(tool.id)}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
          <div hidden={view !== "coached" || (loaded && !workspaceAvailable)}>
            <UploadPanel
              data={data}
              onRemoveTool={removeTool}
              removingTool={removingTool}
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
                  <h2 ref={recentHeading} tabIndex={-1}>Recent videos</h2>
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
                        <RecentVideo
                          key={s.id}
                          session={s}
                          onOpen={() => setOpened(s.id)}
                          onDeleted={(id) => {
                            setData((previous) => ({ ...previous, sessions: previous.sessions.filter((session) => session.id !== id) }));
                            recentHeading.current?.focus();
                          }}
                        />
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
    </>
  );
}
function ToolSummary({ tool, removing, disabled, onRemove }: {
  tool: SavedTool;
  removing: boolean;
  disabled: boolean;
  onRemove: () => void;
}) {
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
      <IconButton
        label={`Remove ${tool.name}`}
        className="ml-auto shrink-0"
        disabled={disabled}
        onClick={onRemove}
      >
        {removing ? (
          <LoaderCircle size={17} className="spin" aria-hidden="true" />
        ) : (
          <X size={17} aria-hidden="true" />
        )}
      </IconButton>
    </article>
  );
}
function UploadPanel({
  data,
  onRemoveTool,
  removingTool,
  profile,
  profileReady,
  loading = false,
  onUploaded,
  onCreateTool,
}: {
  data: HomeData;
  onRemoveTool: (id: string) => void;
  removingTool?: string;
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
  const tools = data.tools.filter((tool) => !tool.hidden);
  const toolId = tools.some((item) => item.id === tool) ? tool : tools[0]?.id || "";
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
        <CloudUpload size={28} />
      </div>
      <h1>Your Athletic Dreams Will Become a Reality</h1>
      <div className="upload-selects">
        <div className="flex min-w-0 flex-1 flex-col gap-2 text-[12px] text-(--neutral-dark-400)">
          <span>Coaching tool</span>
          <DropdownSelect
            label="Coaching tool for upload"
            disabled={loading || busy || !tools.length}
            value={toolId}
            onChange={setTool}
            onRemove={onRemoveTool}
            removingValue={removingTool}
            options={
              loading
                ? [{ value: toolId, label: "Loading saved workspace…" }]
                : tools.length
                  ? tools.map((t) => ({ value: t.id, label: t.name }))
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
      <SamplingControl interval={interval} onChange={setInterval} disabled={loading || busy} />
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
        {busy ? <LoadingStatus>Saving your profile…</LoadingStatus> : editing ? "Save profile" : "Save and continue"}
      </button>
    </form>
  );
}
