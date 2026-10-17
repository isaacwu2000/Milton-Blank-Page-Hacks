import type { CSSProperties } from "react";
import { useCoachWidth } from "../hooks/useCoachWidth";
import { CoachResizeHandle } from "./CoachResizeHandle";
import { POLLING } from "../config";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Clipboard,
  Film,
  LoaderCircle,
  MoreHorizontal,
  Ruler,
  MessageCircle,
  Trash2,
  X,
} from "lucide-react";
import {
  JOINTS,
  pretty,
  type Analysis,
  type Joint,
  type Message,
  type CoachFeedback as Feedback,
  type CoachDrill,
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
import { useConversationScroll } from "../hooks/useConversationScroll";
import { Logo, ErrorNote } from "./common";
import { fmt } from "../runtime/format";
import { Player, Chart } from "./Player";
import { CoachExercises } from "./CoachExercises";
import { CoachFeedback } from "./CoachFeedback";

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
  const [closing, setClosing] = useState(false);
  const [session, setSession] = useState<Session | null>(null),
    [analysis, setAnalysis] = useState<Analysis | null>(null),
    [url, setUrl] = useState(""),
    [error, setError] = useState("");
  const load = useCallback(async (signal?: AbortSignal) => {
    const s = await api<Session>(`/api/sessions/${sessionId}`, { signal });
    if (signal?.aborted) return s;
    setSession(s);
    if (s.status === "complete") {
      const analysis = await api<Analysis>(`/api/sessions/${sessionId}/analysis`, { signal });
      if (!signal?.aborted) setAnalysis(analysis);
    }
    return s;
  }, [sessionId]);
  useEffect(() => {
    const controller = new AbortController();
    let stopped = false,
      timer: ReturnType<typeof setTimeout>;
    setAnalysis(null);
    setError("");
    const poll = async () => {
      try {
        const s = await load(controller.signal);
        if (!stopped && (s.status === "processing" || s.status === "queued"))
          timer = setTimeout(poll, POLLING.videoStatusMs);
      } catch (e) {
        if (!stopped) setError((e as Error).message);
      }
    };
    poll();
    api<{ url: string }>(`/api/sessions/${sessionId}/video`, { signal: controller.signal })
      .then((v) => {
        if (!stopped) setUrl(v.url);
      })
      .catch((e) => { if (!stopped) setError(e.message); });
    const renew = setInterval(
      () =>
        api<{ url: string }>(`/api/sessions/${sessionId}/video`, { signal: controller.signal })
          .then((v) => {
            if (!stopped) setUrl(v.url);
          })
          .catch(() => {}),
      POLLING.signedUrlRefreshMs,
    );
    return () => {
      stopped = true;
      controller.abort();
      clearTimeout(timer);
      clearInterval(renew);
    };
  }, [sessionId, load, pollGeneration]);
  const knownSession = session ?? data.sessions.find((value) => value.id === sessionId);
  const processing = knownSession && ["queued", "processing"].includes(knownSession.status);
  /** Stops actual tracking if needed, then returns without deleting stored video or analysis. */
  async function close() {
    if (closing) return;
    setClosing(true);
    setError("");
    try {
      if (processing || !knownSession) {
        await post(`/api/sessions/${sessionId}/cancel`, {});
      }
      onBack();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setClosing(false);
    }
  }
  const tool = data.tools.find((t) => t.id === session?.toolId);
  async function start() {
    setError("");
    try {
      setSession(await post<Session>(`/api/sessions/${sessionId}/analyze`, {}));
      setAnalysis(null);
      setPollGeneration((g) => g + 1);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  if (analysis && session && !tool && !closing)
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
  if (analysis && session && tool && !closing)
    return (
      <Workspace
        analysis={analysis}
        tool={tool}
        session={session}
        url={url}
        profiles={data.profiles}
        sessions={data.sessions}
        onReanalyze={start}
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
        <IconButton
          label={processing || !knownSession ? "Cancel analysis" : "Close video loading"}
          surface="transparent"
          disabled={closing}
          aria-busy={closing}
          onClick={() => { void close(); }}
        >
          {closing ? <LoaderCircle size={18} className="spin" /> : <X size={18} />}
        </IconButton>
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
        {closing && <p role="status">Cancelling analysis… Your video stays saved.</p>}
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
  onReanalyze,
  profiles,
}: {
  analysis: Analysis;
  tool: ToolConfig;
  session?: Session;
  url?: string;
  sample?: boolean;
  onBack: () => void;
  onReanalyze?: () => Promise<void>;
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
    [notice, setNotice] = useState(""),
    [copied, setCopied] = useState(false);
  const athlete =
    profiles.find((profile) => profile.id === session?.profileId) ??
    (sample
      ? profiles.find((profile) => profile.name === "Athlete")
      : undefined);
  const athleteHeight = athlete?.heightCm;
  const coachWidth = useCoachWidth();
  const needsScale = !calibrated;
  const needsPhysicalScale = (unit: string) =>
    needsScale && ["length", "speed", "acceleration"].includes(unit);
  function startHeightCalibration() {
    setCalibrationMode("height");
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
  const missingReading = !calibrated
    ? "Set scale"
    : !available
      ? "Not tracked"
      : "Need nearby frames";
  // Seek within this joint's measured samples; never borrow another frame's reading.
  const measuredFrame =
    calibrated && typeof acceleration !== "number"
      ? analysis.frames.reduce<number | null>((best, candidate, i) => {
          if (
            typeof jointMeasurement(candidate.joints[joint], "acceleration") !==
            "number"
          )
            return best;
          return best === null ||
            Math.abs(candidate.time - time) <
              Math.abs(analysis.frames[best].time - time)
            ? i
            : best;
        }, null)
      : null;
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
    },
    [calibrationMode, time],
  );
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
  /** Save a manual correction as soon as both marks identify the same paused frame. */
  async function saveHeightCalibration(
    head: [number, number],
    sole: [number, number],
    frameTime: number,
  ) {
    if (!athleteHeight) return;
    try {
      const converted = scaleFromAthleteHeight(
        athleteHeight,
        head,
        sole,
        analysis.width,
        analysis.height,
      );
      const calibration: NonNullable<Session["calibration"]> = {
        ...converted,
        ground,
        source: "athlete_height_manual",
        heightCm: athleteHeight,
        frameTime,
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
      if (
        calibrationMode === "height" &&
        points.length === 1 &&
        calibrationFrameTime !== null
      )
        void saveHeightCalibration(points[0], p, calibrationFrameTime);
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
            <MessageCircle size={18} />
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
      <div
        className={`analysis-layout ${coachOpen ? "" : "coach-hidden"}`}
        style={{ "--coach-width": `${coachWidth.width}px` } as CSSProperties}
      >
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
                  ? `We couldn’t estimate a reliable scale from this clip. Keep your head and feet visible so we can use your ${athleteHeight} cm height and joint angles automatically.`
                  : "Add your height to the athlete profile to measure movement in meters."}
              </span>
              <button
                className="button secondary"
                onClick={() => {
                  setSettings(true);
                  if (athleteHeight) startHeightCalibration();
                  else {
                    setCalibrationMode("distance");
                    setCalibrationFrameTime(null);
                    setPoints([]);
                  }
                }}
              >
                Set measurement scale
              </button>
              {onReanalyze && athleteHeight && (
                <button
                  className="button secondary"
                  onClick={() => void onReanalyze()}
                >
                  Recalculate automatically
                </button>
              )}
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
                  Adjust height scale manually
                </button>
                <button
                  className="button secondary"
                  onClick={() => {
                    setCalibrationMode("distance");
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
                <span>Using your {athleteHeight} cm height</span>
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
            onCanvasClick={calibrationMode === "none" ? undefined : canvasClick}
            points={points}
          />
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
                ? calibrationMetadata?.source === "athlete_height_auto"
                  ? "Automatic height scale · approximate 2D"
                  : "Calibrated · approximate 2D"
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
                        : missingReading}{" "}
                      <small>{available && calibrated ? "m" : ""}</small>
                    </dd>
                  </div>
                  <div>
                    <dt>Speed</dt>
                    <dd>
                      {calibrated && typeof velocity === "number"
                        ? fmt(velocity)
                        : missingReading}{" "}
                      <small>
                        {calibrated && typeof velocity === "number" && (
                          <MeasurementUnit unit="m/s" />
                        )}
                      </small>
                    </dd>
                  </div>
                  <div>
                    <dt>Acceleration</dt>
                    <dd>
                      {calibrated && typeof acceleration === "number"
                        ? fmt(acceleration)
                        : missingReading}{" "}
                      <small>
                        {calibrated && typeof acceleration === "number" && (
                          <MeasurementUnit unit="m/s²" />
                        )}
                      </small>
                    </dd>
                  </div>
                </dl>
              </div>
              {calibrated && typeof acceleration !== "number" && (
                <div className="notice">
                  <span>
                    {available
                      ? "Acceleration needs five consecutive tracked frames. The clip edges and tracking gaps may have no reading."
                      : "This body point is not tracked clearly at this time. Choose another point or frame."}
                  </span>
                  {measuredFrame !== null && (
                    <button
                      className="button secondary"
                      onClick={() =>
                        setCurrentTime(analysis.frames[measuredFrame].time)
                      }
                    >
                      Go to measured frame
                    </button>
                  )}
                </div>
              )}
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
                A clear full-body view is needed to calculate this measurement
                automatically.
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
          <CoachResizeHandle
            width={coachWidth.width}
            maximum={coachWidth.maximum}
            onResize={coachWidth.resize}
          />
        )}
        {coachOpen && (
          <CoachPanel
            tool={tool}
            session={session}
            sample={sample}
            time={time}
            scale={scale}
            ground={ground}
            calibrated={calibrated}
            referenceId={tool.referenceId}
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
}: {
  tool: ToolConfig;
  session?: Session;
  sample: boolean;
  time: number;
  scale: number;
  ground: number;
  calibrated: boolean;
  referenceId?: string;
}) {
  const initial = sample
    ? "This is a synthetic movement sample, so I can show how coaching works, but cannot assess an athlete’s actual form. Try the motion controls, then upload a video for a real report."
    : `Your ${tool.sport.toLowerCase()} coach is ready. Ask about a moment or request an overall form review.`;
  const [messages, setMessages] = useState<(Message & { feedback?: Feedback })[]>([
      { role: "assistant", content: initial },
    ]),
    [text, setText] = useState(""),
    [job, setJob] = useState<string | null>(null),
    [stage, setStage] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [drill, setDrill] = useState<CoachDrill | null>(
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
            steps: [
              "Move slowly through a comfortable range.",
              "Pause and notice your balance.",
              "Return to your ready position before repeating.",
            ],
          }
        : null,
    );
  const { conversationRef, latestRef } = useConversationScroll(messages, busy);
  const pendingQuestion = useRef<{ messages: Message[]; text: string } | null>(null);
  /** Restores the unanswered question after either request or background-review failure. */
  function rejectQuestion(message: string) {
    if (pendingQuestion.current) {
      setMessages(pendingQuestion.current.messages);
      setText(pendingQuestion.current.text);
      pendingQuestion.current = null;
    }
    setError(message);
    setJob(null);
    setBusy(false);
  }
  useAgentJob(
    job,
    (result) => {
      pendingQuestion.current = null;
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            result.reply ?? "The coach returned no explanation. Please retry.",
          feedback: result.feedback,
        },
      ]);
      if (result.drill) setDrill(result.drill);
      setJob(null);
      setBusy(false);
    },
    rejectQuestion,
    (result) => setStage(result.stage),
  );
  useEffect(() => {
    if (!busy || job) return;
    const deadline = setTimeout(() => {
      rejectQuestion("The review could not start. Please retry your message.");
    }, POLLING.agentStartTimeoutMs);
    return () => clearTimeout(deadline);
  }, [busy, job]);
  /** Stops waiting immediately and asks the service to abort the known review. */
  function stopReview() {
    rejectQuestion("");
    if (job) cancelReview(job);
  }
  /** Aborts service work; a failed cancellation never discards the restored question. */
  function cancelReview(id: string) {
    void post(`/agent/jobs/${id}/cancel`, {}).catch(() => {
      if (!pendingQuestion.current)
        setError("Your question is ready to retry, but the previous review could not be stopped.");
    });
  }
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
    const pending = { messages, text: value };
    pendingQuestion.current = pending;
    setStage("Starting your review…");
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
      if (pendingQuestion.current !== pending) {
        cancelReview(result.id);
        return;
      }
      setJob(result.id);
      setStage("Preparing video evidence");
    } catch (e) {
      if (pendingQuestion.current === pending)
        rejectQuestion((e as Error).message);
    }
  }
  return (
    <aside className="coach-panel" id="coach-panel">
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
      <div ref={conversationRef} className="coach-conversation" aria-live="polite">
        {messages.map((m, i) => (
          <div className={`coach-message ${m.role}`} key={i}>
            <span className="small muted">
              {m.role === "assistant" ? "Coach" : "You"}
            </span>
            <p>{m.content}</p>
            {m.feedback && <CoachFeedback feedback={m.feedback} />}
          </div>
        ))}
        <div ref={latestRef} />
        {drill && <CoachExercises drill={drill} session={session} />}
      </div>
      {busy && (
        <div className="coach-review-progress">
          <p role="status" className="small muted">
            <LoaderCircle size={14} className="spin inline" aria-hidden="true" />
            {stage || "Starting your review…"}
          </p>
          <button type="button" className="button secondary" onClick={stopReview}>
            Stop review
          </button>
        </div>
      )}
      {error && <ErrorNote message={error} onClose={() => setError("")} />}
      <div className="coach-suggestions">
        <button
          disabled={busy}
          onClick={() =>
            send(
              "Review my overall form. Tell me clearly what is going well and what I should improve, with evidence. Separately suggest an exercise with a checklist of practice actions.",
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
