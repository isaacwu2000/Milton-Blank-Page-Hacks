"""Failed tracking can run again; completed tracking is only read again."""

import asyncio
from copy import deepcopy

import pytest
from fastapi.testclient import TestClient

from server import app as runtime
from server import store, vision

SESSION_ID = "00000000-0000-4000-8000-000000000098"


def test_failed_worker_can_be_requeued_without_recomputing_completed_analysis(
    monkeypatch: pytest.MonkeyPatch,
):
    session = {
        "id": SESSION_ID,
        "status": "uploaded",
        "sourceKey": "videos/saved.mov",
        "interval": 0.1,
    }
    attempts = []
    monkeypatch.setattr(store, "get", lambda kind, identifier: deepcopy(session))
    monkeypatch.setattr(store, "read", lambda key: b"saved-video")
    monkeypatch.setattr(store, "put", lambda *args: None)

    def patch(kind, identifier, fields):
        session.update(fields)
        return deepcopy(session)

    def analyze(*args):
        attempts.append(True)
        if len(attempts) == 1:
            raise RuntimeError("Transient tracking failure")
        return {
            "id": SESSION_ID,
            "frames": [],
            "width": 100,
            "height": 100,
            "duration": 1,
            "interval": 0.1,
            "source": "video",
            "model": "controlled-test",
            "ground": 90,
        }

    monkeypatch.setattr(store, "patch", patch)
    monkeypatch.setattr(vision, "analyze", analyze)

    async def scenario():
        assert (await runtime.start(SESSION_ID))["status"] == "queued"
        while SESSION_ID in runtime.active:
            await asyncio.sleep(0.001)
        assert session["status"] == "failed"
        assert (await runtime.start(SESSION_ID))["status"] == "queued"
        while SESSION_ID in runtime.active:
            await asyncio.sleep(0.001)
        assert session["status"] == "complete"
        assert session["error"] is None
        assert (await runtime.start(SESSION_ID))["status"] == "complete"
        assert len(attempts) == 2

    try:
        asyncio.run(asyncio.wait_for(scenario(), 3))
        # The public read endpoint serves saved results without another worker.
        result = TestClient(runtime.app).get(f"/api/sessions/{SESSION_ID}/analysis")
        assert result.status_code == 200
        assert result.json()["frames"] == []
        assert len(attempts) == 2
    finally:
        runtime.active.discard(SESSION_ID)
        runtime.cancelled.discard(SESSION_ID)
        runtime.cache.pop(SESSION_ID, None)
