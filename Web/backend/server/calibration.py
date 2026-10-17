"""Height-based scale estimates require a visible upright body, never a cropped box."""

import math
from statistics import median

from server import config
from server.types import Box, Calibration, HeightObservation, HeightReference, JointPoint


def joint_angle(a: JointPoint, b: JointPoint, c: JointPoint) -> float:
    u = (a["x"] - b["x"], a["y"] - b["y"])
    v = (c["x"] - b["x"], c["y"] - b["y"])
    length = math.hypot(*u) * math.hypot(*v)
    if length == 0:
        return 0
    return math.degrees(math.acos(max(-1.0, min(1.0, sum(x * y for x, y in zip(u, v)) / length))))


def standing_height(
    box: Box, joints: dict[str, JointPoint], width: int, height: int, frame_time: float
) -> HeightObservation | None:
    """Accept a head-to-shoe box only for a straight, uncropped, arms-lowered body.

    Confidence and pose checks reject crouches and overhead hands. A body box
    estimates stature in the image plane; it does not recover depth or perspective.
    """
    names = [
        "nose",
        "left_eye",
        "right_eye",
        "left_shoulder",
        "right_shoulder",
        "left_wrist",
        "right_wrist",
        "left_hip",
        "right_hip",
        "left_knee",
        "right_knee",
        "left_ankle",
        "right_ankle",
    ]
    if any(name not in joints for name in names):
        return None
    points = [joints[name] for name in names]
    if any(
        p["confidence"] < config.HEIGHT_MIN_SCORE
        or not all(math.isfinite(p[key]) for key in ("x", "y", "confidence"))
        or not 0 <= p["x"] < width
        or not 0 <= p["y"] < height
        for p in points
    ):
        return None
    body_height = box.bottom - box.top
    if (
        not all(math.isfinite(value) for value in box)
        or body_height <= height * 0.35
        or box.right <= box.left
    ):
        return None
    margin = max(2 / min(1, config.TRACKING_MAX_SIDE / max(width, height)), body_height * 0.015)
    if box.top < margin or box.bottom > height - margin or box.left < 0 or box.right > width:
        return None
    nose = joints["nose"]
    shoulder_y = sum(joints[side + "_shoulder"]["y"] for side in ("left", "right")) / 2
    hip_y = sum(joints[side + "_hip"]["y"] for side in ("left", "right")) / 2
    knee_y = sum(joints[side + "_knee"]["y"] for side in ("left", "right")) / 2
    ankle_y = sum(joints[side + "_ankle"]["y"] for side in ("left", "right")) / 2
    if not nose["y"] < shoulder_y < hip_y < knee_y < ankle_y:
        return None
    if nose["y"] - box.top < body_height * 0.035 or ankle_y - nose["y"] < body_height * 0.7:
        return None
    if any(joints[side + "_wrist"]["y"] < nose["y"] for side in ("left", "right")):
        return None
    for side in ("left", "right"):
        if (
            joint_angle(joints[side + "_shoulder"], joints[side + "_hip"], joints[side + "_knee"])
            < config.HEIGHT_MIN_JOINT_ANGLE
            or joint_angle(joints[side + "_hip"], joints[side + "_knee"], joints[side + "_ankle"])
            < config.HEIGHT_MIN_JOINT_ANGLE
        ):
            return None
    shoulder_x = sum(joints[side + "_shoulder"]["x"] for side in ("left", "right")) / 2
    ankle_x = sum(joints[side + "_ankle"]["x"] for side in ("left", "right")) / 2
    if abs(shoulder_x - ankle_x) > 0.15 * body_height:
        return None
    return HeightObservation(body_height, frame_time)


def select_height_reference(
    observations: list[HeightObservation], interval: float
) -> HeightReference | None:
    """Choose the earliest three consecutive, stable upright height observations."""
    group: list[HeightObservation] = []
    for observation in observations:
        if group and observation.frame_time - group[-1].frame_time > interval * 1.5:
            group = []
        group.append(observation)
        group = group[-config.HEIGHT_STABLE_SAMPLES :]
        if len(group) == config.HEIGHT_STABLE_SAMPLES:
            pixels = [item.body_height_pixels for item in group]
            center = median(pixels)
            if (max(pixels) - min(pixels)) / center <= config.HEIGHT_MAX_VARIATION:
                chosen = min(group, key=lambda item: abs(item.body_height_pixels - center))
                return {"bodyHeightPixels": center, "frameTime": chosen.frame_time}
    return None


def from_height(height_cm: float, reference: HeightReference, ground: float) -> Calibration:
    """Use the athlete's saved height divided by the observed full-body image span."""
    pixels = reference["bodyHeightPixels"]
    if (
        not math.isfinite(height_cm)
        or not 30 <= height_cm <= 300
        or not math.isfinite(pixels)
        or pixels <= 0
    ):
        raise ValueError("Height and full-body span must be positive finite measurements.")
    return {
        "metersPerPixel": height_cm / 100 / pixels,
        "ground": ground,
        "source": "athlete_height_auto",
        "heightCm": height_cm,
        "bodyHeightPixels": pixels,
        "frameTime": reference["frameTime"],
    }
