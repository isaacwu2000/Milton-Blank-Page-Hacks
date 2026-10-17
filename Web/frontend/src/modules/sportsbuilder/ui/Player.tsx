import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Play, Pause, ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  EDGES,
  JOINTS,
  pretty,
  jointMeasurement,
  unitLabel,
  type Point,
  type Analysis,
  type Joint,
} from "../../../../../shared";
import {
  IconButton,
  MeasurementUnit,
  Math as AxisMath,
} from "../../../components";
export function Player({
  analysis,
  url,
  time,
  onTime,
  joint,
  onJoint,
  ground,
  onCanvasClick,
  points = [],
  compact = false,
  videoRef: externalRef,
  onPlayingChange,
  linkedPlaying,
  metersPerPixel = 1,
  calibrated = false,
  requireCalibration = false,
}: {
  analysis: Analysis;
  url?: string;
  time: number;
  onTime: (t: number) => void;
  joint: Joint;
  onJoint: (j: Joint) => void;
  ground: number;
  onCanvasClick?: (p: [number, number]) => void;
  points?: [number, number][];
  compact?: boolean;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  onPlayingChange?: (playing: boolean) => void;
  linkedPlaying?: boolean;
  metersPerPixel?: number;
  calibrated?: boolean;
  requireCalibration?: boolean;
}) {
  const ownRef = useRef<HTMLVideoElement>(null),
    videoRef = externalRef ?? ownRef;
  const [playing, setPlaying] = useState(false),
    [playbackError, setPlaybackError] = useState(""),
    [inspected, setInspected] = useState(false);
  const onTimeRef = useRef(onTime),
    playingChangeRef = useRef(onPlayingChange),
    lastReported = useRef<number | null>(null),
    timeRef = useRef(time);
  onTimeRef.current = onTime;
  playingChangeRef.current = onPlayingChange;
  timeRef.current = time;
  const frame = analysis.frames.reduce(
    (best, f) =>
      Math.abs(f.time - time) < Math.abs(best.time - time) ? f : best,
    analysis.frames[0],
  );
  const markerId = useId().replaceAll(":", "");
  const selectedPoint = frame?.joints[joint];
  const vectorScale = calibrated ? metersPerPixel : 1;
  // Keep each derivative's scale stable across the clip so arrow length reflects changing magnitude.
  const clipVectorFactors = useMemo(() => {
    let velocityMax = 0,
      accelerationMax = 0;
    for (const sample of analysis.frames) {
      const velocity = jointMeasurement(sample.joints[joint], "speed");
      const acceleration = jointMeasurement(
        sample.joints[joint],
        "acceleration",
      );
      if (typeof velocity === "number")
        velocityMax = Math.max(velocityMax, velocity);
      if (typeof acceleration === "number")
        accelerationMax = Math.max(accelerationMax, acceleration);
    }
    const maxLength = Math.min(analysis.width, analysis.height) * 0.2;
    return {
      velocity: velocityMax ? Math.min(0.1, maxLength / velocityMax) : 0.1,
      acceleration: accelerationMax
        ? Math.min(0.01, maxLength / accelerationMax)
        : 0.01,
    };
  }, [analysis, joint]);
  const vectors = (["velocity", "acceleration"] as const).map((kind) => {
    const horizontal = kind === "velocity" ? "vx" : "ax";
    const vertical = kind === "velocity" ? "vy" : "ay";
    const vx = jointMeasurement(selectedPoint, horizontal, vectorScale, ground);
    const vy = jointMeasurement(selectedPoint, vertical, vectorScale, ground);
    const geometry =
      selectedPoint && typeof vx === "number" && typeof vy === "number"
        ? fitVector(
            selectedPoint,
            horizontal,
            vertical,
            analysis.width,
            analysis.height,
            clipVectorFactors[kind],
          )
        : null;
    return {
      kind,
      label: kind === "velocity" ? "Speed" : "Acceleration",
      value: jointMeasurement(
        selectedPoint,
        kind === "velocity" ? "speed" : "acceleration",
        vectorScale,
        ground,
      ),
      geometry,
      unit: unitLabel(
        kind === "velocity" ? "speed" : "acceleration",
        calibrated,
      ),
    };
  });
  const sample = analysis.source === "sample";
  const marking = Boolean(onCanvasClick);
  const reportTime = (value: number) => {
    lastReported.current = value;
    onTimeRef.current(value);
  };
  useEffect(() => {
    playingChangeRef.current?.(playing);
  }, [playing]);
  // Both calibration marks must refer to the same paused image.
  useEffect(() => {
    if (!marking) return;
    const video = videoRef.current;
    if (!sample && video) {
      if (!video.paused) video.pause();
      if (video.readyState > 0 && Number.isFinite(video.currentTime))
        reportTime(video.currentTime);
    }
    setPlaying(false);
  }, [marking, sample, videoRef]);
  useEffect(() => {
    if (!playing) return;
    let request = 0,
      previous = performance.now();
    const tick = (now: number) => {
      if (sample) {
        const next = timeRef.current + (now - previous) / 1000;
        previous = now;
        reportTime(next >= analysis.duration ? 0 : next);
      } else {
        const video = videoRef.current;
        if (video && !video.paused && !video.seeking)
          reportTime(video.currentTime);
      }
      request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [sample, playing, analysis.duration, videoRef]);
  useEffect(() => {
    const video = videoRef.current;
    if (!video || video.readyState === 0) return;
    // Ignore our own playback updates. A linked player corrects drift, rather than seeking every paint.
    if (
      lastReported.current !== null &&
      Math.abs(lastReported.current - time) < 0.002
    )
      return;
    const tolerance =
      !video.paused && linkedPlaying !== undefined ? 0.16 : 0.005;
    if (Math.abs(video.currentTime - time) > tolerance)
      video.currentTime = time;
  }, [time, videoRef, linkedPlaying]);
  useEffect(() => {
    setPlaying(false);
    setInspected(false);
    setPlaybackError("");
    lastReported.current = null;
  }, [analysis.id]);
  useEffect(() => {
    setPlaybackError("");
  }, [url]);
  useEffect(() => {
    if (linkedPlaying === undefined) return;
    if (sample) {
      setPlaying(linkedPlaying);
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    let active = true;
    if (linkedPlaying)
      video.play().catch(() => {
        if (active)
          setPlaybackError(
            "Playback could not start. Press Play, or export this clip as an H.264 MP4.",
          );
      });
    else video.pause();
    return () => {
      active = false;
    };
  }, [linkedPlaying, sample, url, videoRef]);
  async function toggle() {
    if (marking) return;
    setPlaybackError("");
    if (sample) {
      setPlaying((current) => !current);
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    if (!video.paused) video.pause();
    else {
      if (video.ended) video.currentTime = 0;
      try {
        await video.play();
      } catch {
        setPlaybackError(
          "Playback could not start. Try again, or export this clip as an H.264 MP4.",
        );
      }
    }
  }
  const step = (delta: number) => {
    setPlaying(false);
    videoRef.current?.pause();
    onTime(Math.max(0, Math.min(analysis.duration, time + delta)));
  };
  return (
    <div className="player">
      <div
        className="video-stage"
        style={{
          aspectRatio: `${analysis.width}/${analysis.height}`,
          width: "100%",
          maxWidth: `calc(58vh * ${analysis.width / analysis.height})`,
          marginInline: "auto",
        }}
      >
        {sample ? (
          <svg viewBox="0 0 800 540" className="court" aria-hidden="true">
            <rect width="800" height="540" fill="#e9eeeb" />
            <path d="M0 0H800V385L660 300H140L0 385Z" fill="#f5f7f5" />
            <path
              d="M0 385L140 300H660L800 385M140 0V300M660 0V300M0 165H800M140 300L0 540M660 300L800 540M400 300V540M70 440H730"
              stroke="#c4d1ca"
              fill="none"
              strokeWidth="2"
            />
            <path d="M0 165H800" stroke="#8caaa0" strokeWidth="3" />
            <text
              x="24"
              y="35"
              fill="#52625d"
              fontSize="14"
              fontFamily="Lexend"
            >
              Synthetic movement · sample only
            </text>
          </svg>
        ) : (
          <video
            ref={videoRef}
            src={url || undefined}
            muted={linkedPlaying !== undefined}
            playsInline
            preload="auto"
            onLoadedMetadata={(e) => {
              e.currentTarget.currentTime = Math.min(
                timeRef.current,
                Number.isFinite(e.currentTarget.duration)
                  ? e.currentTarget.duration
                  : analysis.duration,
              );
            }}
            onTimeUpdate={(e) => {
              if (e.currentTarget.paused)
                reportTime(e.currentTarget.currentTime);
            }}
            onSeeked={(e) => reportTime(e.currentTarget.currentTime)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={(e) => {
              setPlaying(false);
              reportTime(e.currentTarget.currentTime);
            }}
            onError={() => {
              setPlaying(false);
              setPlaybackError(
                "This video could not be played. The file may have expired or use an unsupported codec. Reload it, or export an H.264 MP4.",
              );
            }}
          />
        )}
        <svg
          viewBox={`0 0 ${analysis.width} ${analysis.height}`}
          className={`pose-overlay ${onCanvasClick ? "calibrating" : ""}`}
          aria-label="Body tracking overlay"
          onClick={(e) => {
            if (!onCanvasClick) return;
            const rect = e.currentTarget.getBoundingClientRect();
            onCanvasClick([
              ((e.clientX - rect.left) / rect.width) * analysis.width,
              ((e.clientY - rect.top) / rect.height) * analysis.height,
            ]);
          }}
        >
          <defs>
            {vectors.map((vector) => (
              <marker
                key={vector.kind}
                id={`${markerId}-${vector.kind}`}
                viewBox="0 0 10 10"
                refX="10"
                refY="5"
                markerUnits="userSpaceOnUse"
                markerWidth={Math.min(
                  analysis.width / 160,
                  (vector.geometry?.magnitude ?? 0) *
                    (vector.geometry?.factor ?? 0) *
                    0.32,
                )}
                markerHeight={Math.min(
                  analysis.width / 160,
                  (vector.geometry?.magnitude ?? 0) *
                    (vector.geometry?.factor ?? 0) *
                    0.32,
                )}
                orient="auto-start-reverse"
              >
                <path
                  d="M 0 0 L 10 5 L 0 10 z"
                  className={`motion-arrowhead ${vector.kind}`}
                />
              </marker>
            ))}
            <marker
              id={`${markerId}-axis`}
              viewBox="0 0 10 10"
              refX="10"
              refY="5"
              markerWidth={analysis.width / 90}
              markerHeight={analysis.width / 90}
              markerUnits="userSpaceOnUse"
              orient="auto"
            >
              <path
                d="M 1 1 L 10 5 L 1 9"
                fill="none"
                stroke="#35494d"
                strokeWidth="1.7"
              />
            </marker>
          </defs>
          <g aria-label="Coordinate axes" fill="none">
            <line
              x1="0"
              y1={ground}
              x2={analysis.width}
              y2={ground}
              stroke="white"
              strokeWidth="5"
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1="0"
              y1={analysis.height}
              x2="0"
              y2="0"
              stroke="white"
              strokeWidth="5"
              vectorEffect="non-scaling-stroke"
            />
            <line
              aria-label="Ground baseline"
              x1="0"
              y1={ground}
              x2={analysis.width}
              y2={ground}
              stroke="#35494d"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              markerEnd={`url(#${markerId}-axis)`}
            />
            <line
              aria-label="Left image edge"
              x1="0"
              y1={analysis.height}
              x2="0"
              y2="0"
              stroke="#35494d"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              markerEnd={`url(#${markerId}-axis)`}
            />
            {[0.25, 0.5, 0.75].map((f) => (
              <g key={f} stroke="#35494d" strokeWidth="1.5">
                <line
                  x1="0"
                  y1={analysis.height * f}
                  x2={analysis.width * 0.012}
                  y2={analysis.height * f}
                  vectorEffect="non-scaling-stroke"
                />
                <line
                  x1={analysis.width * f}
                  y1={Math.max(0, ground - analysis.height * 0.009)}
                  x2={analysis.width * f}
                  y2={Math.min(
                    analysis.height,
                    ground + analysis.height * 0.009,
                  )}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            ))}
          </g>
          {EDGES.map(([a, b]) => {
            const p = frame?.joints[a],
              q = frame?.joints[b];
            return p && q && p.confidence >= 0.35 && q.confidence >= 0.35 ? (
              <line
                key={a + b}
                x1={p.x}
                y1={p.y}
                x2={q.x}
                y2={q.y}
                stroke="#1a6751"
                strokeWidth={analysis.width / 220}
                strokeLinecap="round"
              />
            ) : null;
          })}
          {JOINTS.map((j) => {
            const p = frame?.joints[j];
            return p && p.confidence >= 0.35 ? (
              <g
                key={j}
                role="button"
                tabIndex={onCanvasClick ? -1 : 0}
                aria-label={`Select ${pretty(j)}`}
                aria-pressed={joint === j}
                onClick={(e) => {
                  if (!onCanvasClick) {
                    e.stopPropagation();
                    onJoint(j);
                    setInspected(true);
                  }
                }}
                onKeyDown={(e) => {
                  if (!onCanvasClick && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onJoint(j);
                    setInspected(true);
                  }
                }}
              >
                <title>{pretty(j)}</title>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={analysis.width / 35}
                  fill="transparent"
                />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={
                    analysis.width /
                    (joint === j ? (inspected ? 160 : 70) : 105)
                  }
                  fill={
                    joint === j ? (inspected ? "none" : "#14674f") : "#ffffff"
                  }
                  stroke="#14674f"
                  strokeWidth={analysis.width / 450}
                />
              </g>
            ) : null;
          })}
          {!onCanvasClick &&
            inspected &&
            vectors.map((vector) => {
              const geometry = vector.geometry;
              if (!geometry || geometry.factor <= 0 || !selectedPoint)
                return null;
              return (
                <g
                  key={vector.kind}
                  role="img"
                  aria-label={`${vector.label} direction arrow`}
                  className={`motion-vector ${vector.kind}`}
                  pointerEvents="none"
                >
                  <title>{`${pretty(joint)} ${vector.label.toLowerCase()} direction`}</title>
                  {geometry.magnitude > 0 && (
                    <line
                      x1={selectedPoint.x}
                      y1={selectedPoint.y}
                      x2={geometry.x2}
                      y2={geometry.y2}
                      strokeWidth={Math.min(
                        analysis.width / 850,
                        (geometry.magnitude * geometry.factor) / 14,
                      )}
                      markerEnd={`url(#${markerId}-${vector.kind})`}
                    />
                  )}
                </g>
              );
            })}
          {points.map(([x, y], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={analysis.width / 75}
              fill="#db8b38"
              stroke="white"
              strokeWidth="2"
            />
          ))}
          {points.length === 2 && (
            <line
              x1={points[0][0]}
              y1={points[0][1]}
              x2={points[1][0]}
              y2={points[1][1]}
              stroke="#db8b38"
              strokeWidth="3"
            />
          )}
        </svg>
        <div
          className="axis-label-chip"
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            background: "#fff",
            borderRadius: 3,
            padding: "2px 6px",
            fontSize: 12,
            color: "#4b5e60",
            pointerEvents: "none",
          }}
        >
          <AxisMath expression="x=0" label="x equals zero" />
        </div>
        <div
          className="axis-label-chip"
          style={{
            position: "absolute",
            top: `${Math.min(98, Math.max(12, (ground / analysis.height) * 100))}%`,
            right: 8,
            transform: "translateY(calc(-100% - 5px))",
            background: "#fff",
            borderRadius: 3,
            padding: "2px 6px",
            fontSize: 12,
            color: "#4b5e60",
            pointerEvents: "none",
          }}
        >
          <AxisMath expression="y=0" label="y equals zero" />
        </div>
      </div>
      {playbackError && (
        <p className="error-note" role="alert">
          {playbackError}
        </p>
      )}
      <p className="small muted">
        {frame
          ? `Selected sample: ${frame.time.toFixed(3)}s`
          : "No tracked samples"}{" "}
        · tracking every {analysis.interval}s
      </p>
      {!onCanvasClick && inspected && (
        <section
          className="joint-detail-panel"
          aria-label={`${pretty(joint)} details`}
        >
          <div className="section-heading">
            <h3>{pretty(joint)}</h3>
            <IconButton
              label="Close joint details"
              surface="transparent"
              onClick={() => setInspected(false)}
            >
              <X size={15} />
            </IconButton>
          </div>
          <div className="motion-vector-legend">
            {vectors.map((vector) => (
              <div
                key={vector.kind}
                className={`vector-equation ${vector.kind}`}
              >
                <h4>{vector.label}</h4>
                <output aria-label={vector.label}>
                  {requireCalibration && !calibrated ? (
                    "Set scale"
                  ) : typeof vector.value === "number" ? (
                    <strong>
                      {formatVectorValue(vector.value)}{" "}
                      <MeasurementUnit unit={vector.unit} />
                    </strong>
                  ) : (
                    "Unavailable"
                  )}
                </output>
              </div>
            ))}
          </div>
          {requireCalibration && !calibrated && (
            <p className="small muted">
              Set scale from your height to see measurements.
            </p>
          )}
        </section>
      )}
      {!compact && (
        <div className="player-controls">
          <IconButton
            label={playing ? "Pause video" : "Play video"}
            disabled={marking}
            onClick={toggle}
          >
            {playing ? <Pause size={17} /> : <Play size={17} />}
          </IconButton>
          <IconButton
            label="Previous sample"
            onClick={() => step(-analysis.interval)}
          >
            <ChevronLeft size={17} />
          </IconButton>
          <input
            aria-label="Video timeline"
            type="range"
            min="0"
            max={analysis.duration}
            step="0.01"
            value={time}
            onChange={(e) => onTime(Number(e.target.value))}
          />
          <IconButton
            label="Next sample"
            onClick={() => step(analysis.interval)}
          >
            <ChevronRight size={17} />
          </IconButton>
          <span className="time">
            {time.toFixed(2)} / {analysis.duration.toFixed(2)}s
          </span>
        </div>
      )}
    </div>
  );
}
/** Fit each measured vector to the image without changing its direction; expose its actual scale. */
function fitVector(
  point: Point,
  horizontal: "vx" | "ax",
  vertical: "vy" | "ay",
  width: number,
  height: number,
  baseFactor: number,
) {
  const dx = point[horizontal],
    dy = point[vertical];
  if (
    dx === null ||
    dy === null ||
    !Number.isFinite(dx) ||
    !Number.isFinite(dy)
  )
    return null;
  const magnitude = Math.hypot(dx, dy),
    margin = Math.min(width, height) * 0.035;
  const roomX =
    dx > 0
      ? (width - margin - point.x) / dx
      : dx < 0
        ? (margin - point.x) / dx
        : Infinity;
  const roomY =
    dy > 0
      ? (height - margin - point.y) / dy
      : dy < 0
        ? (margin - point.y) / dy
        : Infinity;
  const factor = Math.max(
    0,
    Math.min(
      baseFactor,
      magnitude ? (Math.min(width, height) * 0.2) / magnitude : baseFactor,
      roomX,
      roomY,
    ),
  );
  return {
    x2: point.x + dx * factor,
    y2: point.y + dy * factor,
    factor,
    magnitude,
    edgeFitted: factor < baseFactor,
  };
}
function formatVectorValue(value: number | null | [number, number]) {
  return typeof value === "number" && Number.isFinite(value)
    ? Number(value.toPrecision(3)).toString()
    : "—";
}

export function Chart({
  times,
  values,
  time,
  onTime,
  label,
  unit,
}: {
  times: number[];
  values: (number | null)[];
  time: number;
  onTime: (t: number) => void;
  label: string;
  unit: string;
}) {
  const valid = values.filter(
    (v): v is number => v !== null && Number.isFinite(v),
  );
  const low = valid.length ? Math.min(...valid) : 0,
    high = valid.length ? Math.max(...valid) : 1,
    span = high - low || 1;
  const paths: string[] = [];
  let path = "";
  values.forEach((v, i) => {
    if (v === null) {
      if (path) paths.push(path);
      path = "";
      return;
    }
    path += `${path ? "L" : "M"}${48 + (times[i] / (times.at(-1) || 1)) * 640},${155 - ((v - low) / span) * 115} `;
  });
  if (path) paths.push(path);
  return (
    <div className="chart">
      <div className="section-heading">
        <h3>{label}</h3>
        <span className="muted small">
          <MeasurementUnit unit={unit} /> · click graph to seek
        </span>
      </div>
      <svg
        role="img"
        aria-label={`${label} over time, in ${unit}`}
        viewBox="0 0 720 190"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          onTime(
            Math.max(
              0,
              Math.min(
                times.at(-1) || 1,
                ((((e.clientX - r.left) / r.width) * 720 - 48) / 640) *
                  (times.at(-1) || 1),
              ),
            ),
          );
        }}
      >
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line
              x1="48"
              x2="688"
              y1={155 - f * 115}
              y2={155 - f * 115}
              stroke="#e5eae8"
            />
            <text x="0" y={159 - f * 115} fontSize="11" fill="#69736f">
              {(low + span * f).toFixed(1)}
            </text>
          </g>
        ))}
        {paths.map((d, i) => (
          <path key={i} d={d} stroke="#176c54" strokeWidth="2.5" fill="none" />
        ))}
        <line
          x1={48 + (time / (times.at(-1) || 1)) * 640}
          x2={48 + (time / (times.at(-1) || 1)) * 640}
          y1="24"
          y2="160"
          stroke="#6b8e80"
          strokeDasharray="4 4"
        />
        <text x="48" y="184" fontSize="11" fill="#69736f">
          0s
        </text>
        <text x="661" y="184" fontSize="11" fill="#69736f">
          {(times.at(-1) || 0).toFixed(1)}s
        </text>
        {!valid.length && (
          <text x="360" y="95" textAnchor="middle" fontSize="13" fill="#69736f">
            Not enough confident samples
          </text>
        )}
      </svg>
    </div>
  );
}
