import { POLLING } from "../config";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  Clipboard,
  Film,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  Ruler,
  Sparkles,
  Target,
  Trash2,
  X,
} from "lucide-react";
import {
  JOINTS,
  pretty,
  type Analysis,
  type Joint,
  type Message,
  type Profile,
  type Session,
  type ToolConfig,
  calculate,
  unitLabel,
  metricTarget,
  jointMeasurement,
} from "../../../../../shared";
import {
  IconButton,
  MeasurementUnit,
  NumberInput,
  PromptBar,
} from "../../../components";
import { scaleFromAthleteHeight } from "../runtime/calibration";
import { api, post } from "../services/api";
import { type HomeData, type AgentJob } from "../types";
import { useAgentJob } from "../hooks/useAgentJob";
import { Logo, ErrorNote } from "./common";
import { fmt } from "../runtime/format";
import { Player, Chart } from "./Player";
import { ReferenceVideo } from "./ReferenceVideo";

export function SessionWorkspace({
  sessionId,
  data,
  onBack,
}: {
  sessionId: string;
  data: HomeData;
  onBack: () => void;
}) {
  const [pollGeneration, setPollGeneration] = useState(0);
  const [session, setSession] = useState<Session | null>(null),
    [analysis, setAnalysis] = useState<Analysis | null>(null),
    [url, setUrl] = useState(""),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    const s = await api<Session>(`/api/sessions/${sessionId}`);
    setSession(s);
    if (s.status === "complete")
      setAnalysis(await api<Analysis>(`/api/sessions/${sessionId}/analysis`));
    return s;
  }, [sessionId]);
  useEffect(() => {
    let stopped = false,
      timer: ReturnType<typeof setTimeout>;
    setAnalysis(null);
    setError("");
    const poll = async () => {
      try {
        const s = await load();
        if (!stopped && (s.status === "processing" || s.status === "queued"))
          timer = setTimeout(poll, POLLING.videoStatusMs);
      } catch (e) {
        if (!stopped) setError((e as Error).message);
      }
    };
    poll();
    api<{ url: string }>(`/api/sessions/${sessionId}/video`)
      .then((v) => {
        if (!stopped) setUrl(v.url);
      })
      .catch((e) => setError(e.message));
    const renew = setInterval(
      () =>
        api<{ url: string }>(`/api/sessions/${sessionId}/video`)
          .then((v) => {
            if (!stopped) setUrl(v.url);
          })
          .catch(() => {}),
      POLLING.signedUrlRefreshMs,
    );
    return () => {
      stopped = true;
      clearTimeout(timer);
      clearInterval(renew);
    };
  }, [sessionId, load, pollGeneration]);
  const tool = data.tools.find((t) => t.id === session?.toolId);
  async function start() {
    setError("");
    try {
      setSession(await post<Session>(`/api/sessions/${sessionId}/analyze`, {}));
      setPollGeneration((g) => g + 1);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  if (analysis && session && !tool)
    return (
      <div className="processing-content">
        <h1>Coaching tool unavailable</h1>
        <p>
          This video’s tool could not be found. Return home and build a new
          tool.
        </p>
        <button className="button" onClick={onBack}>
          Back to videos
        </button>
      </div>
    );
  if (analysis && session && tool)
    return (
      <Workspace
        analysis={analysis}
        tool={tool}
        session={session}
        url={url}
        profiles={data.profiles}
        sessions={data.sessions}
        onBack={onBack}
      />
    );
  return (
    <div className="processing-screen">
      <header className="analysis-header">
        <button className="text-button" onClick={onBack}>
          <ArrowLeft size={16} />
          All videos
        </button>
        <Logo />
      </header>
      <div className="processing-content">
        <div className="processing-icon">
          {session?.status === "failed" ? (
            <Film size={28} />
          ) : (
            <Activity size={28} />
          )}
        </div>
        <h1>
          {session?.status === "failed"
            ? "Let’s try that again"
            : session?.status === "uploaded"
              ? "Ready to look closer"
              : "Following your movement"}
        </h1>
        <p>{session?.name ?? "Loading your video…"}</p>
        {error && <ErrorNote message={error} />}
        <p className="muted">
          {session?.error ??
            (session as Session & { stage?: string })?.stage ??
            "Your video stays saved while the analysis runs."}
        </p>
        {session && ["processing", "queued"].includes(session.status) && (
          <>
            <progress
              value={session.progress}
              max="1"
              aria-label="Video analysis progress"
            />
            <p className="small muted">
              {Math.round(session.progress * 100)}% · First-time model setup can
              take a few minutes.
            </p>
            <button
              className="text-button"
              onClick={() => load().catch((e) => setError(e.message))}
            >
              Refresh status
            </button>
          </>
        )}
        {session && ["failed", "uploaded"].includes(session.status) && (
          <button className="button" onClick={start}>
            Analyze video
            <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
export function Workspace({
  analysis,
  tool,
  session,
  url,
  sample = false,
  onBack,
  profiles,
  sessions,
}: {
  analysis: Analysis;
  tool: ToolConfig;
  session?: Session;
  url?: string;
  sample?: boolean;
  onBack: () => void;
  profiles: Profile[];
  sessions: Session[];
}) {
  const [time, setTime] = useState(0),
    [joint, setJoint] = useState<Joint>(tool.focusJoint),
    [selectedMetric, setSelectedMetric] = useState(""),
    [measure, setMeasure] = useState<"speed" | "acceleration" | "x" | "y">(
      "speed",
    ),
    [ground, setGround] = useState(
      session?.ground ?? session?.calibration?.ground ?? analysis.ground,
    ),
    [scale, setScale] = useState(session?.calibration?.metersPerPixel ?? 1),
    [calibrated, setCalibrated] = useState(!!session?.calibration),
    [calibrationMetadata, setCalibrationMetadata] = useState<
      Session["calibration"]
    >(session?.calibration),
    [calibrationMode, setCalibrationMode] = useState<
      "none" | "distance" | "ground" | "height"
    >("none"),
    [points, setPoints] = useState<[number, number][]>([]),
    [calibrationFrameTime, setCalibrationFrameTime] = useState<number | null>(
      null,
    ),
    [length, setLength] = useState("1"),
    [error, setError] = useState(""),
    [settings, setSettings] = useState(false),
    [coachOpen, setCoachOpen] = useState(true),
    [tab, setTab] = useState<"movement" | "metrics">("movement"),
    [refId, setRefId] = useState(tool.referenceId ?? ""),
    [refUrl, setRefUrl] = useState(""),
    [reference, setReference] = useState<Analysis | null>(null),
    [refTime, setRefTime] = useState(0),
    [referenceDuration, setReferenceDuration] = useState(30),
    [referenceCalibration, setReferenceCalibration] =
      useState<Session["calibration"]>(),
    [paired, setPaired] = useState(
      session?.alignment ?? { current: 0, reference: 0 },
    ),
    [sync, setSync] = useState(false),
    [mainPlaying, setMainPlaying] = useState(false),
    [notice, setNotice] = useState(""),
    [copied, setCopied] = useState(false);
  const athlete =
    profiles.find((profile) => profile.id === session?.profileId) ??
    (sample
      ? profiles.find((profile) => profile.name === "Athlete")
      : undefined);
  const athleteHeight = athlete?.heightCm;
  const needsScale = !calibrated;
  const needsPhysicalScale = (unit: string) =>
    needsScale && ["length", "speed", "acceleration"].includes(unit);
  function startHeightCalibration() {
    setCalibrationMode("height");
    setMainPlaying(false);
    setCalibrationFrameTime(null);
    setPoints([]);
    setError("");
  }
  const data = useMemo(
    () => calculate(tool, analysis, scale, ground),
    [tool, analysis, scale, ground],
  );
  const idx = analysis.frames.reduce(
    (best, f, i) =>
      Math.abs(f.time - time) < Math.abs(analysis.frames[best].time - time)
        ? i
        : best,
    0,
  );
  const frame = analysis.frames[idx],
    point = frame?.joints[joint];
  const position = jointMeasurement(point, "point", scale, ground);
  const available = Array.isArray(position);
  const velocity = jointMeasurement(point, "speed", scale, ground);
  const acceleration = jointMeasurement(point, "acceleration", scale, ground);
  const values = selectedMetric
    ? (data.frames[selectedMetric] ?? [])
    : analysis.frames.map((frame) => {
        const value = jointMeasurement(
          frame.joints[joint],
          measure,
          scale,
          ground,
        );
        return typeof value === "number" ? value : null;
      });
  const graphMetric = tool.metrics.find((m) => m.id === selectedMetric),
    graphUnit =
      graphMetric?.unit ??
      (measure === "speed"
        ? "speed"
        : measure === "acceleration"
          ? "acceleration"
          : "length");
  const setCurrentTime = useCallback(
    (t: number) => {
      if (
        (calibrationMode === "height" || calibrationMode === "distance") &&
        Math.abs(t - time) > 0.0005
      ) {
        setPoints([]);
        setCalibrationFrameTime(null);
      }
      setTime(t);
      if (sync && refId)
        setRefTime(
          Math.max(
            0,
            Math.min(
              reference?.duration ?? referenceDuration,
              t - paired.current + paired.reference,
            ),
          ),
        );
    },
    [sync, reference, referenceDuration, refId, paired, calibrationMode, time],
  );
  useEffect(() => {
    setRefUrl("");
    setReference(null);
    setReferenceCalibration(undefined);
    setRefTime(0);
    if (!refId) return;
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout>;
    const refreshUrl = async () => {
      try {
        const result = await api<{ url: string }>(
          `/api/sessions/${refId}/video`,
        );
        if (!cancelled) setRefUrl(result.url);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    };
    const inspect = async () => {
      try {
        const session = await api<Session>(`/api/sessions/${refId}`);
        if (cancelled) return;
        setReferenceDuration(session.duration);
        setReferenceCalibration(session.calibration);
        if (session.status === "complete") {
          const a = await api<Analysis>(`/api/sessions/${refId}/analysis`);
          if (!cancelled) setReference(a);
        } else if (["queued", "processing"].includes(session.status))
          pollTimer = setTimeout(inspect, 2000);
      } catch {
        /* Raw reference comparison remains available without tracking. */
      }
    };
    refreshUrl();
    inspect();
    const renewal = setInterval(refreshUrl, POLLING.signedUrlRefreshMs);
    return () => {
      cancelled = true;
      clearTimeout(pollTimer);
      clearInterval(renewal);
    };
  }, [refId]);
  async function persist(body: unknown) {
    if (session)
      await api(`/api/sessions/${session.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
  }
  async function saveCalibration() {
    if (points.length !== 2) return;
    if (!Number.isFinite(Number(length)) || Number(length) <= 0) {
      setError("Enter a valid positive distance.");
      return;
    }
    const distance = Math.hypot(
      points[0][0] - points[1][0],
      points[0][1] - points[1][1],
    );
    if (distance < 5) {
      setError("Choose two points farther apart.");
      return;
    }
    const next = Number(length) / distance;
    try {
      const calibration: NonNullable<Session["calibration"]> = {
        metersPerPixel: next,
        ground,
        source: "known_distance",
      };
      await persist({ calibration });
      setCalibrationMetadata(calibration);
      setScale(next);
      setCalibrated(true);
      setCalibrationMode("none");
      setPoints([]);
      setNotice(
        "Distance calibration saved. Measurements are approximate 2D projections.",
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function saveHeightCalibration() {
    if (points.length !== 2 || !athleteHeight || calibrationFrameTime === null)
      return;
    try {
      const converted = scaleFromAthleteHeight(
        athleteHeight,
        points[0],
        points[1],
        analysis.width,
        analysis.height,
      );
      const calibration: NonNullable<Session["calibration"]> = {
        ...converted,
        ground,
        source: "athlete_height_manual",
        heightCm: athleteHeight,
        frameTime: calibrationFrameTime,
      };
      await persist({ calibration });
      setCalibrationMetadata(calibration);
      setScale(converted.metersPerPixel);
      setCalibrated(true);
      setCalibrationMode("none");
      setPoints([]);
      setNotice("Height scale saved. Measurements now use meters.");
    } catch (error) {
      setError((error as Error).message);
    }
  }
  async function clearCalibration() {
    try {
      await persist({ calibration: null, ground: analysis.ground });
      setScale(1);
      setCalibrationMetadata(undefined);
      setCalibrated(false);
      setGround(analysis.ground);
      setNotice("Scale cleared. Set it again to see measurements in meters.");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function canvasClick(p: [number, number]) {
    if (calibrationMode === "ground") {
      const next = p[1];
      setGround(next);
      setCalibrationMode("none");
      const calibration = calibrated
        ? { ...calibrationMetadata, metersPerPixel: scale, ground: next }
        : undefined;
      persist({ ground: next, ...(calibration ? { calibration } : {}) })
        .then(() => {
          if (calibration) setCalibrationMetadata(calibration);
        })
        .catch((e) => setError(e.message));
      setNotice("Ground line updated.");
    } else {
      if (points.length === 0 || points.length === 2)
        setCalibrationFrameTime(time);
      setPoints((current) => (current.length === 2 ? [p] : [...current, p]));
    }
  }
  async function copy() {
    const text = JSON.stringify(tool, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Clipboard unavailable. Use the Download tool action.");
    }
  }
  function download() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([JSON.stringify(tool, null, 2)], { type: "application/json" }),
    );
    a.download = "sportsbuilder-tool.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }
  async function remove() {
    if (!session || !confirm("Delete this video and its saved analysis?"))
      return;
    try {
      await api(`/api/sessions/${session.id}`, { method: "DELETE" });
      onBack();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="analysis-shell">
      <header className="analysis-header">
        <button className="text-button" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>All videos</span>
        </button>
        <Logo />
        <div className="header-actions">
          <span className="badge">
            {sample ? "Sample analysis" : "Video analysis"}
          </span>
          <IconButton
            label={coachOpen ? "Hide coach" : "Show coach"}
            onClick={() => setCoachOpen(!coachOpen)}
            surface="transparent"
          >
            <Sparkles size={18} />
          </IconButton>
          <IconButton
            label="Analysis settings"
            onClick={() => setSettings(!settings)}
            surface="transparent"
          >
            <MoreHorizontal size={19} />
          </IconButton>
        </div>
      </header>
      <div className={`analysis-layout ${coachOpen ? "" : "coach-hidden"}`}>
        <main className="analysis-main">
          <div className="analysis-title">
            <div>
              <h1>{session?.name ?? tool.name}</h1>
              {sample && (
                <p>Synthetic movement · explore how the analysis works</p>
              )}
            </div>
            <span className="small muted">
              {analysis.interval}s sampling · {analysis.frames.length} frames
            </span>
          </div>
          {error && <ErrorNote message={error} onClose={() => setError("")} />}
          {notice && (
            <div className="notice" role="status">
              {notice}
              <IconButton
                label="Dismiss notice"
                surface="transparent"
                onClick={() => setNotice("")}
              >
                <X size={14} />
              </IconButton>
            </div>
          )}
          {needsScale && calibrationMode === "none" && (
            <div className="notice">
              <span>
                {athleteHeight
                  ? `Use your ${athleteHeight} cm height to measure movement in meters.`
                  : "Add your height to the athlete profile to measure movement in meters."}
              </span>
              <button
                className="button secondary"
                disabled={!athleteHeight}
                onClick={startHeightCalibration}
              >
                Set scale from your height
              </button>
            </div>
          )}
          {settings && (
            <section className="analysis-settings">
              <h2>Measurement settings</h2>
              <p>
                Keep the camera still. A known distance should lie in the same
                plane as the movement.
              </p>
              <div className="wrap-actions">
                <button
                  className="button secondary"
                  disabled={!athleteHeight}
                  onClick={startHeightCalibration}
                >
                  Calibrate from height
                </button>
                <button
                  className="button secondary"
                  onClick={() => {
                    setCalibrationMode("distance");
                    setMainPlaying(false);
                    setCalibrationFrameTime(null);
                    setPoints([]);
                  }}
                >
                  <Ruler size={15} />
                  Calibrate distance
                </button>
                <button
                  className="button secondary"
                  onClick={() => {
                    setMainPlaying(false);
                    setCalibrationMode("ground");
                  }}
                >
                  Set ground line
                </button>
                <button className="text-button" onClick={clearCalibration}>
                  Reset calibration
                </button>
              </div>
              <details>
                <summary>Tool definition</summary>
                <p>{tool.rubric}</p>
                <div className="wrap-actions">
                  <button className="text-button" onClick={copy}>
                    <Clipboard size={14} />
                    {copied ? "Copied" : "Copy JSON"}
                  </button>
                  <button className="text-button" onClick={download}>
                    Download tool
                  </button>
                </div>
              </details>
              {session && (
                <button className="text-button error-text" onClick={remove}>
                  <Trash2 size={14} />
                  Delete video
                </button>
              )}
            </section>
          )}
          {calibrationMode !== "none" && (
            <div className="calibration-toolbar">
              <span>
                {calibrationMode === "ground"
                  ? "Click the video at the initial foot position."
                  : calibrationMode === "height"
                    ? `Choose a frame standing upright. Click the top of your head, then the bottom of your shoes (${points.length}/2).`
                    : `Click two ends of a known distance (${points.length}/2).`}
              </span>
              {calibrationMode === "height" && (
                <>
                  <span>Using your {athleteHeight} cm height</span>
                  <button
                    className="button"
                    disabled={points.length !== 2}
                    onClick={saveHeightCalibration}
                  >
                    Apply height scale
                  </button>
                </>
              )}
              {calibrationMode === "distance" && (
                <>
                  <label>
                    Distance (m)
                    <NumberInput
                      min={0.001}
                      step="any"
                      value={length}
                      onChange={(e) => setLength(e.target.value)}
                    />
                  </label>
                  <button
                    className="button"
                    disabled={points.length !== 2 || Number(length) <= 0}
                    onClick={saveCalibration}
                  >
                    Apply
                  </button>
                </>
              )}
              <IconButton
                label="Cancel calibration"
                onClick={() => {
                  setCalibrationMode("none");
                  setCalibrationFrameTime(null);
                  setPoints([]);
                }}
              >
                <X size={16} />
              </IconButton>
            </div>
          )}
          <div className={refUrl ? "comparison-grid" : ""}>
            <div>
              <Player
                analysis={analysis}
                url={url}
                time={time}
                onTime={setCurrentTime}
                joint={joint}
                onJoint={(j) => {
                  setJoint(j);
                  setSelectedMetric("");
                  setTab("movement");
                }}
                ground={ground}
                metersPerPixel={scale}
                calibrated={calibrated}
                requireCalibration
                onPlayingChange={setMainPlaying}
                onCanvasClick={
                  calibrationMode === "none" ? undefined : canvasClick
                }
                points={points}
              />
            </div>
            {refUrl && (
              <section className="reference-player">
                <span className="reference-label">Good-form reference</span>
                {reference ? (
                  <Player
                    analysis={reference}
                    url={refUrl}
                    time={refTime}
                    onTime={setRefTime}
                    joint={joint}
                    onJoint={setJoint}
                    ground={referenceCalibration?.ground ?? reference.ground}
                    metersPerPixel={referenceCalibration?.metersPerPixel}
                    calibrated={!!referenceCalibration}
                    requireCalibration
                    linkedPlaying={sync ? mainPlaying : undefined}
                  />
                ) : (
                  <ReferenceVideo
                    url={refUrl}
                    time={refTime}
                    onTime={setRefTime}
                    playing={sync ? mainPlaying : undefined}
                    onDuration={setReferenceDuration}
                  />
                )}
              </section>
            )}
          </div>
          <div className="reference-bar">
            <label>
              <Film size={15} />
              <select
                aria-label="Compare with a reference video"
                value={refId}
                onChange={(e) => {
                  setRefId(e.target.value);
                  setSync(false);
                }}
              >
                <option value="">Compare with a reference</option>
                {sessions
                  .filter((s) => s.id !== session?.id)
                  .map((s) => (
                    <option value={s.id} key={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </label>
            {refUrl && (
              <>
                <button
                  className="text-button"
                  onClick={async () => {
                    const next = { current: time, reference: refTime };
                    try {
                      await persist({ alignment: next });
                      setPaired(next);
                      setSync(true);
                      setNotice(
                        "Starting frames paired. Main playback now drives the reference.",
                      );
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  Pair these starting frames
                </button>
                <button
                  className="text-button"
                  disabled={!refUrl}
                  onClick={() => setSync(!sync)}
                >
                  {sync ? "Unlink playback" : "Link playback"}
                </button>
              </>
            )}
          </div>
          <div
            className="measurement-tabs"
            role="tablist"
            aria-label="Analysis panels"
          >
            <button
              role="tab"
              aria-selected={tab === "movement"}
              onClick={() => {
                setTab("movement");
                setSelectedMetric("");
              }}
            >
              Movement
            </button>
            <button
              role="tab"
              aria-selected={tab === "metrics"}
              onClick={() => setTab("metrics")}
            >
              Tool metrics
            </button>
            <span className="small muted">
              {calibrated
                ? "Calibrated · approximate 2D"
                : "Set scale for measurements"}
            </span>
          </div>
          {tab === "movement" ? (
            <>
              <div className="movement-inspector">
                <div>
                  <label className="joint-select">
                    Body point
                    <select
                      aria-label="Selected body point"
                      value={joint}
                      onChange={(e) => {
                        setJoint(e.target.value as Joint);
                        setSelectedMetric("");
                      }}
                    >
                      {JOINTS.map((j) => (
                        <option key={j} value={j}>
                          {pretty(j)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <span className="small muted">
                    {available
                      ? `Tracking score ${(point?.confidence ?? 0).toFixed(2)}`
                      : "Point not visible in this frame"}
                  </span>
                </div>
                <dl className="live-stats">
                  <div>
                    <dt>Position x, y</dt>
                    <dd>
                      {available && calibrated
                        ? `${fmt(position[0])}, ${fmt(position[1])}`
                        : "—"}{" "}
                      <small>{calibrated ? "m" : ""}</small>
                    </dd>
                  </div>
                  <div>
                    <dt>Speed</dt>
                    <dd>
                      {calibrated && typeof velocity === "number"
                        ? fmt(velocity)
                        : "—"}{" "}
                      <small>
                        {calibrated && <MeasurementUnit unit="m/s" />}
                      </small>
                    </dd>
                  </div>
                  <div>
                    <dt>Acceleration</dt>
                    <dd>
                      {calibrated && typeof acceleration === "number"
                        ? fmt(acceleration)
                        : "—"}{" "}
                      <small>
                        {calibrated && <MeasurementUnit unit="m/s²" />}
                      </small>
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="graph-controls">
                <label>
                  Plot
                  <select
                    aria-label="Motion graph quantity"
                    value={measure}
                    onChange={(e) => {
                      setMeasure(e.target.value as typeof measure);
                      setSelectedMetric("");
                    }}
                  >
                    <option value="speed">Speed</option>
                    <option value="acceleration">Acceleration</option>
                    <option value="x">Horizontal position</option>
                    <option value="y">Height above initial feet</option>
                  </select>
                </label>
              </div>
            </>
          ) : (
            <div className="metric-cards">
              {tool.metrics.map((m) => (
                <button
                  key={m.id}
                  className={`metric-readout ${selectedMetric === m.id ? "selected" : ""}`}
                  disabled={m.scope === "summary"}
                  onClick={() => setSelectedMetric(m.id)}
                  title={m.description}
                >
                  <span>{m.name}</span>
                  <strong>
                    {needsPhysicalScale(m.unit)
                      ? "Set scale"
                      : fmt(
                          m.scope === "frame"
                            ? data.frames[m.id]?.[idx]
                            : data.summaries[m.id],
                        )}
                    <small>
                      {!needsPhysicalScale(m.unit) && (
                        <MeasurementUnit unit={unitLabel(m.unit, calibrated)} />
                      )}
                    </small>
                  </strong>
                  <small>
                    {m.scope === "summary"
                      ? "Session summary"
                      : "At this frame · plot"}
                  </small>
                  {m.target && (
                    <MetricCriterion
                      metric={m}
                      value={
                        m.scope === "frame"
                          ? data.frames[m.id]?.[idx]
                          : data.summaries[m.id]
                      }
                      calibrated={calibrated}
                    />
                  )}
                </button>
              ))}
            </div>
          )}
          {tab === "movement" || selectedMetric ? (
            needsPhysicalScale(graphUnit) ? (
              <p className="muted small">
                Set scale from your height to see this measurement.
              </p>
            ) : (
              <Chart
                times={analysis.frames.map((f) => f.time)}
                values={values}
                time={time}
                onTime={setCurrentTime}
                label={
                  selectedMetric
                    ? (graphMetric?.name ?? "Metric")
                    : `${pretty(joint)} · ${pretty(measure)}`
                }
                unit={unitLabel(graphUnit, calibrated)}
              />
            )
          ) : (
            <p className="muted small metric-hint">
              Choose a frame metric to plot it over time.
            </p>
          )}
          <p className="analysis-footnote">
            {sample
              ? "Sample values are synthetic."
              : "Measurements are sampled 2D estimates."}{" "}
            Gaps indicate missing points or insufficient neighbors. The ground
            line starts at estimated initial shoe contact.
          </p>
        </main>
        {coachOpen && (
          <CoachPanel
            tool={tool}
            session={session}
            sample={sample}
            time={time}
            scale={scale}
            ground={ground}
            calibrated={calibrated}
            referenceId={refId}
            onDrillComplete={() => {}}
          />
        )}
      </div>
    </div>
  );
}
function CoachPanel({
  tool,
  session,
  sample,
  time,
  scale,
  ground,
  calibrated,
  referenceId,
  onDrillComplete,
}: {
  tool: ToolConfig;
  session?: Session;
  sample: boolean;
  time: number;
  scale: number;
  ground: number;
  calibrated: boolean;
  referenceId: string;
  onDrillComplete: () => void;
}) {
  const initial = sample
    ? "This is a synthetic movement sample, so I can show how coaching works, but cannot assess an athlete’s actual form. Try the motion controls, then upload a video for a real report."
    : `Your ${tool.sport.toLowerCase()} coach is ready. Ask about a moment or request an overall form review.`;
  const [messages, setMessages] = useState<Message[]>([
      { role: "assistant", content: initial },
    ]),
    [text, setText] = useState(""),
    [job, setJob] = useState<string | null>(null),
    [stage, setStage] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [drill, setDrill] = useState<{
      title: string;
      instructions: string;
    } | null>(
      sample
        ? {
            title:
              tool.sport.toLowerCase() === "squash"
                ? "Slow shadow swings"
                : "Controlled movement practice",
            instructions:
              tool.sport.toLowerCase() === "squash"
                ? "Example drill: 2 sets of 8 gentle shadow swings. Move comfortably and pause to notice your balance. This sample drill is not based on analyzed footage."
                : "Example drill: move slowly through a comfortable range, pause, and reset. This sample drill is not based on analyzed footage.",
          }
        : null,
    ),
    [completed, setCompleted] = useState(session?.completedDrills ?? []);
  useAgentJob(
    job,
    (result) => {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            result.reply ?? "The coach returned no explanation. Please retry.",
        },
      ]);
      if (result.drill) setDrill(result.drill);
      setJob(null);
      setBusy(false);
    },
    (e) => {
      setError(e);
      setJob(null);
      setBusy(false);
    },
  );
  useEffect(() => {
    if (!job) return;
    const t = setInterval(
      () =>
        api<AgentJob>(`/agent/jobs/${job}`)
          .then((j) => setStage(j.stage))
          .catch(() => {}),
      POLLING.agentStageMs,
    );
    return () => clearInterval(t);
  }, [job]);
  async function send(value = text) {
    if (!value.trim() || busy) return;
    setText("");
    const next = [...messages, { role: "user" as const, content: value }];
    setMessages(next);
    setError("");
    if (sample) {
      setMessages([
        ...next,
        {
          role: "assistant",
          content:
            "In this synthetic example, clicking a joint reveals its position, speed, and acceleration. The elbow metric comes from the shoulder–elbow–wrist angle. A real coaching answer uses your uploaded frames and measured values; this sample cannot establish good or bad form.",
        },
      ]);
      return;
    }
    setBusy(true);
    try {
      const result = await post<{ id: string }>("/agent/coach", {
        sessionId: session!.id,
        tool,
        messages: next,
        selectedTime: time,
        ground,
        calibration: calibrated ? { metersPerPixel: scale, ground } : undefined,
        referenceId: referenceId || undefined,
      });
      setJob(result.id);
      setStage("Preparing video evidence");
    } catch (e) {
      setBusy(false);
      setError((e as Error).message);
    }
  }
  async function complete() {
    if (!drill) return;
    const next = completed.includes(drill.title)
      ? completed.filter((s) => s !== drill.title)
      : [...completed, drill.title];
    try {
      if (session)
        await api(`/api/sessions/${session.id}`, {
          method: "PATCH",
          body: JSON.stringify({ completedDrills: next }),
        });
      setCompleted(next);
      onDrillComplete();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <aside className="coach-panel">
      <div className="coach-heading">
        <div>
          <h2>Your coach</h2>
          <span className="small muted">
            {tool.sport} · one useful next step
          </span>
        </div>
      </div>
      <details className="rubric">
        <summary>What we’re working towards</summary>
        <p>{tool.rubric}</p>
      </details>
      <div className="coach-conversation" aria-live="polite">
        {messages.map((m, i) => (
          <div className={`coach-message ${m.role}`} key={i}>
            <span className="small muted">
              {m.role === "assistant" ? "Coach" : "You"}
            </span>
            <p>{m.content}</p>
          </div>
        ))}
        {busy && (
          <p role="status" className="small muted">
            <LoaderCircle size={14} className="spin inline" />
            {stage || "Reviewing your movement…"}
          </p>
        )}
      </div>
      {drill && (
        <section className="drill">
          <div className="section-heading">
            <h3>{drill.title}</h3>
            <Target size={17} />
          </div>
          <p>{drill.instructions}</p>
          <button
            className={`button ${completed.includes(drill.title) ? "secondary" : ""}`}
            onClick={complete}
          >
            {completed.includes(drill.title) ? (
              <Check size={15} />
            ) : (
              <Plus size={15} />
            )}{" "}
            {completed.includes(drill.title)
              ? "Completed · undo"
              : "Mark complete"}
          </button>
          <span className="small muted">
            {completed.length} {completed.length === 1 ? "drill" : "drills"}{" "}
            completed this session
          </span>
        </section>
      )}
      {error && <ErrorNote message={error} onClose={() => setError("")} />}
      <div className="coach-suggestions">
        <button
          disabled={busy}
          onClick={() =>
            send(
              "Review my overall form and suggest one prioritized focus and a practical drill.",
            )
          }
        >
          Review my form
        </button>
        <button
          disabled={busy}
          onClick={() =>
            send(
              `What can you tell me about my form around ${time.toFixed(2)} seconds?`,
            )
          }
        >
          Ask about {time.toFixed(2)}s
        </button>
      </div>
      <PromptBar
        value={text}
        onChange={setText}
        onSend={() => {
          void send();
        }}
        label="Question for the coach"
        placeholder="Ask your coach…"
        sendLabel="Send coach question"
        disabled={busy}
      />
      <p className="small muted coach-context">
        Uses your rubric, sampled frames, measurements, and athlete history.
      </p>
    </aside>
  );
}

function MetricCriterion({
  metric,
  value,
  calibrated,
}: {
  metric: ToolConfig["metrics"][number];
  value: number | null | undefined;
  calibrated: boolean;
}) {
  const target = metricTarget(metric, calibrated);
  if (!target) return <small>Calibrate to check the configured target.</small>;
  if (value === null || value === undefined)
    return <small>Target check unavailable at this sample.</small>;
  const within =
    (target.min === undefined || value >= target.min) &&
    (target.max === undefined || value <= target.max);
  return (
    <small>
      {within ? "Within configured range" : "Outside configured range"} ·{" "}
      {target.message}
    </small>
  );
}
