"""Height scale must come from visible articulated stature, not cropped or unresolved landmarks."""

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


@pytest.mark.parametrize("failure", ["head", "feet", "outside_box", "confidence", "offscreen"])
def test_rejects_unreliable_stature(failure: str):
    joints = deepcopy(upright())
    box = Box(160, 90, 340, 940)
    if failure == "head":
        box = Box(160, 0, 340, 940)
    elif failure == "feet":
        box = Box(160, 90, 340, 1000)
    elif failure == "outside_box":
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


def test_bent_legs_use_segment_lengths_instead_of_shortened_body_box():
    joints = upright()
    for side, x in (("left", 220), ("right", 280)):
        joints[f"{side}_knee"].update(x=x + 132, y=646)
        joints[f"{side}_ankle"].update(x=x + 6, y=814)
    observation = calibration.standing_height(Box(160, 90, 450, 854), joints, 500, 1000, 0.2)
    assert observation is not None
    assert observation.body_height_pixels == pytest.approx(850)


def test_raised_hands_do_not_increase_height_or_need_wrist_samples():
    joints = upright()
    joints["left_wrist"].update(y=30)
    joints.pop("right_wrist")
    observation = calibration.standing_height(Box(160, 20, 340, 940), joints, 500, 1000, 0)
    assert observation is not None
    assert observation.body_height_pixels == pytest.approx(850)


def test_stable_bent_and_upright_frames_share_one_height_scale():
    observations: list[HeightObservation] = []
    for i in range(3):
        joints = upright()
        box = Box(160, 90, 340, 940)
        if i == 1:
            for side, x in (("left", 220), ("right", 280)):
                joints[f"{side}_knee"].update(x=x + 132, y=646)
                joints[f"{side}_ankle"].update(x=x + 6, y=814)
            box = Box(160, 90, 450, 854)
        observation = calibration.standing_height(box, joints, 500, 1000, i / 10)
        assert observation is not None
        observations.append(observation)
    reference = calibration.select_height_reference(observations, 0.1)
    assert reference is not None
    assert calibration.from_height(178, reference, 940)["metersPerPixel"] == pytest.approx(
        1.78 / 850
    )


@pytest.mark.parametrize("failure", ["degenerate", "folded", "shortened", "crown", "face"])
def test_rejects_unresolved_articulated_stature(failure: str):
    joints = upright()
    if failure == "degenerate":
        joints["left_knee"].update(x=220, y=900)
    elif failure == "folded":
        joints["left_ankle"].update(x=225, y=500)
    elif failure == "shortened":
        joints["left_knee"].update(y=820)
    elif failure == "crown":
        joints["nose"].update(y=145)
        joints["left_eye"].update(y=115)
        joints["right_eye"].update(y=115)
    else:
        joints["nose"].update(x=270)
    assert calibration.standing_height(Box(160, 90, 340, 940), joints, 500, 1000, 0) is None


def test_bent_hips_preserve_torso_length():
    joints = upright()
    joints["nose"].update(x=112, y=196)
    joints["left_eye"].update(x=102, y=186)
    joints["right_eye"].update(x=122, y=186)
    joints["left_shoulder"].update(x=82, y=286)
    joints["right_shoulder"].update(x=142, y=286)
    observation = calibration.standing_height(Box(50, 136, 340, 940), joints, 500, 1000, 0)
    assert observation is not None
    assert observation.body_height_pixels == pytest.approx(850)
