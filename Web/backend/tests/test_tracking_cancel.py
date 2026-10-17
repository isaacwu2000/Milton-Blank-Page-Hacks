"""Cancellation keeps stored footage and prevents late tracking results from publishing."""

import time
from copy import deepcopy

import pytest
from fastapi.testclient import TestClient

from server import app as runtime
from server import store

pytestmark = pytest.mark.usefixtures("tracking_store")

SESSION_ID = "00000000-0000-4000-8000-000000000099"


def test_cancel_retains_footage_and_returns_a_retryable_session(monkeypatch: pytest.MonkeyPatch):
    session = {
        "id": SESSION_ID,
        "status": "processing",
        "analysisRunId": "cancel-test",
        "analysisLeaseUntil": time.time() + 60,
        "progress": 0.4,
        "sourceKey": "videos/athlete.mov",
        "previewKey": "previews/athlete.jpg",
    }
    monkeypatch.setattr(store, "get", lambda kind, identifier: deepcopy(session))

    def patch(kind, identifier, fields):
        session.update(fields)
        return deepcopy(session)

    monkeypatch.setattr(store, "patch", patch)
    runtime.active.add(SESSION_ID)
    try:
        result = TestClient(runtime.app).post(f"/api/sessions/{SESSION_ID}/cancel")
        assert result.status_code == 200
        assert result.json()["status"] == "uploaded"
        assert result.json()["sourceKey"] == "videos/athlete.mov"
        assert result.json()["previewKey"] == "previews/athlete.jpg"
        assert SESSION_ID in runtime.cancelled
        retry = TestClient(runtime.app).post(f"/api/sessions/{SESSION_ID}/analyze")
        assert retry.status_code == 409
    finally:
        runtime.active.discard(SESSION_ID)
        getattr(runtime, "cancelled", set()).discard(SESSION_ID)


def test_cancel_does_not_change_a_finished_recording(monkeypatch: pytest.MonkeyPatch):
    session = {"id": SESSION_ID, "status": "complete", "analysisKey": "analyses/saved.json"}
    monkeypatch.setattr(store, "get", lambda kind, identifier: deepcopy(session))
    monkeypatch.setattr(
        store, "patch", lambda *args: pytest.fail("A finished clip must not change")
    )
    client = TestClient(runtime.app)
    assert client.post(f"/api/sessions/{SESSION_ID}/cancel").json() == session
    assert client.post(f"/api/sessions/{SESSION_ID}/analyze").json() == session


@pytest.mark.parametrize("late_error", [False, True])
def test_cancelled_worker_discards_late_results_and_removes_temporary_video(
    monkeypatch: pytest.MonkeyPatch, late_error: bool
):
    import asyncio
    from pathlib import Path
    from threading import Event

    from server import vision

    started, resume = Event(), Event()
    temporary: list[Path] = []
    session = {
        "id": SESSION_ID,
        "status": "queued",
        "analysisRunId": "cancel-test",
        "analysisLeaseUntil": time.time() + 60,
        "sourceKey": "videos/saved.mov",
        "interval": 0.1,
    }
    monkeypatch.setattr(store, "get", lambda kind, identifier: deepcopy(session))
    monkeypatch.setattr(store, "read", lambda key: b"saved-video")
    monkeypatch.setattr(
        store, "put", lambda *args: pytest.fail("Cancelled results must not publish")
    )

    def patch(kind, identifier, fields):
        session.update(fields)
        return deepcopy(session)

    def analyze(path, identifier, interval, progress):
        temporary.append(Path(path))
        assert Path(path).exists()
        started.set()
        assert resume.wait(3)
        assert progress(0.5, "Tracking body joints") is False
        if late_error:
            raise RuntimeError("Analysis cancelled.")
        return {"frames": [], "height": 100, "ground": 90}

    monkeypatch.setattr(store, "patch", patch)
    monkeypatch.setattr(vision, "analyze", analyze)

    async def scenario():
        runtime.active.add(SESSION_ID)
        task = asyncio.create_task(runtime.work(SESSION_ID))
        try:
            assert await asyncio.to_thread(started.wait, 3)
            stopped = await runtime.cancel_tracking(SESSION_ID)
            assert stopped["status"] == "uploaded"
        finally:
            resume.set()
            await task

    asyncio.run(scenario())
    assert session["status"] == "uploaded"
    assert temporary and not temporary[0].exists()
    assert SESSION_ID not in runtime.active
    assert SESSION_ID not in runtime.cancelled


def test_cancelled_queued_job_never_loads_video_or_models(monkeypatch: pytest.MonkeyPatch):
    import asyncio

    session = {
        "id": SESSION_ID,
        "status": "queued",
        "analysisRunId": "cancel-test",
        "analysisLeaseUntil": time.time() + 60,
    }
    monkeypatch.setattr(store, "get", lambda kind, identifier: deepcopy(session))
    monkeypatch.setattr(
        store, "read", lambda *args: pytest.fail("Queued cancellation must skip work")
    )

    def patch(kind, identifier, fields):
        session.update(fields)
        return deepcopy(session)

    monkeypatch.setattr(store, "patch", patch)

    async def scenario():
        runtime.active.add(SESSION_ID)
        await runtime.cancel_tracking(SESSION_ID)
        await runtime.work(SESSION_ID)

    asyncio.run(scenario())
    assert session["status"] == "uploaded"
    assert SESSION_ID not in runtime.active


def test_cancel_before_model_loading_does_not_initialize_models(monkeypatch: pytest.MonkeyPatch):
    from server import vision
    from server.types import VideoInfo

    monkeypatch.setattr(vision, "inspect_video", lambda path: VideoInfo(30, 30, 640, 480, 1))
    monkeypatch.setattr(
        vision, "models", lambda: pytest.fail("Cancelled work must not load models")
    )
    with pytest.raises(RuntimeError, match="cancelled"):
        vision.analyze("unused.mov", SESSION_ID, 0.1, lambda value, message: False)
