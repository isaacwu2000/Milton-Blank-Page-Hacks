import { useEffect, useRef, useState } from "react";
/** Reference playback works before pose processing; alignment uses video time, never model output. */
export function ReferenceVideo({
  url,
  time,
  onTime,
  playing,
  onDuration,
}: {
  url: string;
  time: number;
  onTime: (t: number) => void;
  playing?: boolean;
  onDuration: (d: number) => void;
}) {
  const video = useRef<HTMLVideoElement>(null),
    clock = useRef(time),
    [error, setError] = useState("");
  clock.current = time;
  useEffect(() => {
    const v = video.current;
    if (
      v &&
      v.readyState &&
      Math.abs(v.currentTime - time) > (playing ? 0.16 : 0.005)
    )
      v.currentTime = time;
  }, [time, playing]);
  useEffect(() => {
    const v = video.current;
    if (!v || playing === undefined) return;
    let active = true;
    if (playing)
      v.play().catch(() => {
        if (active)
          setError(
            "Press play on the reference, or export it as an H.264 MP4.",
          );
      });
    else v.pause();
    return () => {
      active = false;
    };
  }, [playing, url]);
  return (
    <>
      <video
        ref={video}
        src={url}
        controls
        playsInline
        muted={playing !== undefined}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          if (Number.isFinite(v.duration)) onDuration(v.duration);
          v.currentTime = Math.min(clock.current, v.duration);
        }}
        onTimeUpdate={(e) => {
          if (playing === undefined || e.currentTarget.paused)
            onTime(e.currentTarget.currentTime);
        }}
        onError={() =>
          setError("Reference playback failed. Reload or use an H.264 MP4.")
        }
      />
      <p className="small muted">
        Reference video · body tracking will appear when ready.
      </p>
      {error && (
        <p className="error-text small" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
