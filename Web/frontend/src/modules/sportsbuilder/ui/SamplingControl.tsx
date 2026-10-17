import { useRef, useState } from "react";
import { SAMPLING_RANGE } from "../config";
import { formatFrameRate } from "../runtime/format";
import "./SamplingControl.css";

/** Keeps sampling exact while the pointer thumb moves smoothly between valid interval steps. */
export function SamplingControl({ interval, onChange, disabled = false }: {
  interval: number;
  onChange: (interval: number) => void;
  disabled?: boolean;
}) {
  const dragging = useRef(false);
  const [dragPosition, setDragPosition] = useState<number | null>(null);
  function followPointer(input: HTMLInputElement, clientX: number) {
    const bounds = input.getBoundingClientRect();
    if (bounds.width <= 16) return;
    const position = Math.max(8, Math.min(bounds.width - 8, clientX - bounds.left));
    setDragPosition(position / bounds.width);
  }
  function finishDrag() {
    dragging.current = false;
    setDragPosition(null);
  }
  return (
      <div className="w-full max-w-[420px] text-left">
        <label htmlFor="sampling-interval" className="flex-row! justify-between gap-4!">
          <span>Frame sampling</span>
          <span>{formatFrameRate(interval)} fps</span>
        </label>
        <p id="sampling-help" className="small muted mt-1">
          One frame every {interval} {interval === 1 ? "second" : "seconds"}
        </p>
        <div className="sampling-track" data-dragging={dragPosition !== null}>
        <input
          id="sampling-interval"
          aria-label="Frame sampling rate"
          aria-valuetext={`${formatFrameRate(interval)} ${interval === 1 ? "frame" : "frames"} per second, one frame every ${interval} ${interval === 1 ? "second" : "seconds"}`}
          aria-describedby="sampling-help"
          type="range"
          dir="rtl"
          min={SAMPLING_RANGE.min}
          max={SAMPLING_RANGE.max}
          step={SAMPLING_RANGE.step}
          value={interval}
          disabled={disabled}
          className="h-8 w-full appearance-none bg-transparent! p-0! accent-(--accent-700) [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-(--neutral-light-500) [&::-webkit-slider-runnable-track]:shadow-(--shadow-inner) [&::-webkit-slider-thumb]:-mt-[5px] [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-(--accent-700) [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-(--neutral-light-500) [&::-moz-range-track]:shadow-(--shadow-inner) [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-(--accent-700)"
          onChange={(event) => onChange(Number(event.target.value))}
          onPointerDown={(event) => {
            if (event.button !== 0 || disabled) return;
            dragging.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            followPointer(event.currentTarget, event.clientX);
          }}
          onPointerMove={(event) => {
            if (dragging.current) followPointer(event.currentTarget, event.clientX);
          }}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          onLostPointerCapture={finishDrag}
          onBlur={finishDrag}
        />
        {dragPosition !== null && (
          <span className="sampling-drag-thumb" aria-hidden="true" style={{ left: `${dragPosition * 100}%` }} />
        )}
        </div>
        <div className="flex justify-between gap-6 text-[10px] text-(--neutral-dark-500)">
          <span>
            {formatFrameRate(SAMPLING_RANGE.max)} fps
            <span className="mt-1 block">Fewer frames · faster processing</span>
          </span>
          <span className="text-right">
            {formatFrameRate(SAMPLING_RANGE.min)} fps
            <span className="mt-1 block">More frames · longer processing</span>
          </span>
        </div>
      </div>
  );
}
