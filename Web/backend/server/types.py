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
    groundTime: NotRequired[float | None]
    groundSource: NotRequired[Literal["person_boundary"]]
    heightReference: NotRequired[HeightReference]
    frames: list[Frame]
    source: Literal["video"]
    model: str


class Calibration(TypedDict):
    metersPerPixel: float
    ground: float
    source: NotRequired[
        Literal[
            "athlete_height_auto", "assumed_height_auto", "athlete_height_manual", "known_distance"
        ]
    ]
    heightCm: NotRequired[float]
    bodyHeightPixels: NotRequired[float]
    frameTime: NotRequired[float]


class Alignment(TypedDict):
    current: float
    reference: float


class Record(TypedDict, total=False):
    hidden: bool
    analysisRunId: str | None
    analysisLeaseUntil: float
    heightCm: float | None
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
    previewKey: str
    heightReference: HeightReference
    detectedGround: float
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


type MetricScope = Literal["frame", "summary"]
type MetricUnit = Literal["length", "speed", "acceleration", "angle", "number", "time"]
type Expr = float | Expression


class Expression(TypedDict, total=False):
    op: str
    args: list[Expr]
    joint: str
    field: str
    metric: str
    value: float


class MetricTarget(TypedDict):
    message: str
    min: NotRequired[float]
    max: NotRequired[float]


class Metric(TypedDict):
    id: str
    name: str
    description: str
    scope: MetricScope
    formula: Expr
    unit: MetricUnit
    target: NotRequired[MetricTarget]


class ToolRecord(TypedDict):
    hidden: NotRequired[bool]
    id: str
    createdAt: str
    format: Literal[1]
    name: str
    sport: str
    audience: str
    description: str
    rubric: str
    coachPrompt: str
    metrics: list[Metric]
    focusJoint: str
    referenceId: NotRequired[str]


class ProfileRecord(TypedDict):
    id: str
    name: str
    heightCm: NotRequired[float | None]
    weightKg: NotRequired[float | None]
    dominantSide: NotRequired[str]
    experience: NotRequired[str]
    notes: NotRequired[str]


class SessionRecord(TypedDict):
    id: str
    name: str
    createdAt: str
    profileId: str
    toolId: str
    status: Status
    progress: float
    duration: float
    interval: float
    sourceKey: str
    reference: NotRequired[bool]
    analysisKey: NotRequired[str]
    previewKey: NotRequired[str]
    heightReference: NotRequired[HeightReference]
    detectedGround: NotRequired[float]
    ground: NotRequired[float | None]
    calibration: NotRequired[Calibration | None]
    alignment: NotRequired[Alignment | None]
    completedDrills: NotRequired[list[str] | None]
    stage: NotRequired[str]
    error: NotRequired[str | None]


class HomeData(TypedDict):
    profiles: list[ProfileRecord]
    tools: list[ToolRecord]
    sessions: list[SessionRecord]


class HeightReference(TypedDict):
    bodyHeightPixels: float
    frameTime: float


class HeightObservation(NamedTuple):
    body_height_pixels: float
    frame_time: float
