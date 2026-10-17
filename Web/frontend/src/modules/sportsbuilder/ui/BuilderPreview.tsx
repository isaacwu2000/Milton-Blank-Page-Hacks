import { useEffect, useMemo, useState } from "react";
import {
  calculate,
  type Joint,
  type ToolConfig,
  unitLabel,
} from "../../../../../shared";
import { MeasurementUnit } from "../../../components";
import { SAMPLE } from "../config";
import { fmt } from "../runtime/format";
import { Chart, Player } from "./Player";

/** Interactive sample uses the same player and trusted calculations as recording analysis. */
export function BuilderPreview({ tool }: { tool: ToolConfig }) {
  const [time, setTime] = useState(0);
  const [joint, setJoint] = useState<Joint>(tool.focusJoint);
  const [selected, setSelected] = useState("");
  useEffect(() => setJoint(tool.focusJoint), [tool.focusJoint]);
  const data = useMemo(() => calculate(tool, SAMPLE), [tool]);
  const frame = Math.min(
    SAMPLE.frames.length - 1,
    Math.round(time / SAMPLE.interval),
  );
  const metric =
    tool.metrics.find(
      (item) => item.id === selected && item.scope === "frame",
    ) ?? tool.metrics.find((item) => item.scope === "frame");
  const physical = (unit: string) =>
    ["length", "speed", "acceleration"].includes(unit);
  return (
    <div className="coach-preview-content">
      <header>
        <h2>{tool.name}</h2>
        <p className="muted">{tool.description}</p>
        <p className="small muted">
          {tool.sport} · {tool.audience}
        </p>
      </header>
      <p className="preview-disclosure">
        Sample motion · Explore the player and metrics. This is not an analysis
        of your footage.
      </p>
      <Player
        analysis={SAMPLE}
        time={time}
        onTime={setTime}
        joint={joint}
        onJoint={setJoint}
        ground={SAMPLE.ground}
        requireCalibration
      />
      <div className="metric-cards">
        {tool.metrics.filter((item) => !physical(item.unit)).map((item) => (
          <button
            type="button"
            className="metric-readout"
            key={item.id}
            disabled={item.scope === "summary" || physical(item.unit)}
            aria-pressed={
              item.scope === "frame" ? item.id === metric?.id : undefined
            }
            onClick={() => setSelected(item.id)}
          >
            <span>{item.name}</span>
            <strong>
              {physical(item.unit)
                ? "Needs scale"
                : fmt(
                    item.scope === "frame"
                      ? data.frames[item.id]?.[frame]
                      : data.summaries[item.id],
                  )}
              {!physical(item.unit) && (
                <small>
                  <MeasurementUnit unit={unitLabel(item.unit, false)} />
                </small>
              )}
            </strong>
            <small>
              {item.scope === "summary"
                ? "Across this sample"
                : "At the selected time"}
            </small>
          </button>
        ))}
      </div>
      {metric && !physical(metric.unit) && (
        <Chart
          times={SAMPLE.frames.map((item) => item.time)}
          values={data.frames[metric.id]}
          time={time}
          onTime={setTime}
          label={metric.name}
          unit={unitLabel(metric.unit, false)}
        />
      )}
      {tool.metrics.some((item) => physical(item.unit)) && (
        <p className="small muted">
          Distance, speed and acceleration need a reliable height scale from a
          full-body recording.
        </p>
      )}
      <details className="preview-rubric">
        <summary>Coaching approach & assumptions</summary>
        <p>{tool.rubric}</p>
        <p className="muted">{tool.coachPrompt}</p>
      </details>
    </div>
  );
}
