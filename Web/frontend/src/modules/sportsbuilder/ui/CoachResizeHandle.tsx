import { useRef } from "react";
import { MIN_COACH_WIDTH } from "../hooks/useCoachWidth";

/** Expands the right-hand coach with pointer dragging or the arrow keys. */
export function CoachResizeHandle({
  width,
  maximum,
  onResize,
}: {
  width: number;
  maximum: number;
  onResize: (width: number) => void;
}) {
  const start = useRef<{ x: number; width: number } | null>(null);
  return (
    <div
      className="coach-resize-handle"
      role="separator"
      tabIndex={0}
      aria-label="Resize coach panel"
      aria-orientation="vertical"
      aria-controls="coach-panel"
      aria-valuemin={MIN_COACH_WIDTH}
      aria-valuemax={maximum}
      aria-valuenow={width}
      aria-valuetext={`${width} pixels wide`}
      title="Drag left to widen coach, or use Left and Right arrow keys"
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.focus();
        start.current = { x: event.clientX, width };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (start.current) {
          onResize(start.current.width + start.current.x - event.clientX);
        }
      }}
      onPointerUp={(event) => {
        start.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      onPointerCancel={() => {
        start.current = null;
      }}
      onLostPointerCapture={() => {
        start.current = null;
      }}
      onKeyDown={(event) => {
        const next =
          event.key === "ArrowLeft"
            ? width + 24
            : event.key === "ArrowRight"
              ? width - 24
              : event.key === "Home"
                ? MIN_COACH_WIDTH
                : event.key === "End"
                  ? maximum
                  : null;
        if (next === null) return;
        event.preventDefault();
        onResize(next);
      }}
    >
      <span aria-hidden="true" />
    </div>
  );
}
