"""Single-athlete 2D tracking at the user-selected interval. All values derive from decoded frames."""

import base64
import math
import os
from functools import lru_cache
from pathlib import Path
from typing import cast

import cv2
import numpy as np
from PIL import Image
from scipy.signal import savgol_filter

from server import calibration, config
from server.types import (
    Analysis,
    Box,
    Frame,
    HeightObservation,
    JointPoint,
    ModelBundle,
    PosePrediction,
    Progress,
    VideoInfo,
)

JOINTS = [
    "nose",
    "left_eye",
    "right_eye",
    "left_ear",
    "right_ear",
    "left_shoulder",
    "right_shoulder",
    "left_elbow",
    "right_elbow",
    "left_wrist",
    "right_wrist",
    "left_hip",
    "right_hip",
    "left_knee",
    "right_knee",
    "left_ankle",
    "right_ankle",
]
THRESHOLD = config.CONFIDENCE_THRESHOLD


@lru_cache
def models() -> ModelBundle:
    import torch
    from transformers import AutoProcessor, RTDetrForObjectDetection, VitPoseForPoseEstimation

    torch.set_num_threads(min(config.TORCH_THREADS, os.cpu_count() or 1))
    detector_id = config.DETECTOR_MODEL
    pose_id = config.POSE_MODEL
    return ModelBundle(
        AutoProcessor.from_pretrained(detector_id),
        RTDetrForObjectDetection.from_pretrained(detector_id).eval(),
        AutoProcessor.from_pretrained(pose_id),
        VitPoseForPoseEstimation.from_pretrained(pose_id).eval(),
    )


def inspect_video(path: str | Path) -> VideoInfo:
    cap = cv2.VideoCapture(str(path))
    try:
        fps = cap.get(cv2.CAP_PROP_FPS)
        count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
        # MOV rotation is applied by the decoder. Trust actual displayed pixels,
        # not encoded width/height, so browser video and tracking share a plane.
        ok, first = cap.read()
        if not ok or first is None:
            raise ValueError("This video cannot be decoded. Try exporting it as an MP4.")
        height, width = first.shape[:2]
        if (
            not math.isfinite(fps)
            or fps <= 0
            or not math.isfinite(count)
            or count < 3
            or not (
                1 <= width <= config.MAX_VIDEO_DIMENSION
                and 1 <= height <= config.MAX_VIDEO_DIMENSION
            )
        ):
            raise ValueError(
                "This video cannot be decoded. Use an MP4 or MOV, at most 4096 pixels on each side."
            )
        duration = count / fps
        if duration > config.MAX_VIDEO_SECONDS:
            raise ValueError("Trim your video to 30 seconds or less.")
        if duration < 0.3:
            raise ValueError("Use a clip at least 0.3 seconds long.")
        return VideoInfo(fps, int(count), int(width), int(height), duration)
    finally:
        cap.release()


def motion_derivatives(frames: list[Frame]) -> list[Frame]:
    """Differentiate confident tracks in seconds, including supported one-sided edges.

    Speed needs three consecutive samples; acceleration retains the five-sample
    minimum. Missing/nonfinite detections and nonincreasing times break tracks.
    """
    times = np.array([f["time"] for f in frames])
    timing_valid = []
    previous_time = -math.inf
    for time in times:
        increasing = math.isfinite(time) and time > previous_time
        timing_valid.append(increasing)
        if increasing:
            previous_time = time
    for joint in JOINTS:
        valid = []
        for index, frame in enumerate(frames):
            point = frame["joints"].get(joint)
            if point is not None:
                # Refreshing old analyses must also clear stale or invalid results.
                point.update(vx=None, vy=None, ax=None, ay=None)
            valid.append(
                point is not None
                and timing_valid[index]
                and all(math.isfinite(point[key]) for key in ("x", "y", "confidence"))
                and point["confidence"] >= THRESHOLD
            )
        indices = np.flatnonzero(valid)
        segments = np.split(
            indices,
            np.where((np.diff(indices) != 1) | (np.diff(times[indices]) <= 0))[0] + 1,
        )
        for segment in segments:
            if len(segment) < 3:
                continue
            positions = np.array(
                [
                    [frames[i]["joints"][joint]["x"], frames[i]["joints"][joint]["y"]]
                    for i in segment
                ]
            )
            steps = np.diff(times[segment])
            # Index-based smoothing assumes equal spacing. Preserve the actual
            # timestamps on variable-rate clips rather than distorting their motion.
            if len(segment) >= 5 and np.allclose(steps, steps[0], rtol=1e-3, atol=1e-6):
                positions = savgol_filter(
                    positions,
                    min(7, len(segment) if len(segment) % 2 else len(segment) - 1),
                    2,
                    axis=0,
                )
            with np.errstate(over="ignore", invalid="ignore", divide="ignore"):
                velocity = np.gradient(positions, times[segment], axis=0, edge_order=2)
                acceleration = (
                    np.gradient(velocity, times[segment], axis=0, edge_order=2)
                    if len(segment) >= 5
                    else None
                )
            for k, i in enumerate(segment):
                p = frames[i]["joints"][joint]
                if np.isfinite(velocity[k]).all():
                    p["vx"], p["vy"] = map(float, velocity[k])
                if acceleration is not None and np.isfinite(acceleration[k]).all():
                    p["ax"], p["ay"] = map(float, acceleration[k])
    return frames


