"""Use Neon's HTTPS driver through the private agent when direct database TCP is unavailable."""

import json
import os
from collections.abc import Generator, Iterator, Sequence
from contextlib import contextmanager
from typing import cast
from urllib.request import Request, urlopen

from psycopg.sql import Composable
from psycopg.types.json import Jsonb


class HostedCursor:
    """Expose the row operations used by the record store; every request is one atomic query."""

    def __init__(self, rows: list[tuple[object, ...]]):
        self.rows = rows

    def __iter__(self) -> Iterator[tuple[object, ...]]:
        return iter(self.rows)

    def fetchone(self) -> tuple[object, ...] | None:
        return self.rows[0] if self.rows else None


class HostedConnection:
    """Send parameterized SQL to the authenticated loopback bridge, never the public browser."""

    def execute(self, query: str | Composable, parameters: Sequence[object] = ()) -> HostedCursor:
        text = query.as_string() if isinstance(query, Composable) else query
        parts = text.split("%s")
        if len(parts) != len(parameters) + 1:
            raise ValueError("Database placeholders do not match the supplied values.")
        numbered = parts[0] + "".join(f"${index}{part}" for index, part in enumerate(parts[1:], 1))
        values = [
            json.dumps(value.obj) if isinstance(value, Jsonb) else value for value in parameters
        ]
        secret = os.environ["AGENT_INTERNAL_SECRET"]
        request = Request(
            "http://127.0.0.1:3001/internal/database",
            data=json.dumps({"query": numbered, "parameters": values}).encode(),
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {secret}"},
            method="POST",
        )
        with urlopen(request, timeout=45) as response:
            rows = cast(list[list[object]], json.load(response))
        return HostedCursor([tuple(row) for row in rows])


class HostedPool:
    """Preserve the record-store interface for independent queries; transactions are unsupported."""

    @contextmanager
    def connection(self) -> Generator[HostedConnection]:
        yield HostedConnection()
