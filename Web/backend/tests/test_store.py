"""Check the database update contract without credentials or external services."""

from unittest.mock import MagicMock

import pytest

from server import store


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
