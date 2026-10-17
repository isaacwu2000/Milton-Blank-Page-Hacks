import { useState } from "react";
import { Film } from "lucide-react";

/** Loads a private first-frame JPEG; failure leaves a quiet, fixed-size placeholder. */
export function SessionPreview({ sessionId }: { sessionId: string }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <span
      aria-hidden="true"
      aria-busy={!loaded && !failed}
      className={`relative inline-flex h-[54px] w-[96px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-(--neutral-light-500) text-(--neutral-dark-500) ${!loaded && !failed ? "motion-safe:animate-pulse" : ""}`}
    >
      {!loaded && <Film size={20} />}
      {!failed && (
        <img
          src={`/api/sessions/${encodeURIComponent(sessionId)}/preview`}
          alt=""
          loading="lazy"
          decoding="async"
          className={`absolute inset-0 h-full w-full object-cover ${loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setFailed(true);
            setLoaded(false);
          }}
        />
      )}
    </span>
  );
}
