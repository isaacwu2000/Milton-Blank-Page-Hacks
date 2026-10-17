"""Saved video work resumes after a process restart without replaying finished clips."""

import asyncio
from copy import deepcopy

import pytest

from server import app as runtime
from server import config, store


@pytest.fixture(autouse=True)
def hosted_recovery(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(config, "HOSTED_MODE", True)


def test_startup_recovers_expired_jobs_but_preserves_live_and_finished_jobs(
    monkeypatch: pytest.MonkeyPatch, tracking_store
):
    sessions = {
        str(index): {
            "id": str(index),
            "status": status,
            "sourceKey": f"videos/{index}.mp4",
            "analysisRunId": f"previous-{index}",
            "analysisLeaseUntil": 0,
        }
        for index, status in enumerate(
            ["processing", "queued", "complete", "uploaded", "failed", "processing"]
        )
    }
    sessions["5"]["analysisLeaseUntil"] = tracking_store[0] + 60
    resumed = []
    monkeypatch.setattr(store, "records", lambda kind: deepcopy(list(sessions.values())))
    monkeypatch.setattr(store, "get", lambda kind, identifier: deepcopy(sessions[identifier]))

    def patch(kind, identifier, fields):
        sessions[identifier].update(fields)
        return deepcopy(sessions[identifier])

    async def work(identifier):
        resumed.append(identifier)
        runtime.active.discard(identifier)
        runtime.run_ids.pop(identifier, None)

    monkeypatch.setattr(store, "patch", patch)
    monkeypatch.setattr(runtime, "work", work)

    async def scenario():
        async with runtime.lifespan(runtime.app):
            await asyncio.sleep(0.01)
            assert sorted(resumed) == ["0", "1"]
            assert sessions["0"]["status"] == "queued"
            assert sessions["0"]["sourceKey"] == "videos/0.mp4"
            assert sessions["2"]["status"] == "complete"
            assert sessions["3"]["status"] == "uploaded"
            assert sessions["4"]["status"] == "failed"
            assert sessions["5"]["analysisRunId"] == "previous-5"

    asyncio.run(scenario())


def test_database_failure_prevents_a_falsely_healthy_start(monkeypatch: pytest.MonkeyPatch):
    def unavailable(kind):
        raise RuntimeError("Database temporarily unavailable")

    monkeypatch.setattr(store, "records", unavailable)

    async def scenario():
        with pytest.raises(RuntimeError, match="temporarily unavailable"):
            async with runtime.lifespan(runtime.app):
                pytest.fail("The process supervisor must retry startup")

    asyncio.run(scenario())


def test_recovery_and_new_analysis_share_the_five_job_capacity(monkeypatch, tracking_store):
    from threading import Event

    from fastapi import HTTPException

    pending_id = "00000000-0000-4000-8000-000000000090"
    new_id = "00000000-0000-4000-8000-000000000091"
    sessions = {
        pending_id: {
            "id": pending_id,
            "status": "queued",
            "analysisRunId": "expired",
            "analysisLeaseUntil": 0,
        },
        new_id: {"id": new_id, "status": "uploaded"},
    }
    entered, release = Event(), Event()
    claim = store.claim_tracking
    monkeypatch.setattr(store, "records", lambda kind: [deepcopy(sessions[pending_id])])
    monkeypatch.setattr(store, "get", lambda kind, identifier: deepcopy(sessions[identifier]))

    def patch(kind, identifier, fields):
        sessions[identifier].update(fields)
        return deepcopy(sessions[identifier])

    def delayed_claim(identifier, token):
        if identifier == pending_id:
            entered.set()
            assert release.wait(3)
        return claim(identifier, token)

    async def scenario():
        finish = asyncio.Event()

        async def work(identifier):
            await finish.wait()

        monkeypatch.setattr(runtime, "work", work)
        runtime.active.update({"existing-1", "existing-2", "existing-3", "existing-4"})
        recovering = asyncio.create_task(runtime.recover_tracking())
        try:
            assert await asyncio.to_thread(entered.wait, 3)
            requesting = asyncio.create_task(runtime.start(new_id))
            await asyncio.sleep(0.01)
            release.set()
            await recovering
            with pytest.raises(HTTPException) as error:
                await requesting
            assert error.value.status_code == 429
            assert len(runtime.active) == 5
        finally:
            release.set()
            finish.set()
            await recovering
            await asyncio.gather(*runtime.tasks)
            runtime.active.clear()
            runtime.run_ids.pop(pending_id, None)

    monkeypatch.setattr(store, "patch", patch)
    monkeypatch.setattr(store, "claim_tracking", delayed_claim)
    asyncio.run(asyncio.wait_for(scenario(), 5))
