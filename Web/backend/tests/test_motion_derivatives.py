"""Analytic motion contracts: usable track edges without invented neighbors."""

import json
import math
from copy import deepcopy

import pytest

from server import vision
from server.types import Frame


def track(times: list[float], quadratic: bool = True) -> list[Frame]:
    return [
        {
            "time": t,
            "joints": {
                "right_wrist": {
                    "x": 2 * t**2 + 3 * t + 5 if quadratic else 3 * t,
                    "y": -(t**2) + 4 * t if quadratic else 4 * t,
                    "confidence": 0.9,
                    "vx": None,
                    "vy": None,
                    "ax": None,
                    "ay": None,
                }
            },
        }
        for t in times
    ]


@pytest.mark.parametrize(
    "times", [[i / 10 for i in range(7)], [0, 0.08, 0.21, 0.3, 0.49, 0.67, 0.81]]
)
def test_quadratic_motion_has_correct_one_sided_edge_estimates(times: list[float]):
    frames = track(times)
    original = deepcopy(frames)
    result = vision.motion_derivatives(frames)
    for frame, before in zip(result, original):
        t = frame["time"]
        p = frame["joints"]["right_wrist"]
        assert p["vx"] == pytest.approx(4 * t + 3)
        assert p["vy"] == pytest.approx(-2 * t + 4)
        assert p["ax"] == pytest.approx(4)
        assert p["ay"] == pytest.approx(-2)
        assert (p["x"], p["y"]) == (
            before["joints"]["right_wrist"]["x"],
            before["joints"]["right_wrist"]["y"],
        )


@pytest.mark.parametrize("count", [1, 2, 3, 4, 5])
def test_minimum_samples_for_speed_and_acceleration(count: int):
    result = vision.motion_derivatives(track([i / 10 for i in range(count)], quadratic=False))
    for frame in result:
        p = frame["joints"]["right_wrist"]
        if count >= 3:
            assert p["vx"] == pytest.approx(3)
            assert p["vy"] == pytest.approx(4)
        else:
            assert p["vx"] is None
            assert p["vy"] is None
        if count >= 5:
            assert p["ax"] == pytest.approx(0, abs=1e-10)
            assert p["ay"] == pytest.approx(0, abs=1e-10)
        else:
            assert p["ax"] is None
            assert p["ay"] is None


def test_stationary_track_has_zero_readings_instead_of_unavailable():
    frames = track([i / 10 for i in range(7)])
    for frame in frames:
        frame["joints"]["right_wrist"].update(x=50, y=80)
    for frame in vision.motion_derivatives(frames):
        p = frame["joints"]["right_wrist"]
        for key in ("vx", "vy", "ax", "ay"):
            assert p[key] == pytest.approx(0, abs=1e-10)


def test_confidence_gap_cannot_turn_a_track_jump_into_motion():
    frames = track([i / 10 for i in range(11)], quadratic=False)
    frames[5]["joints"]["right_wrist"].update(confidence=0.1, vx=999, ax=999)
    for frame in frames[6:]:
        frame["joints"]["right_wrist"]["x"] += 1000
    result = vision.motion_derivatives(frames)
    assert result[5]["joints"]["right_wrist"]["vx"] is None
    assert result[5]["joints"]["right_wrist"]["ax"] is None
    for i in [0, 4, 6, 10]:
        assert result[i]["joints"]["right_wrist"]["vx"] == pytest.approx(3)
        assert result[i]["joints"]["right_wrist"]["ax"] == pytest.approx(0, abs=1e-8)


@pytest.mark.parametrize("invalid", ["position", "time", "duplicate_time"])
def test_invalid_coordinates_or_times_break_tracks_and_clear_stale_results(invalid: str):
    frames = track([i / 10 for i in range(7)], quadratic=False)
    if invalid == "position":
        frames[3]["joints"]["right_wrist"]["x"] = math.nan
    elif invalid == "time":
        frames[3]["time"] = math.inf
    else:
        frames[3]["time"] = frames[2]["time"]
    for frame in frames:
        frame["joints"]["right_wrist"].update(vx=999, vy=999, ax=999, ay=999)
    result = vision.motion_derivatives(frames)
    for frame in result:
        p = frame["joints"]["right_wrist"]
        assert p["ax"] is None
        assert p["ay"] is None
        assert p["vx"] is None or p["vx"] != 999
        assert p["vy"] is None or p["vy"] != 999
    assert result[3]["joints"]["right_wrist"]["vx"] is None
    for i in [0, 2, 4, 6]:
        assert result[i]["joints"]["right_wrist"]["vx"] == pytest.approx(3)


def test_saved_analysis_refreshes_derivatives_once_without_retracking_or_writes(
    monkeypatch: pytest.MonkeyPatch,
):
    from server import app as api

    frames = track([i / 10 for i in range(5)])
    saved = {"id": "motion-refresh-test", "frames": frames}
    reads = []
    monkeypatch.setattr(
        api.store, "read", lambda key: reads.append(key) or json.dumps(saved).encode()
    )
    monkeypatch.setattr(
        api.store, "save", lambda *args: pytest.fail("Read refresh must not write records")
    )
    monkeypatch.setattr(
        api.vision, "analyze", lambda *args: pytest.fail("Read refresh must not rerun tracking")
    )
    api.cache.pop(saved["id"], None)
    try:
        result = api.load_analysis({"id": saved["id"], "analysisKey": "saved-analysis"})
        assert result["frames"][0]["joints"]["right_wrist"]["vx"] == pytest.approx(3)
        assert result["frames"][0]["joints"]["right_wrist"]["ax"] == pytest.approx(4)
        assert api.load_analysis({"id": saved["id"], "analysisKey": "saved-analysis"}) is result
        assert reads == ["saved-analysis"]
        assert saved["frames"][0]["joints"]["right_wrist"]["vx"] is None
    finally:
        api.cache.pop(saved["id"], None)
