"""Two computers share recording state without failing or duplicating each other's jobs."""

import asyncio
from copy import deepcopy
from unittest.mock import MagicMock

import httpx
import pytest

from server import app as runtime
from server import config, store
from server.types import Record

ID = "00000000-0000-4000-8000-000000000097"


def saved_session(monkeypatch, value):
    monkeypatch.setattr(store, "get", lambda *args: deepcopy(value))

    def patch(kind, identifier, fields):
        value.update(fields)
        return deepcopy(value)

    monkeypatch.setattr(store, "patch", patch)


def test_starting_another_computer_never_writes_to_live_or_legacy_jobs(monkeypatch):
    monkeypatch.setattr(
        store, "records", lambda *args: pytest.fail("Startup must not enumerate peer jobs")
    )
    monkeypatch.setattr(
        store, "patch", lambda *args: pytest.fail("Startup must not change peer jobs")
    )

    async def scenario():
        async with runtime.lifespan(runtime.app):
            pass

    asyncio.run(scenario())


def test_two_computers_share_live_job_then_recover_expired_owner_without_late_writes(
    monkeypatch, tracking_store
):
    value: Record = {"id": ID, "status": "uploaded", "sourceKey": "videos/keep.mov"}
    saved_session(monkeypatch, value)
    first = store.claim_tracking(ID, "computer-a")
    assert first is not None
    assert first["status"] == "queued"
    # A separate process has no local active set; database ownership still prevents a second worker.
    assert store.claim_tracking(ID, "computer-b") is None
    assert store.update_tracking(ID, "computer-a", {"status": "processing"}) is not None
    tracking_store[0] += config.TRACKING_LEASE_SECONDS + 1
    wall_clock = MagicMock()
    wall_clock.now.return_value.timestamp.return_value = tracking_store[0]
    monkeypatch.setattr(runtime, "datetime", wall_clock)
    expired = runtime.tracking_status(value)
    assert expired["status"] == "failed"
    assert value["status"] == "processing"  # Reading expiry does not mutate peer state.
    recovered = store.claim_tracking(ID, "computer-b")
    assert recovered["analysisRunId"] == "computer-b"
    assert recovered["sourceKey"] == "videos/keep.mov"
    for fields in ({"progress": 0.9}, {"status": "complete"}, {"status": "failed"}):
        assert store.update_tracking(ID, "computer-a", fields) is None
    assert store.update_tracking(ID, "computer-a", {}, True) is None
    assert value["analysisRunId"] == "computer-b"


def test_heartbeat_uses_database_clock_and_keeps_slow_model_loading_owned(
    monkeypatch, tracking_store
):
    value: Record = {"id": ID, "status": "uploaded"}
    saved_session(monkeypatch, value)
    store.claim_tracking(ID, "computer-a")
    for _ in range(10):
        tracking_store[0] += config.TRACKING_HEARTBEAT_SECONDS
        assert store.update_tracking(ID, "computer-a", {}, True) is not None
    assert store.claim_tracking(ID, "computer-b") is None


def test_peer_cancellation_revokes_progress_results_errors_and_heartbeat(
    monkeypatch, tracking_store
):
    value: Record = {"id": ID, "status": "uploaded", "sourceKey": "videos/keep.mov"}
    saved_session(monkeypatch, value)
    store.claim_tracking(ID, "computer-a")
    result = store.cancel_tracking(ID)
    assert result is not None
    assert result["status"] == "uploaded"
    assert result["sourceKey"] == "videos/keep.mov"
    assert store.update_tracking(ID, "computer-a", {"status": "complete"}) is None
    assert store.update_tracking(ID, "computer-a", {"status": "failed"}) is None
    assert store.update_tracking(ID, "computer-a", {"progress": 0.8}) is None
    assert store.update_tracking(ID, "computer-a", {}, True) is None
    assert store.claim_tracking(ID, "computer-b") is not None


def test_http_peer_live_job_returns_progress_but_legacy_job_refuses_duplicate(
    monkeypatch, tracking_store
):
    value: Record = {"id": ID, "status": "uploaded"}
    saved_session(monkeypatch, value)
    store.claim_tracking(ID, "computer-a")

    async def scenario():
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=runtime.app), base_url="http://test"
        ) as client:
            accepted = await client.post(f"/api/sessions/{ID}/analyze")
            assert accepted.status_code == 200
            assert accepted.json()["analysisRunId"] == "computer-a"
            value.pop("analysisRunId")
            value.pop("analysisLeaseUntil")
            legacy = await client.post(f"/api/sessions/{ID}/analyze")
            assert legacy.status_code == 409
            assert "older app" in legacy.json()["detail"]
            assert (await client.post(f"/api/sessions/{ID}/cancel")).status_code == 409

    asyncio.run(scenario())


