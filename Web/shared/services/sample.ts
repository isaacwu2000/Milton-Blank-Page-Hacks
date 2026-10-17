import { JOINTS, type Analysis, type Frame, type Joint } from "../types";
/** Synthetic motion fixture for the labeled demo and browser inspections, never uploaded-video evidence. */
export function makeSample(): Analysis {
  const bases: Record<Joint, [number, number]> = {
    nose: [390, 135],
    left_eye: [383, 129],
    right_eye: [395, 129],
    left_ear: [373, 139],
    right_ear: [403, 139],
    left_shoulder: [360, 192],
    right_shoulder: [415, 192],
    left_elbow: [323, 250],
    right_elbow: [464, 224],
    left_wrist: [302, 306],
    right_wrist: [517, 201],
    left_hip: [368, 315],
    right_hip: [411, 315],
    left_knee: [320, 400],
    right_knee: [460, 390],
    left_ankle: [280, 470],
    right_ankle: [500, 470],
  };
  const frames: Frame[] = Array.from({ length: 51 }, (_, i) => {
    const t = i / 10;
    const s = Math.sin(t * 1.5),
      c = Math.cos(t * 1.5);
    return {
      time: t,
      joints: Object.fromEntries(
        JOINTS.map((j) => {
          const b = bases[j],
            amp = j === "right_wrist" ? 90 : j === "right_elbow" ? 35 : 8;
          return [
            j,
            {
              x: b[0] + amp * s,
              y: b[1] + amp * 0.5 * c,
              vx: amp * 1.5 * c,
              vy: -amp * 0.75 * s,
              ax: -amp * 2.25 * s,
              ay: -amp * 1.125 * c,
              confidence: 0.98,
            },
          ];
        }),
      ),
    };
  });
  return {
    id: "sample",
    width: 800,
    height: 540,
    duration: 5,
    interval: 0.1,
    ground: 474,
    frames,
    source: "sample",
    model: "Synthetic joint motion",
  };
}
