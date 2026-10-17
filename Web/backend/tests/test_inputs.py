import math

import pytest
from pydantic import ValidationError

from server.app import SessionUpdate


@pytest.mark.parametrize("value", [-1, 4097, math.inf, math.nan, True])
def test_ground_requires_a_finite_image_coordinate(value: float):
    with pytest.raises(ValidationError):
        SessionUpdate(ground=value)


@pytest.mark.parametrize(
    "raw",
    [
        {"metersPerPixel": 0, "ground": 100},
        {"metersPerPixel": 0.1, "ground": -1},
        {"metersPerPixel": 0.1, "ground": 100, "unexpected": 2},
    ],
)
def test_calibration_rejects_invalid_or_unknown_fields(raw: dict[str, float]):
    with pytest.raises(ValidationError):
        SessionUpdate.model_validate({"calibration": raw})


def test_null_calibration_can_be_cleared_and_ground_is_independent():
    update = SessionUpdate(ground=200, calibration=None)
    assert update.model_dump(exclude_unset=True) == {"ground": 200, "calibration": None}
