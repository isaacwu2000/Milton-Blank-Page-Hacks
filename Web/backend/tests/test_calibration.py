"""Height scale must come from visible standing stature, not cropped limbs or hands."""

from copy import deepcopy

import pytest
from pydantic import ValidationError

from server import calibration
from server.app import CalibrationInput
from server.types import Box, HeightObservation, JointPoint


def upright() -> dict[str, JointPoint]:
    points = {"nose": (250, 150), "left_eye": (240, 140), "right_eye": (260, 140)}
    for side, x in (("left", 220), ("right", 280)):
        for joint, y in (
            ("shoulder", 240),
            ("wrist", 470),
            ("hip", 470),
            ("knee", 690),
            ("ankle", 900),
        ):
            points[f"{side}_{joint}"] = (x, y)
    return {
        name: {"x": x, "y": y, "confidence": 0.95, "vx": None, "vy": None, "ax": None, "ay": None}
        for name, (x, y) in points.items()
    }


def test_visible_upright_stature_and_exact_height_conversion():
    observation = calibration.standing_height(Box(160, 90, 340, 940), upright(), 500, 1000, 0.2)
    assert observation == HeightObservation(850, 0.2)
    reference = calibration.select_height_reference(
        [HeightObservation(850, t) for t in (0, 0.1, 0.2)], 0.1
    )
    assert reference is not None
    saved = calibration.from_height(178, reference, 940)
    assert saved["metersPerPixel"] == pytest.approx(1.78 / 850)
    assert saved["source"] == "athlete_height_auto"


@pytest.mark.parametrize("failure", ["head", "feet", "hands", "crouch", "confidence", "offscreen"])
def test_rejects_unreliable_stature(failure: str):
    joints = deepcopy(upright())
    box = Box(160, 90, 340, 940)
    if failure == "head":
        box = Box(160, 0, 340, 940)
    elif failure == "feet":
        box = Box(160, 90, 340, 1000)
    elif failure == "hands":
        joints["left_wrist"]["y"] = 80
    elif failure == "crouch":
        joints["left_hip"]["x"] = 380
    elif failure == "confidence":
        joints["nose"]["confidence"] = 0.2
    else:
        joints["left_eye"]["y"] = -1
    assert calibration.standing_height(box, joints, 500, 1000, 0) is None


def test_requires_stable_consecutive_stature_samples():
    assert (
        calibration.select_height_reference([HeightObservation(850, t) for t in (0, 0.1, 0.5)], 0.1)
        is None
    )
    assert (
        calibration.select_height_reference(
            [HeightObservation(v, i / 10) for i, v in enumerate((800, 900, 850))], 0.1
        )
        is None
    )


def test_manual_height_metadata_is_consistent_and_legacy_scale_remains_valid():
    saved = CalibrationInput(
        metersPerPixel=0.00445,
        ground=940,
        source="athlete_height_manual",
        heightCm=178,
        bodyHeightPixels=400,
        frameTime=1.2,
    )
    assert saved.heightCm == 178
    assert CalibrationInput(metersPerPixel=0.004, ground=940).source is None
    with pytest.raises(ValidationError, match="match"):
        CalibrationInput(
            metersPerPixel=1,
            ground=940,
            source="athlete_height_manual",
            heightCm=178,
            bodyHeightPixels=400,
            frameTime=1.2,
        )