def is_edge_fragment(
    person: PosePrediction, box: Box, primary: Box, image_width: int, image_height: int
) -> bool:
    """Recognize small cropped limbs without accepting another credible body.

    A fragment must touch the image edge, have no confident shoulder/hip, and
    occupy less than one fifth of the primary box. Full bodies remain ambiguous.
    """
    area = max(0, box.right - box.left) * max(0, box.bottom - box.top)
    primary_area = max(1, (primary.right - primary.left) * (primary.bottom - primary.top))
    edge = (
        box.left <= 2
        or box.top <= 2
        or box.right >= image_width - 2
        or box.bottom >= image_height - 2
    )
    supported = {
        int(label)
        for xy, label, score in zip(person["keypoints"], person["labels"], person["scores"])
        if float(score) >= THRESHOLD
        and 0 <= float(xy[0]) < image_width
        and 0 <= float(xy[1]) < image_height
    }
    return (
        area < primary_area * 0.2
        and edge
        and not supported.intersection({5, 6, 11, 12})
        and len(supported) < 5
    )


def shoe_contact_ground(
    box: Box, joints: dict[str, JointPoint], width: int, height: int
) -> float | None:
    """Estimate the shoe-bottom line from the detected person's lower boundary.

    This is a body-box estimate, not exact shoe segmentation. Require a visible,
    confident lower-body ankle and an unclipped lower boundary; otherwise wait
    for a clearer sample. Never add an invented offset to an ankle landmark.
    """
    if (
        not all(math.isfinite(value) for value in box)
        or box.right <= box.left
        or box.bottom <= box.top
    ):
        return None
    scale = min(1, config.TRACKING_MAX_SIDE / max(width, height))
    margin = config.GROUND_CLIP_MARGIN / scale
    if not 0 < box.bottom <= height - margin:
        return None
    for name in ("left_ankle", "right_ankle"):
        ankle = joints.get(name)
        if (
            ankle is not None
            and ankle["confidence"] >= THRESHOLD
            and all(math.isfinite(ankle[key]) for key in ("x", "y", "confidence"))
            and 0 <= ankle["x"] < width
            and 0 <= ankle["y"] < height
            and box.left <= ankle["x"] <= box.right
            and (box.top + box.bottom) / 2 <= ankle["y"] < box.bottom
        ):
            return box.bottom
    return None


