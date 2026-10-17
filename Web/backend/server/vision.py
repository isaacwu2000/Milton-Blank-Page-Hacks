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

from server import config
from server.types import (
    Analysis,
    Box,
    Frame,
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
    """Smooth and differentiate contiguous confident tracks; never bridge a detection gap."""
    times = np.array([f["time"] for f in frames])
    for joint in JOINTS:
        valid = np.array(
            [joint in f["joints"] and f["joints"][joint]["confidence"] >= THRESHOLD for f in frames]
        )
        segments = np.split(
            np.flatnonzero(valid), np.where(np.diff(np.flatnonzero(valid)) != 1)[0] + 1
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
            if len(segment) >= 5:
                positions = savgol_filter(
                    positions,
                    min(7, len(segment) if len(segment) % 2 else len(segment) - 1),
                    2,
                    axis=0,
                )
            velocity = np.gradient(positions, times[segment], axis=0, edge_order=2)
            acceleration = np.gradient(velocity, times[segment], axis=0, edge_order=2)
            for k, i in enumerate(segment):
                # Segment ends lack symmetric neighbors, so do not imply equally reliable derivatives.
                p = frames[i]["joints"][joint]
                if 0 < k < len(segment) - 1:
                    p["vx"], p["vy"] = map(float, velocity[k])
                if 1 < k < len(segment) - 2:
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


def analyze(path: str | Path, record_id: str, interval: float, progress: Progress) -> Analysis:
    import torch

    fps, count, width, height, duration = inspect_video(path)
    progress(0.02, "Loading body tracking model")
    detector_processor, detector, processor, pose = models()
    cap = cv2.VideoCapture(str(path))
    frames: list[Frame] = []
    requested = np.arange(0, duration, interval)
    previous_center = None
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
            ratio = min(1, 1280 / max(width, height))
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
    feet = next(
        (
            [
                f["joints"][j]["y"]
                for j in ["left_ankle", "right_ankle"]
                if j in f["joints"] and f["joints"][j]["confidence"] >= THRESHOLD
            ]
            for f in frames
            if any(
                j in f["joints"] and f["joints"][j]["confidence"] >= THRESHOLD
                for j in ["left_ankle", "right_ankle"]
            )
        ),
        [],
    )
    if not feet:
        raise ValueError(
            "The feet are not visible. Include both feet to establish the initial ground line."
        )
    return {
        "id": record_id,
        "width": width,
        "height": height,
        "duration": duration,
        "interval": interval,
        "ground": max(feet),
        "frames": motion_derivatives(frames),
        "source": "video",
        "model": config.POSE_MODEL,
    }
