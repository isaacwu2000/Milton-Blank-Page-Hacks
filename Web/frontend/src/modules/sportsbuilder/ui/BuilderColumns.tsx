import {
  Children,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

const MIN_WIDTH = 240;
const KEY = "sportsbuilder.builder.rail-width";

/** Keeps the summary compact while reserving space for the conversation. */
export function BuilderColumns({ children }: { children: ReactNode }) {
  const container = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; width: number } | null>(null);
  const [available, setAvailable] = useState(800);
  const [preferred, setPreferred] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(KEY));
      if (Number.isFinite(saved) && saved >= MIN_WIDTH) return saved;
    } catch {
      /* Resizing remains available without storage. */
    }
    return 280;
  });
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const measure = () => setAvailable(element.getBoundingClientRect().width);
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const maximum = Math.max(MIN_WIDTH, Math.min(560, available - 400));
  const width = Math.max(MIN_WIDTH, Math.min(preferred, maximum));
  function resize(next: number) {
    const bounded = Math.round(Math.max(MIN_WIDTH, Math.min(next, maximum)));
    setPreferred(bounded);
    try {
      localStorage.setItem(KEY, String(bounded));
    } catch {
      /* Session-only preference. */
    }
  }
  const panels = Children.toArray(children);
  return (
    <div
      ref={container}
      className="builder-columns builder-columns-resizable"
      style={{ "--builder-rail-width": `${width}px` } as CSSProperties}
    >
      {panels[0]}
      <div
        role="separator"
        tabIndex={0}
        className="builder-resize-handle"
        aria-label="Resize builder summary"
        aria-orientation="vertical"
        aria-valuemin={MIN_WIDTH}
        aria-valuemax={maximum}
        aria-valuenow={width}
        aria-valuetext={`${width} pixels wide`}
        title="Drag to resize summary, or use Left and Right arrow keys"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.focus();
          drag.current = { x: event.clientX, width };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (drag.current)
            resize(drag.current.width + drag.current.x - event.clientX);
        }}
        onPointerUp={(event) => {
          drag.current = null;
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onLostPointerCapture={() => {
          drag.current = null;
        }}
        onKeyDown={(event) => {
          const next =
            event.key === "ArrowLeft"
              ? width + 24
              : event.key === "ArrowRight"
                ? width - 24
                : event.key === "Home"
                  ? MIN_WIDTH
                  : event.key === "End"
                    ? maximum
                    : null;
          if (next === null) return;
          event.preventDefault();
          resize(next);
        }}
      >
        <span aria-hidden="true" />
      </div>
      {panels.slice(1)}
    </div>
  );
}
