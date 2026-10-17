"""A fallback height remains an assumption and still needs an observed body span."""

import asyncio
from copy import deepcopy

import pytest
from fastapi.testclient import TestClient

from server import app as runtime
from server import calibration, store, vision
from server.types import HeightReference

SESSION_ID = "00000000-0000-4000-8000-000000000077"
REFERENCE: HeightReference = {"bodyHeightPixels": 850.0, "frameTime": 0.2}


@pytest.mark.parametrize("height", [None, float("nan"), float("inf"), 0, 301])
def test_missing_or_invalid_height_uses_identified_assumption(height):
    value = calibration.automatic_scale(height, REFERENCE, 940)
    assert value["metersPerPixel"] == pytest.approx(1.7 / 850)
    assert value["source"] == "assumed_height_auto"
    assert value["heightCm"] == 170
    assert value["bodyHeightPixels"] == 850


def test_saved_height_wins_and_unusable_body_span_still_fails():
    value = calibration.automatic_scale(178, REFERENCE, 940)
    assert value["source"] == "athlete_height_auto"
    assert value["metersPerPixel"] == pytest.approx(1.78 / 850)
    with pytest.raises(ValueError):
        calibration.automatic_scale(None, {"bodyHeightPixels": 0, "frameTime": 0}, 940)


@pytest.mark.parametrize(
    "height,expected_source", [(None, "assumed_height_auto"), (178, "athlete_height_auto")]
)
def test_saved_tracking_gets_scale_without_reanalysis_and_preserves_existing(
    monkeypatch, height, expected_source
):
    session = {
        "id": SESSION_ID,
        "status": "complete",
        "profileId": "athlete",
        "heightReference": REFERENCE,
        "detectedGround": 940,
    }
    profile = {"heightCm": height}
    monkeypatch.setattr(
        store, "get", lambda kind, key: deepcopy(session if kind == "sessions" else profile)
    )
    writes = []

    def save(key, value, expected=None):
        writes.append(value)
        session["calibration"] = value
        return True

    monkeypatch.setattr(store, "save_height_calibration", save)
    client = TestClient(runtime.app)
    first = client.get(f"/api/sessions/{SESSION_ID}")
    assert first.status_code == 200
    assert first.json()["calibration"]["source"] == expected_source
    assert len(writes) == 1
    # A supplied height replaces only the explicit assumption, not an accepted saved scale.
    profile["heightCm"] = 190
    later = client.get(f"/api/sessions/{SESSION_ID}").json()["calibration"]
    if height is None:
        assert later["source"] == "athlete_height_auto"
        assert later["metersPerPixel"] == pytest.approx(1.9 / 850)
        assert len(writes) == 2
    else:
        assert later == first.json()["calibration"]
        assert len(writes) == 1


def test_tracking_without_profile_height_publishes_assumed_scale(monkeypatch):
    session = {
        "id": SESSION_ID,
        "sourceKey": "owned-test.mp4",
        "status": "uploaded",
        "interval": 0.1,
    }
    monkeypatch.setattr(store, "get", lambda kind, key: deepcopy(session))
    monkeypatch.setattr(store, "read", lambda key: b"controlled-video")
    monkeypatch.setattr(store, "put", lambda *args: None)
    monkeypatch.setattr(
        store, "patch", lambda kind, key, fields: session.update(fields) or deepcopy(session)
    )
    monkeypatch.setattr(
        store,
        "save_height_calibration",
        lambda key, value: session.update(calibration=value) or True,
    )
    monkeypatch.setattr(
        vision, "analyze", lambda *args: {"frames": [], "ground": 940, "heightReference": REFERENCE}
    )

    async def scenario():
        await runtime.start(SESSION_ID)
        while SESSION_ID in runtime.active:
            await asyncio.sleep(0.001)

    try:
        asyncio.run(asyncio.wait_for(scenario(), 3))
        assert session["status"] == "complete"
        assert session["calibration"]["source"] == "assumed_height_auto"
        assert session["calibration"]["metersPerPixel"] == pytest.approx(0.002)
    finally:
        runtime.active.discard(SESSION_ID)
        runtime.cancelled.discard(SESSION_ID)
        runtime.cache.pop(SESSION_ID, None)


def test_assumption_write_cannot_replace_concurrent_profile_based_scale(monkeypatch):
    from unittest.mock import MagicMock

    pool = MagicMock()
    connection = pool.connection.return_value.__enter__.return_value
    connection.execute.return_value.fetchone.return_value = None
    monkeypatch.setattr(store, "pool", lambda: pool)
    assert not store.save_height_calibration(
        SESSION_ID, calibration.automatic_scale(None, REFERENCE, 940)
    )
    query, _ = connection.execute.call_args.args
    assert "'assumed_height_auto'" in query.as_string()
    assert "'athlete_height_auto'" not in query.as_string()
