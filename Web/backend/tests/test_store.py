"""Check the database update contract without credentials or external services."""

from unittest.mock import MagicMock

import pytest

from server import store
from server.types import Calibration


def test_patch_merges_only_fields_and_returns_current_record(monkeypatch: pytest.MonkeyPatch):
    pool = MagicMock()
    connection = pool.connection.return_value.__enter__.return_value
    connection.execute.return_value.fetchone.return_value = (
        {"id": "clip", "status": "processing", "ground": 200},
    )
    monkeypatch.setattr(store, "pool", lambda: pool)
    result = store.patch("sessions", "clip", {"ground": 200})
    query, parameters = connection.execute.call_args.args
    assert "payload=payload || %s" in query
    assert "RETURNING payload" in query
    assert parameters[0].obj == {"ground": 200}
    assert parameters[1:] == ("sessions", "clip")
    assert result["status"] == "processing"
    assert result["ground"] == 200


def test_patch_does_not_recreate_deleted_records(monkeypatch: pytest.MonkeyPatch):
    pool = MagicMock()
    connection = pool.connection.return_value.__enter__.return_value
    connection.execute.return_value.fetchone.return_value = None
    monkeypatch.setattr(store, "pool", lambda: pool)
    with pytest.raises(KeyError):
        store.patch("sessions", "deleted", {"progress": 0.5})


def test_patch_cannot_change_identity():
    with pytest.raises(ValueError, match="identifier"):
        store.patch("sessions", "clip", {"id": "different"})


def test_automatic_scale_cannot_overwrite_manual_calibration(monkeypatch: pytest.MonkeyPatch):
    pool = MagicMock()
    connection = pool.connection.return_value.__enter__.return_value
    connection.execute.return_value.fetchone.return_value = None
    monkeypatch.setattr(store, "pool", lambda: pool)
    assert not store.save_height_calibration("clip", {"metersPerPixel": 0.004, "ground": 940})
    query, parameters = connection.execute.call_args.args
    assert "athlete_height_auto" in query.as_string()
    assert "jsonb_set" in query.as_string()
    assert parameters[1] == "clip"


def test_profile_rescale_compares_complete_previous_calibration(monkeypatch: pytest.MonkeyPatch):
    pool = MagicMock()
    connection = pool.connection.return_value.__enter__.return_value
    connection.execute.return_value.fetchone.return_value = ("clip",)
    monkeypatch.setattr(store, "pool", lambda: pool)
    previous: Calibration = {"metersPerPixel": 0.004, "ground": 940}
    assert store.save_height_calibration("clip", {"metersPerPixel": 0.005, "ground": 940}, previous)
    query, parameters = connection.execute.call_args.args
    assert "payload->'calibration'=%s" in query.as_string()
    assert parameters[2].obj == previous