def analyze(path: str | Path, record_id: str, interval: float, progress: Progress) -> Analysis:
    import torch

    fps, count, width, height, duration = inspect_video(path)
    if progress(0.02, "Loading body tracking model") is False:
        raise RuntimeError("Analysis cancelled.")
    detector_processor, detector, processor, pose = models()
    cap = cv2.VideoCapture(str(path))
    frames: list[Frame] = []
    requested = np.arange(0, duration, interval)
    previous_center = None
    ground: float | None = None
    ground_time: float | None = None
    height_observations: list[HeightObservation] = []
    try:
        for index, t in enumerate(requested):
            if progress(0.05 + 0.90 * index / len(requested), "Tracking body joints") is False:
                raise RuntimeError("Analysis cancelled.")
            # Actual decoded frame timestamps are retained, not the requested nominal interval.
            frame_index = min(round(t * fps), int(count) - 1)
            if frames and frame_index / fps <= frames[-1]["time"]:
                continue
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
            ok, bgr = cap.read()
            if not ok:
                raise ValueError("The video stopped decoding. Try exporting it as an MP4.")
            timestamp = cap.get(cv2.CAP_PROP_POS_MSEC) / 1000
            if not math.isfinite(timestamp) or timestamp < 0:
                raise ValueError("This video has invalid frame timing. Try exporting it as an MP4.")
            if frames and timestamp <= frames[-1]["time"]:
                raise ValueError(
                    "This video has unsupported frame timing. Try exporting it as an MP4."
                )
            ratio = min(1, config.TRACKING_MAX_SIDE / max(width, height))
            rgb = cv2.cvtColor(
                cv2.resize(bgr, (round(width * ratio), round(height * ratio))), cv2.COLOR_BGR2RGB
            )
            image = Image.fromarray(rgb)
            with torch.inference_mode():
                inputs = detector_processor(images=image, return_tensors="pt")
                prediction = detector(**inputs)
                result = detector_processor.post_process_object_detection(
                    prediction,
                    target_sizes=[(image.height, image.width)],
                    threshold=0.5,
                )[0]
                human = result["labels"] == 0
                boxes = result["boxes"][human].cpu().numpy()
                scores = result["scores"][human].cpu().numpy()
                boxes = boxes[np.argsort(-scores)]
                joints: dict[str, JointPoint] = {}
                if len(boxes) > 5:
                    raise ValueError(
                        "More than one athlete was detected. Crop the video to one athlete."
                    )
                if len(boxes):
                    box = boxes[0]
                    center = (box[:2] + box[2:]) / 2
                    if (
                        previous_center is not None
                        and np.linalg.norm(center - previous_center)
                        > max(image.width, image.height) * 0.4
                    ):
                        raise ValueError(
                            "The athlete moved too far between samples. Try a shorter sampling interval."
                        )
                    previous_center = center
                    coco = boxes.copy()
                    coco[:, 2:] -= coco[:, :2]
                    pose_inputs = processor(image, boxes=[coco], return_tensors="pt")
                    # ViTPose++ requires an expert selection: expert zero is COCO's 17 joints.
                    output = pose(
                        **pose_inputs,
                        dataset_index=torch.zeros(
                            len(pose_inputs["pixel_values"]), dtype=torch.long
                        ),
                    )
                    people = processor.post_process_pose_estimation(
                        output, boxes=[coco], threshold=0
                    )[0]
                    for other, other_box in zip(people[1:], boxes[1:]):
                        if not is_edge_fragment(
                            cast(PosePrediction, other),
                            Box(*map(float, other_box)),
                            Box(*map(float, box)),
                            image.width,
                            image.height,
                        ):
                            raise ValueError(
                                "More than one athlete was detected. Crop the video to one athlete."
                            )
                    if people:
                        person = people[0]
                        for xy, label, confidence in zip(
                            person["keypoints"], person["labels"], person["scores"]
                        ):
                            j = int(label)
                            if j < len(JOINTS):
                                x, y = map(float, xy)
                                score = float(confidence)
                                if math.isfinite(x + y + score):
                                    # An inferred offscreen joint is unavailable, even if the
                                    # model's heatmap confidence happens to be high.
                                    if not (0 <= x < image.width and 0 <= y < image.height):
                                        score = 0.0
                                    joints[JOINTS[j]] = {
                                        "x": x / ratio,
                                        "y": y / ratio,
                                        "confidence": score,
                                        "vx": None,
                                        "vy": None,
                                        "ax": None,
                                        "ay": None,
                                    }
            if ground is None and len(boxes):
                ground = shoe_contact_ground(
                    Box(*(float(value) / ratio for value in boxes[0])), joints, width, height
                )
                if ground is not None:
                    ground_time = round(timestamp, 6)
            if len(boxes):
                observation = calibration.standing_height(
                    Box(*(float(value) / ratio for value in boxes[0])),
                    joints,
                    width,
                    height,
                    round(timestamp, 6),
                )
                if observation is not None:
                    height_observations.append(observation)
            small = cv2.resize(
                bgr,
                (
                    round(width * min(1, 512 / max(width, height))),
                    round(height * min(1, 512 / max(width, height))),
                ),
            )
            _, encoded = cv2.imencode(".jpg", small, [cv2.IMWRITE_JPEG_QUALITY, 65])
            frames.append(
                {
                    "time": round(timestamp, 6),
                    "joints": joints,
                    "image": base64.b64encode(encoded).decode(),
                }
            )
    finally:
        cap.release()
    if sum(any(p["confidence"] >= THRESHOLD for p in f["joints"].values()) for f in frames) < 3:
        raise ValueError(
            "Not enough clear body points were detected. Use a stationary camera with one fully visible athlete."
        )
    if ground is None:
        raise ValueError(
            "The shoe bottoms are not clear. Include the full shoes without cropping the bottom of the video."
        )
    result: Analysis = {
        "id": record_id,
        "width": width,
        "height": height,
        "duration": duration,
        "interval": interval,
        "ground": ground,
        "groundTime": ground_time,
        "groundSource": "person_boundary",
        "frames": motion_derivatives(frames),
        "source": "video",
        "model": config.POSE_MODEL,
    }

    reference = calibration.select_height_reference(height_observations, interval)
    if reference is not None:
        result["heightReference"] = reference
    return result


def first_frame_preview(path: str | Path) -> bytes:
    """Decode the actual first displayed frame once and encode a compact private preview."""
    cap = cv2.VideoCapture(str(path))
    try:
        ok, frame = cap.read()
        if not ok or frame is None:
            raise ValueError("The first video frame could not be read.")
        height, width = frame.shape[:2]
        scale = min(1, 512 / max(width, height))
        small = cv2.resize(frame, (max(1, round(width * scale)), max(1, round(height * scale))))
        encoded, data = cv2.imencode(".jpg", small, [cv2.IMWRITE_JPEG_QUALITY, 82])
        if not encoded:
            raise ValueError("The video preview could not be prepared.")
        return data.tobytes()
    finally:
        cap.release()
