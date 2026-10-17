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
        assert result[i]["joints"]["right_wrist"]["vx"] == pytest.approx(20 * i)
        assert result[i]["joints"]["right_wrist"]["ax"] == pytest.approx(200)


def test_low_confidence_is_not_interpolated():
    frames: list[Frame] = [
        {"time": i * 0.1, "joints": {"left_knee": point(float(i), 20.0, 0.1 if i == 3 else 0.9)}}
        for i in range(7)
    ]
    result = vision.motion_derivatives(frames)
    assert result[3]["joints"]["left_knee"]["vx"] is None
    assert result[2]["joints"]["left_knee"]["vx"] == pytest.approx(10)
    assert result[4]["joints"]["left_knee"]["vx"] == pytest.approx(10)
    assert result[2]["joints"]["left_knee"]["ax"] is None
    assert result[4]["joints"]["left_knee"]["ax"] is None


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


def test_shoe_origin_uses_person_bottom_instead_of_ankle():
    joints = {"left_ankle": point(50, 120)}
    assert vision.shoe_contact_ground(Box(0, 0, 100, 180), joints, 100, 200) == 180


@pytest.mark.parametrize(
    "box,joints",
    [
        (Box(0, 0, 100, 199), {"left_ankle": point(50, 150)}),
        (Box(0, 0, 100, 180), {"left_ankle": point(50, 120, 0.1)}),
        (Box(0, 0, 100, 180), {"left_ankle": point(50, 30)}),
        (Box(0, 0, 100, 180), {"left_ankle": point(-1, 120)}),
    ],
)
def test_shoe_origin_rejects_clipped_or_unreliable_feet(box: Box, joints: dict[str, JointPoint]):
    assert vision.shoe_contact_ground(box, joints, 100, 200) is None


@pytest.mark.parametrize(
    "offset,sample_times,timing_error",
    [
        (0.0, [0.0, 0.1, 0.2], None),
        (-0.0003666666666667, [0.0, 0.1, 0.2], None),
        (12.5, [0.0, 0.1, 0.2], None),
        (12.5, [0.0, 0.087, 0.215], None),
        (math.nan, [0.0, 0.1, 0.2], "invalid frame timing"),
        (math.inf, [0.0, 0.1, 0.2], "invalid frame timing"),
        (0.0, [0.0, 0.0, 0.2], "frame times do not advance"),
        (0.0, [0.0, -0.1, 0.2], "frame times do not advance"),
    ],
)
def test_analysis_waits_for_earliest_clear_shoe_boundary(
    monkeypatch: pytest.MonkeyPatch,
    offset: float,
    sample_times: list[float],
    timing_error: str | None,
):
    from unittest.mock import MagicMock

    class TimedCapture:
        frame = 0
        released = False

        def get(self, prop: int) -> float:
            return {
                cv2.CAP_PROP_FPS: 30.0,
                cv2.CAP_PROP_FRAME_COUNT: 9.0,
                cv2.CAP_PROP_POS_MSEC: (offset + sample_times[min(self.frame // 3, 2)]) * 1000,
            }.get(prop, 0.0)

        def set(self, prop: int, value: float) -> bool:
            self.frame = round(value)
            return True

        def read(self):
            return True, np.zeros((200, 100, 3), dtype=np.uint8)

        def release(self) -> None:
            self.released = True

    detector_processor, detector, pose_processor, pose = [MagicMock() for _ in range(4)]
    detector_processor.return_value = {}
    pose_processor.return_value = {"pixel_values": torch.zeros(1, 3, 4, 4)}
    detector_processor.post_process_object_detection.side_effect = [
        [
            {
                "boxes": torch.tensor([[0.0, 0.0, 100.0, bottom]]),
                "labels": torch.tensor([0]),
                "scores": torch.tensor([0.99]),
            }
        ]
        for bottom in [199.0, 180.0, 185.0]
    ]
    predictions = []
    for ankle_confidence in [0.9, 0.1, 0.9]:
        coords = torch.full((17, 2), 50.0)
        coords[15:, 1] = 160.0
        scores = torch.full((17,), 0.9)
        scores[15:] = ankle_confidence
        predictions.append([[{"keypoints": coords, "labels": torch.arange(17), "scores": scores}]])
    pose_processor.post_process_pose_estimation.side_effect = predictions
    monkeypatch.setattr(
        vision, "models", lambda: (detector_processor, detector, pose_processor, pose)
    )
    captures = []

    def capture(_):
        value = TimedCapture()
        captures.append(value)
        return value

    monkeypatch.setattr(vision.cv2, "VideoCapture", capture)
    if timing_error:
        with pytest.raises(ValueError, match=timing_error):
            vision.analyze("ignored.mov", "fixture", 0.1, lambda value, message: True)
        assert all(value.released for value in captures)
        return
    result = vision.analyze("ignored.mov", "fixture", 0.1, lambda value, message: True)
    assert result["ground"] == 185
    assert result["groundTime"] == sample_times[2]
    assert result["groundSource"] == "person_boundary"
    assert [frame["time"] for frame in result["frames"]] == sample_times
    assert all(value.released for value in captures)


def test_preview_is_first_displayed_frame_and_small_jpeg(tmp_path):
    path = tmp_path / "preview.avi"
    writer = cv2.VideoWriter(str(path), cv2.VideoWriter.fourcc(*"MJPG"), 10, (640, 360))
    first = np.zeros((360, 640, 3), dtype=np.uint8)
    first[:, :, 2] = 255
    writer.write(first)
    writer.write(np.zeros_like(first))
    writer.release()
    encoded = vision.first_frame_preview(path)
    decoded = cv2.imdecode(np.frombuffer(encoded, dtype=np.uint8), cv2.IMREAD_COLOR)
    assert encoded[:2] == b"\xff\xd8"
    assert decoded is not None
    assert decoded.shape[:2] == (288, 512)
    assert decoded[:, :, 2].mean() > 240
    assert decoded[:, :, 0].mean() < 15
