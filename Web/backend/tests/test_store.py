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


def test_empty_workspace_has_usable_premade_coaches(monkeypatch: pytest.MonkeyPatch):
    pool = MagicMock()
    connection = pool.connection.return_value.__enter__.return_value
    connection.execute.return_value.__iter__.return_value = iter([])
    connection.execute.return_value.fetchone.return_value = None
    monkeypatch.setattr(store, "pool", lambda: pool)
    tools = store.records("tools")
    assert {tool["name"] for tool in tools} >= {
        "Forehand, focused",
        "Squat control",
        "Push-up control",
    }
    for tool in tools:
        assert store.get("tools", tool["id"]) == tool
    assert store.records("sessions") == []
    assert store.records("profiles") == []


def test_saved_coach_wins_without_duplicate_catalog_entry(monkeypatch: pytest.MonkeyPatch):
    pool = MagicMock()
    connection = pool.connection.return_value.__enter__.return_value
    saved = {
        "id": "e219cfb1-fbc5-4b56-90e9-454d38b95f01",
        "name": "Previously saved coach",
    }
    connection.execute.return_value.__iter__.side_effect = lambda: iter([(saved,)])
    connection.execute.return_value.fetchone.return_value = (saved,)
    monkeypatch.setattr(store, "pool", lambda: pool)
    tools = store.records("tools")
    assert len([tool for tool in tools if tool["id"] == saved["id"]]) == 1
    assert tools[0] == saved
    assert store.get("tools", saved["id"]) == saved


def test_home_serves_premade_coaches_without_creating_sample_records(
    monkeypatch: pytest.MonkeyPatch,
):
    from fastapi.testclient import TestClient

    from server.app import app

    pool = MagicMock()
    connection = pool.connection.return_value.__enter__.return_value
    connection.execute.return_value.__iter__.side_effect = lambda: iter([])
    monkeypatch.setattr(store, "pool", lambda: pool)
    client = TestClient(app)
    first = client.get("/api/home")
    second = client.get("/api/home")
    assert first.status_code == 200
    assert len(first.json()["tools"]) == 3
    assert second.json()["tools"] == first.json()["tools"]
    assert first.json()["profiles"] == []
    assert first.json()["sessions"] == []
    assert all("SELECT" in call.args[0] for call in connection.execute.call_args_list)


def test_deleted_premade_coach_stays_hidden_but_resolves_for_history(
    monkeypatch: pytest.MonkeyPatch,
):
    pool = MagicMock()
    connection = pool.connection.return_value.__enter__.return_value
    saved = {**store.PREMADE_COACHES[0], "deletedAt": "2026-10-17T12:00:00Z"}
    connection.execute.return_value.__iter__.side_effect = lambda: iter([(saved,)])
    connection.execute.return_value.fetchone.return_value = (saved,)
    monkeypatch.setattr(store, "pool", lambda: pool)
    assert saved["id"] not in {tool["id"] for tool in store.records("tools")}
    assert store.get("tools", saved["id"]) == saved


def test_hosted_storage_limit_refuses_new_bytes_without_deleting_existing_objects(monkeypatch):
    from server import config

    client = MagicMock()
    client.get_paginator.return_value.paginate.return_value = [
        {"Contents": [{"Size": 3_999_999_990}]}
    ]
    monkeypatch.setattr(store, "s3", lambda: client)
    monkeypatch.setattr(config, "HOSTED_MODE", True)
    with pytest.raises(ValueError, match="storage allowance"):
        store.put("videos/new.mp4", b"x" * 11, "video/mp4")
    client.put_object.assert_not_called()
    client.delete_object.assert_not_called()
