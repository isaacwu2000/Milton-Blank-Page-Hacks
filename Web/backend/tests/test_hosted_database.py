"""The HTTPS bridge preserves SQL parameters and JSON record types."""

import io
import json

import pytest
from psycopg.types.json import Jsonb

from server import hosted_database


def test_hosted_query_keeps_untrusted_text_out_of_sql_and_decodes_json(monkeypatch):
    monkeypatch.setenv("AGENT_INTERNAL_SECRET", "private-test-token")
    captured = []

    def respond(request, timeout):
        captured.append(request)
        assert timeout == 45
        return io.BytesIO(b'[[{"id":"saved","notes":"persisted"}]]')

    monkeypatch.setattr(hosted_database, "urlopen", respond)
    cursor = hosted_database.HostedConnection().execute(
        "UPDATE records SET payload=%s WHERE id=%s RETURNING payload",
        (Jsonb({"notes": "Robert'); DROP TABLE records; --"}), "saved"),
    )
    request = captured[0]
    body = json.loads(request.data)
    assert body == {
        "query": "UPDATE records SET payload=$1 WHERE id=$2 RETURNING payload",
        "parameters": ['{"notes": "Robert\'); DROP TABLE records; --"}', "saved"],
    }
    assert request.get_header("Authorization") == "Bearer private-test-token"
    assert cursor.fetchone() == ({"id": "saved", "notes": "persisted"},)
    assert list(cursor) == [({"id": "saved", "notes": "persisted"},)]


def test_missing_parameters_fail_before_any_network_request(monkeypatch):
    monkeypatch.setattr(hosted_database, "urlopen", lambda *args: pytest.fail("No SQL may be sent"))
    with pytest.raises(ValueError, match="placeholders"):
        hosted_database.HostedConnection().execute("DELETE FROM records WHERE id=%s")
