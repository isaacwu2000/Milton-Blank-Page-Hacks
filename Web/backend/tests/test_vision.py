"""Deterministic tracking contracts; real MOV integration evidence lives in output/."""

import math

import cv2
import numpy as np
import pytest
import torch

from server import vision
from server.types import Box, Frame, JointPoint, PosePrediction


class Capture:
    def __init__(self, fps: float = 30, count: float = 900, valid: bool = True):
        self.fps = fps
        self.count = count
        self.valid = valid
        self.released = False

    def get(self, prop: int) -> float:
        return self.fps if prop == cv2.CAP_PROP_FPS else self.count

    def read(self):
        # Encoded metadata may differ after MOV rotation; displayed pixels own dimensions.
        return self.valid, np.zeros((360, 640, 3), dtype=np.uint8) if self.valid else None

    def release(self) -> None:
        self.released = True


def test_decoded_pixels_define_video_dimensions(monkeypatch: pytest.MonkeyPatch):
    capture = Capture()
    monkeypatch.setattr(vision.cv2, "VideoCapture", lambda _: capture)
    info = vision.inspect_video("ignored.mov")
    assert (info.width, info.height, info.duration, info.count) == (640, 360, 30, 900)
    assert capture.released


@pytest.mark.parametrize(
    "capture",
    [
        Capture(fps=0),
        Capture(fps=math.nan),
        Capture(count=math.inf),
        Capture(count=901.6),
        Capture(count=2),
        Capture(valid=False),
    ],
)
def test_unsupported_video_is_rejected_and_decoder_released(
    capture: Capture, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setattr(vision.cv2, "VideoCapture", lambda _: capture)
    with pytest.raises(ValueError):
        vision.inspect_video("ignored.mov")
    assert capture.released


def point(x: float, y: float, confidence: float = 0.9) -> JointPoint:
    return {
        "x": x,
        "y": y,
        "confidence": confidence,
        "vx": None,
        "vy": None,
        "ax": None,
        "ay": None,
    }


def test_derivatives_use_seconds_and_preserve_gaps():
    frames: list[Frame] = [
        {
            "time": i * 0.1,
            "joints": {"right_wrist": point(float(i * i), float(3 * i))} if i != 6 else {},
        }
        for i in range(13)
    ]
    result = vision.motion_derivatives(frames)
    assert result[2]["joints"]["right_wrist"]["vy"] == pytest.approx(30)
    assert result[2]["joints"]["right_wrist"]["ax"] == pytest.approx(200)
    assert result[6]["joints"] == {}
    for i in [0, 5, 7, 12]:
        assert result[i]["joints"]["right_wrist"]["vx"] is None
    for i in [0, 1, 4, 5, 7, 8, 11, 12]:
        assert result[i]["joints"]["right_wrist"]["ax"] is None


def test_low_confidence_is_not_interpolated():
    frames: list[Frame] = [
        {"time": i * 0.1, "joints": {"left_knee": point(float(i), 20.0, 0.1 if i == 3 else 0.9)}}
        for i in range(7)
    ]
    result = vision.motion_derivatives(frames)
    assert result[3]["joints"]["left_knee"]["vx"] is None
    assert result[2]["joints"]["left_knee"]["vx"] is None
    assert result[4]["joints"]["left_knee"]["vx"] is None


def prediction(confident: list[int]) -> PosePrediction:
    scores = torch.full((17,), 0.08)
    scores[confident] = 0.8
    return {"keypoints": torch.full((17, 2), 10.0), "labels": torch.arange(17), "scores": scores}


def test_real_edge_hand_fragment_is_not_a_second_body():
    # Exact detector boxes from IMG_0507.MOV at 16.4s; source frame was visually checked.
    assert vision.is_edge_fragment(
        prediction([]),
        Box(-0.28, 0.42, 185.88, 218.62),
        Box(176.4, 0.46, 928.68, 716.45),
        1280,
        720,
    )


@pytest.mark.parametrize(
    "box,joints",
    [
        (Box(0, 0, 600, 600), []),
        (Box(0, 0, 100, 100), [5]),
        (Box(10, 10, 100, 100), []),
        (Box(0, 0, 100, 100), [0, 1, 2, 3, 4]),
    ],
)
def test_real_body_or_ambiguous_detection_is_not_hidden(box: Box, joints: list[int]):
    assert not vision.is_edge_fragment(prediction(joints), box, Box(100, 0, 900, 700), 1280, 720)
