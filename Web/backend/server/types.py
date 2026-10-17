"""Wire contracts shared by video tracking, persistence, and HTTP responses."""

from __future__ import annotations

from collections.abc import Callable
from typing import TYPE_CHECKING, Literal, NamedTuple, NotRequired, TypedDict

if TYPE_CHECKING:
    from torch import Tensor
    from transformers import (
        RTDetrForObjectDetection,
        RTDetrImageProcessor,
        VitPoseForPoseEstimation,
        VitPoseImageProcessor,
    )

type RecordKind = Literal["profiles", "tools", "sessions"]
type Status = Literal["uploaded", "queued", "processing", "complete", "failed"]
type Progress = Callable[[float, str], bool]


class VideoInfo(NamedTuple):
    fps: float
    count: int
    width: int
    height: int
    duration: float


class ModelBundle(NamedTuple):
    detector_processor: RTDetrImageProcessor
    detector: RTDetrForObjectDetection
    pose_processor: VitPoseImageProcessor
    pose: VitPoseForPoseEstimation


class JointPoint(TypedDict):
    x: float
    y: float
    confidence: float
    vx: float | None
    vy: float | None
    ax: float | None
    ay: float | None


class Frame(TypedDict):
    time: float
    joints: dict[str, JointPoint]
    image: NotRequired[str]


class Analysis(TypedDict):
    id: str
    width: int
    height: int
    duration: float
    interval: float
    ground: float
    frames: list[Frame]
    source: Literal["video"]
    model: str


class Calibration(TypedDict):
    metersPerPixel: float
    ground: float


class Alignment(TypedDict):
    current: float
    reference: float


class Record(TypedDict, total=False):
    id: str
    name: str
    createdAt: str
    profileId: str
    toolId: str
    referenceId: str
    reference: bool
    status: Status
    progress: float
    stage: str
    error: str | None
    duration: float
    interval: float
    sourceKey: str
    analysisKey: str
    ground: float | None
    calibration: Calibration | None
    alignment: Alignment | None
    completedDrills: list[str]


class Box(NamedTuple):
    left: float
    top: float
    right: float
    bottom: float


class PosePrediction(TypedDict):
    keypoints: Tensor
    labels: Tensor
    scores: Tensor
