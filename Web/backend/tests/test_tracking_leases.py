from typing import cast

from server.types import Record

"""Two computers share recording state without failing or duplicating each other's jobs."""

import asyncio
from copy import deepcopy
from unittest.mock import MagicMock

import httpx
import pytest

from server import app as runtime
from server import config, store

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
    value = {"id": ID, "status": "uploaded", "sourceKey": "videos/keep.mov"}
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
    expired = runtime.tracking_status(cast(Record, value))
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
    value = {"id": ID, "status": "uploaded"}
    saved_session(monkeypatch, value)
    store.claim_tracking(ID, "computer-a")
    for _ in range(10):
        tracking_store[0] += config.TRACKING_HEARTBEAT_SECONDS
        assert store.update_tracking(ID, "computer-a", {}, True) is not None
    assert store.claim_tracking(ID, "computer-b") is None


def test_peer_cancellation_revokes_progress_results_errors_and_heartbeat(
    monkeypatch, tracking_store
):
    value = {"id": ID, "status": "uploaded", "sourceKey": "videos/keep.mov"}
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
    value = {"id": ID, "status": "uploaded"}
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