def test_real_store_claim_and_updates_put_expiry_and_fencing_inside_atomic_sql(monkeypatch):
    pool = MagicMock()
    connection = pool.connection.return_value.__enter__.return_value
    connection.execute.return_value.fetchone.return_value = ({"id": ID},)
    monkeypatch.setattr(store, "pool", lambda: pool)
    store.claim_tracking(ID, "run-a")
    query, parameters = connection.execute.call_args.args
    assert query.startswith("UPDATE")
    assert "clock_timestamp()" in query
    assert "NOT IN ('queued','processing')" in query
    assert "payload->>'status'<>'complete'" in query
    assert parameters == ("run-a", config.TRACKING_LEASE_SECONDS, ID)
    store.update_tracking(ID, "run-a", {"progress": 0.5}, True)
    query, parameters = connection.execute.call_args.args
    assert "payload->>'analysisRunId'=%s" in query
    assert "> EXTRACT(EPOCH FROM clock_timestamp())" in query
    assert parameters[-2:] == (ID, "run-a")
    store.cancel_tracking(ID)
    query, parameters = connection.execute.call_args.args
    assert "'analysisRunId',NULL" in query
    assert "payload->>'analysisRunId' IS NOT NULL" in query


def test_worker_renews_ownership_while_model_loading_blocks_without_frame_progress(
    monkeypatch, tracking_store
):
    from threading import Event

    from server import vision

    value: Record = {
        "id": ID,
        "status": "uploaded",
        "sourceKey": "videos/keep.mov",
        "interval": 0.1,
    }
    saved_session(monkeypatch, value)
    started, renewed, release = Event(), Event(), Event()
    writes = []
    renewals = []
    update = store.update_tracking

    def observe(identifier, token, fields, renew=False):
        if renew:
            tracking_store[0] += config.TRACKING_HEARTBEAT_SECONDS
            renewals.append(True)
            if len(renewals) >= 5:
                renewed.set()
        return update(identifier, token, fields, renew)

    def analyze(*args):
        started.set()
        assert release.wait(3)
        return {"frames": [], "height": 100, "ground": 90}

    monkeypatch.setattr(config, "TRACKING_HEARTBEAT_SECONDS", 0.01)
    monkeypatch.setattr(store, "update_tracking", observe)
    monkeypatch.setattr(store, "read", lambda key: b"private-video")
    monkeypatch.setattr(store, "put", lambda *args: writes.append(args))
    monkeypatch.setattr(vision, "analyze", analyze)

    async def scenario():
        await runtime.start(ID)
        try:
            assert await asyncio.to_thread(started.wait, 2)
            assert await asyncio.to_thread(renewed.wait, 2)
            assert store.claim_tracking(ID, "peer") is None
            await runtime.cancel_tracking(ID)
        finally:
            release.set()
            while ID in runtime.active:
                await asyncio.sleep(0.001)

    asyncio.run(asyncio.wait_for(scenario(), 4))
    assert len(renewals) >= 5
    assert value["status"] == "uploaded"
    assert writes == []


@pytest.mark.parametrize("late_error", [False, True])
def test_losing_worker_cannot_publish_or_fail_replacement_and_only_removes_its_own_result(
    monkeypatch, tracking_store, late_error
):
    from server import vision

    value: Record = {
        "id": ID,
        "status": "uploaded",
        "sourceKey": "videos/keep.mov",
        "interval": 0.1,
    }
    saved_session(monkeypatch, value)
    removed, uploaded = [], []

    def replace():
        tracking_store[0] += config.TRACKING_LEASE_SECONDS + 1
        assert store.claim_tracking(ID, "replacement-run") is not None

    def analyze(*args):
        if late_error:
            replace()
            raise RuntimeError("Old worker failed after replacement")
        return {"frames": [], "height": 100, "ground": 90}

    def put(key, *args):
        uploaded.append(key)
        replace()

    monkeypatch.setattr(vision, "analyze", analyze)
    monkeypatch.setattr(store, "read", lambda key: b"private-video")
    monkeypatch.setattr(store, "put", put)
    monkeypatch.setattr(store, "remove", removed.append)

    async def scenario():
        await runtime.start(ID)
        token = runtime.run_ids[ID]
        while ID in runtime.active:
            await asyncio.sleep(0.001)
        return token

    token = asyncio.run(asyncio.wait_for(scenario(), 3))
    assert value["analysisRunId"] == "replacement-run"
    assert value["status"] == "queued"
    assert value.get("analysisKey") is None
    assert value.get("error") is None
    assert removed == uploaded == ([] if late_error else [f"analyses/{ID}/{token}.json"])
