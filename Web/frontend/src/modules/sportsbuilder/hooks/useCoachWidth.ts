import { useEffect, useState } from "react";

const WIDTH_KEY = "sportsbuilder.coach.width";
export const MIN_COACH_WIDTH = 280;

/** Remembers the chosen coach width while reserving room for the video on laptops. */
export function useCoachWidth() {
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  const [preferredWidth, setPreferredWidth] = useState(() => {
    try {
      const saved = Number(window.localStorage.getItem(WIDTH_KEY));
      if (Number.isFinite(saved) && saved >= MIN_COACH_WIDTH) return saved;
    } catch {
      // Resizing still works when browser storage is unavailable.
    }
    return window.innerWidth >= 1600 ? 380 : window.innerWidth <= 1100 ? 300 : 340;
  });
  useEffect(() => {
    const resize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  const maximum = Math.max(MIN_COACH_WIDTH, Math.min(720, viewportWidth - 412));
  const width = Math.max(MIN_COACH_WIDTH, Math.min(preferredWidth, maximum));
  function resize(width: number) {
    const bounded = Math.round(Math.max(MIN_COACH_WIDTH, Math.min(width, maximum)));
    setPreferredWidth(bounded);
    try {
      window.localStorage.setItem(WIDTH_KEY, String(bounded));
    } catch {
      // The current session keeps the chosen width without storage.
    }
  }
  return { width, maximum, resize };
}
