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
