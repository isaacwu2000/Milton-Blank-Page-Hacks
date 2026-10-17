"""Estimate image-plane stature from a visible head, torso, and articulated legs."""

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
    """Estimate straightened stature from confident, uncropped body landmarks.

    Add head, torso and leg lengths rather than the crouched box's height. Joint
    angles and left/right proportions reject folded or visibly shortened limbs.
    This estimates image-plane scale only; symmetric depth motion is unobservable.
    """
    names = ["nose", "left_eye", "right_eye"] + [
        f"{side}_{joint}"
        for side in ("left", "right")
        for joint in ("shoulder", "hip", "knee", "ankle")
    ]
    if width <= 0 or height <= 0 or any(name not in joints for name in names):
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
    box_height = box.bottom - box.top
    if (
        not all(math.isfinite(value) for value in box)
        or box_height <= height * 0.2
        or box.right <= box.left
    ):
        return None
    margin = max(2 / min(1, config.TRACKING_MAX_SIDE / max(width, height)), box_height * 0.015)
    if box.top < margin or box.bottom > height - margin or box.left < 0 or box.right > width:
        return None
    if any(
        not box.left <= point["x"] <= box.right or not box.top <= point["y"] <= box.bottom
        for point in points
    ):
        return None

    def center(joint: str) -> JointPoint:
        return {
            "x": (joints[f"left_{joint}"]["x"] + joints[f"right_{joint}"]["x"]) / 2,
            "y": (joints[f"left_{joint}"]["y"] + joints[f"right_{joint}"]["y"]) / 2,
            "confidence": 1,
            "vx": None,
            "vy": None,
            "ax": None,
            "ay": None,
        }

    def distance(a: JointPoint, b: JointPoint) -> float:
        return math.hypot(a["x"] - b["x"], a["y"] - b["y"])

    nose = joints["nose"]
    eyes = center("eye")
    shoulder = center("shoulder")
    hip = center("hip")
    ankle = center("ankle")
    if not eyes["y"] < nose["y"] < shoulder["y"] < hip["y"] < ankle["y"]:
        return None

    # A raised hand changes the detector's top edge. Estimate the crown from
    # face landmarks in that case; six eye-to-nose spans is an approximate head
    # extent, not a recovered 3D measurement. Reject tilted or unresolved faces.
    face_span = nose["y"] - eyes["y"]
    if face_span < 2 or abs(nose["x"] - eyes["x"]) > face_span:
        return None
    face_crown = nose["y"] - config.HEIGHT_FACE_CROWN_SPANS * face_span
    if face_crown < margin:
        return None
    head_extent = nose["y"] - box.top
    if head_extent < 3 * face_span:
        return None
    crown_y = face_crown if head_extent > 9 * face_span else box.top
    if crown_y < margin or nose["y"] - crown_y < box_height * 0.025:
        return None
    head = nose["y"] - crown_y + distance(nose, shoulder)
    torso = distance(shoulder, hip)
    sole = box.bottom - ankle["y"]
    if not 0 < sole < box_height * 0.12:
        return None
    legs: list[float] = []
    thighs: list[float] = []
    shins: list[float] = []
    for side in ("left", "right"):
        s, h, k, a = (joints[f"{side}_{name}"] for name in ("shoulder", "hip", "knee", "ankle"))
        if min(joint_angle(s, h, k), joint_angle(h, k, a)) < config.HEIGHT_MIN_JOINT_ANGLE:
            return None
        thigh, shin = distance(h, k), distance(k, a)
        if shin == 0 or not 0.55 <= thigh / shin <= 1.8:
            return None
        thighs.append(thigh)
        shins.append(shin)
        legs.append(thigh + shin)
    if any(min(lengths) / max(lengths) < 0.75 for lengths in (thighs, shins)):
        return None
    leg = sum(legs) / 2
    stature = head + torso + leg + sole
    if not 0.25 <= torso / leg <= 0.85 or not 0.1 <= head / stature <= 0.3:
        return None
    return HeightObservation(stature, frame_time)


def select_height_reference(
    observations: list[HeightObservation], interval: float
) -> HeightReference | None:
    """Choose the earliest three consecutive, stable articulated height observations."""
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
    """Use the athlete's saved height divided by the estimated straightened image span."""
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


def automatic_scale(
    height_cm: float | None, reference: HeightReference, ground: float
) -> Calibration:
    """Use a valid saved height or an explicit 170 cm assumption with the same observed span."""
    provided = height_cm is not None and math.isfinite(height_cm) and 30 <= height_cm <= 300
    value = from_height(
        height_cm if height_cm is not None and provided else config.ASSUMED_HEIGHT_CM,
        reference,
        ground,
    )
    if not provided:
        value["source"] = "assumed_height_auto"
    return value
