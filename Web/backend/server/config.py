"""Nonsecret analysis defaults. Credentials and service endpoints stay in the environment."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BACKEND_ROOT = Path(__file__).resolve().parents[1]
STORAGE_BUCKET = "videos"
DETECTOR_MODEL = "PekingU/rtdetr_r50vd_coco_o365"
POSE_MODEL = "usyd-community/vitpose-plus-small"
CONFIDENCE_THRESHOLD = 0.35
MAX_VIDEO_SECONDS = 30.05
MAX_VIDEO_DIMENSION = 4096
MAX_UPLOAD_BYTES = 100 * 1024 * 1024
MAX_QUEUED_JOBS = 3
DEFAULT_SAMPLE_INTERVAL = 0.1
MIN_SAMPLE_INTERVAL = 0.05
MAX_SAMPLE_INTERVAL = 2.0
TORCH_THREADS = 4
STORAGE_REGION = "us-east-1"

TRACKING_MAX_SIDE = 1280
GROUND_CLIP_MARGIN = 2
HEIGHT_MIN_SCORE = 0.5
HEIGHT_MIN_JOINT_ANGLE = 165
HEIGHT_STABLE_SAMPLES = 3
HEIGHT_MAX_VARIATION = 0.04
