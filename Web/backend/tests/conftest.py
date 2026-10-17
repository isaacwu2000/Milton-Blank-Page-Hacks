"""Isolated database-clock seam for tracking ownership behavior tests."""

import threading
import time

import pytest

from server import app as runtime
from server import config, store


@pytest.fixture
def tracking_store(monkeypatch: pytest.MonkeyPatch):
    clock = [time.time()]
    lock = threading.Lock()

    def claim(identifier, token):
        with lock:
            value = store.get("sessions", identifier)
            assert value is not None
            if value["status"] == "complete":
                return None
            if value.get("analysisRunId"):
                if value.get("analysisLeaseUntil", 0) > clock[0]:
                    return None
            elif value["status"] in ("queued", "processing"):
                return None
            return store.patch(
                "sessions",
                identifier,
                {
                    "analysisRunId": token,
                    "analysisLeaseUntil": clock[0] + config.TRACKING_LEASE_SECONDS,
                    "status": "queued",
                    "progress": 0,
                    "error": None,
                    "stage": "Queued",
                },
            )

    def update(identifier, token, fields, renew=False):
        with lock:
            value = store.get("sessions", identifier)
            assert value is not None
            if (
                value.get("analysisRunId") != token
                or value.get("analysisLeaseUntil", 0) <= clock[0]
            ):
                return None
            changed = dict(fields)
            if renew:
                changed["analysisLeaseUntil"] = clock[0] + config.TRACKING_LEASE_SECONDS
            elif fields.get("status") in ("complete", "failed", "uploaded"):
                changed["analysisLeaseUntil"] = 0
            return store.patch("sessions", identifier, changed)

    def cancel(identifier):
        with lock:
            value = store.get("sessions", identifier)
            assert value is not None
            if value["status"] not in ("queued", "processing") or not value.get("analysisRunId"):
                return None
            return store.patch(
                "sessions",
                identifier,
                {
                    **runtime.CANCELLED_FIELDS,
                    "analysisRunId": None,
                    "analysisLeaseUntil": 0,
                },
            )

    monkeypatch.setattr(store, "claim_tracking", claim)
    monkeypatch.setattr(store, "update_tracking", update)
    monkeypatch.setattr(store, "cancel_tracking", cancel)
    monkeypatch.setattr(runtime, "run_ids", {"00000000-0000-4000-8000-000000000099": "cancel-test"})
    return clock
