"""Private Neon records and objects. Only credentials and endpoints come from the environment."""

from __future__ import annotations

import json
import os
from collections.abc import Mapping
from copy import deepcopy
from functools import lru_cache
from typing import TYPE_CHECKING, cast

if TYPE_CHECKING:
    from mypy_boto3_s3 import S3Client

import boto3
from botocore.config import Config
from psycopg.types.json import Jsonb
from psycopg_pool import ConnectionPool

from server import config
from server.env import load_environment
from server.types import Calibration, Record, RecordKind

ROOT = config.ROOT
load_environment()
BUCKET = config.STORAGE_BUCKET
# Shipped configurations contain no videos or athlete measurements. Stable IDs keep
# uploaded sessions linked to the same coach across restarts.
PREMADE_COACHES = cast(
    list[Record], json.loads((config.BACKEND_ROOT / "server" / "premade_coaches.json").read_text())
)


@lru_cache
def pool() -> ConnectionPool:
    """Share at most four database connections; allow a cold Neon compute to wake."""
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is missing. Add Neon credentials to .env.local.")
    return ConnectionPool(url, min_size=0, max_size=4, timeout=45, kwargs={"connect_timeout": 3})


@lru_cache
def s3() -> S3Client:
    """Use the S3-compatible protocol against Neon Object Storage; no AWS account is used."""
    if not os.getenv("NEON_STORAGE_ENDPOINT"):
        raise RuntimeError("Neon Object Storage credentials are missing.")
    return boto3.client(
        "s3",
        endpoint_url=os.environ["NEON_STORAGE_ENDPOINT"],
        aws_access_key_id=os.environ["NEON_STORAGE_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["NEON_STORAGE_SECRET_ACCESS_KEY"],
        region_name=config.STORAGE_REGION,
        config=Config(
            signature_version="s3v4",
            s3={"addressing_style": "path"},
            request_checksum_calculation="when_required",
            response_checksum_validation="when_required",
            connect_timeout=10,
            read_timeout=40,
        ),
    )


def tracking_status(value: Record, database_time: float) -> Record:
    """Project expired work as retryable using the same database clock that grants ownership."""
    if (
        value.get("status") in ("queued", "processing")
        and value.get("analysisRunId")
        and value.get("analysisLeaseUntil", 0) <= database_time
    ):
        return {
            **value,
            "status": "failed",
            "error": "Analysis stopped responding. Retry this video.",
        }
    return value


def records(kind: RecordKind) -> list[Record]:
    """Read saved records and append missing shipped coaches without creating athlete data."""
    with pool().connection() as con:
        saved = [
            tracking_status(cast(Record, row[0]), float(row[1]))
            if kind == "sessions" and row[0].get("analysisRunId")
            else cast(Record, row[0])
            for row in con.execute(
                "SELECT payload, EXTRACT(EPOCH FROM clock_timestamp()) FROM sportsbuilder_records WHERE kind=%s ORDER BY created_at DESC",
                (kind,),
            )
        ]
    if kind == "tools":
        saved_ids = {value["id"] for value in saved}
        return [value for value in saved if not value.get("deletedAt")] + [
            deepcopy(value) for value in PREMADE_COACHES if value["id"] not in saved_ids
        ]
    return saved


def get(kind: RecordKind, record_id: str) -> Record | None:
    """Resolve saved records and shipped coaches using the same stable identifiers."""
    with pool().connection() as con:
        row = con.execute(
            "SELECT payload, EXTRACT(EPOCH FROM clock_timestamp()) FROM sportsbuilder_records WHERE kind=%s AND id=%s",
            (kind, record_id),
        ).fetchone()
        if row:
            value = cast(Record, row[0])
            return (
                tracking_status(value, float(row[1]))
                if kind == "sessions" and value.get("analysisRunId")
                else value
            )
    if kind == "tools":
        return next(
            (deepcopy(value) for value in PREMADE_COACHES if value["id"] == record_id), None
        )
    return None


def save(kind: RecordKind, value: Mapping[str, object]) -> Record:
    """Create a record or replace an explicitly supplied complete configuration."""
    with pool().connection() as con:
        con.execute(
            "INSERT INTO sportsbuilder_records(kind,id,payload) VALUES(%s,%s,%s) ON CONFLICT(kind,id) DO UPDATE SET payload=EXCLUDED.payload",
            (kind, value["id"], Jsonb(value)),
        )
    return cast(Record, dict(value))


def patch(kind: RecordKind, record_id: str, fields: Mapping[str, object]) -> Record:
    """Atomically merge only owned fields, preserving concurrent calibration and job updates.

    PostgreSQL locks the row while merging. A deleted record stays deleted.
    """
    if "id" in fields:
        raise ValueError("A record identifier cannot change.")
    with pool().connection() as con:
        row = con.execute(
            "UPDATE sportsbuilder_records SET payload=payload || %s WHERE kind=%s AND id=%s RETURNING payload",
            (Jsonb(fields), kind, record_id),
        ).fetchone()
    if row is None:
        raise KeyError("Record not found.")
    return cast(Record, row[0])


def delete(kind: RecordKind, record_id: str) -> None:
    with pool().connection() as con:
        con.execute("DELETE FROM sportsbuilder_records WHERE kind=%s AND id=%s", (kind, record_id))


def put(key: str, data: bytes, content_type: str) -> None:
    s3().put_object(Bucket=BUCKET, Key=key, Body=data, ContentType=content_type)


def read(key: str) -> bytes:
    return s3().get_object(Bucket=BUCKET, Key=key)["Body"].read()


def url(key: str) -> str:
    return s3().generate_presigned_url(
        "get_object", Params={"Bucket": BUCKET, "Key": key}, ExpiresIn=900
    )


def remove(key: str) -> None:
    s3().delete_object(Bucket=BUCKET, Key=key)


def save_height_calibration(
    record_id: str,
    calibration: Calibration,
    expected: Calibration | None = None,
    run_id: str | None = None,
) -> bool:
    """Set an automatic scale without replacing manual calibration or concurrent edits.

    Profile edits may rescale an existing height-based calibration only when its
    complete previous value still matches. A later user edit always wins.
    """
    if expected is None:
        condition = "(payload->'calibration' IS NULL OR payload->'calibration'='null'::jsonb OR payload#>>'{calibration,source}'='athlete_height_auto')"
        parameters = (Jsonb(calibration), record_id)
    else:
        condition = "payload->'calibration'=%s"
        parameters = (Jsonb(calibration), record_id, Jsonb(expected))
    if run_id is not None:
        condition += " AND payload->>'analysisRunId'=%s AND (payload->>'analysisLeaseUntil')::double precision > EXTRACT(EPOCH FROM clock_timestamp())"
        parameters += (run_id,)
    from psycopg import sql

    query = sql.SQL(
        "UPDATE sportsbuilder_records SET payload=jsonb_set(payload,'{{calibration}}',%s) WHERE kind='sessions' AND id=%s AND {} RETURNING id"
    ).format(sql.SQL(condition))
    with pool().connection() as con:
        return con.execute(query, parameters).fetchone() is not None


def claim_tracking(record_id: str, run_id: str) -> Record | None:
    """Atomically claim an idle or expired job; live and legacy running jobs stay owned.

    Database time decides expiry across computers. Completed footage is never recomputed.
    """
    with pool().connection() as con:
        row = con.execute(
            """UPDATE sportsbuilder_records SET payload=payload || jsonb_build_object(
                'analysisRunId',%s::text,'analysisLeaseUntil',EXTRACT(EPOCH FROM clock_timestamp())+%s,
                'status','queued','progress',0,'error',NULL,'stage','Queued')
                WHERE kind='sessions' AND id=%s AND payload->>'status'<>'complete'
                AND (CASE WHEN payload ? 'analysisRunId'
                    THEN COALESCE((payload->>'analysisLeaseUntil')::double precision,0)
                        <= EXTRACT(EPOCH FROM clock_timestamp())
                    ELSE payload->>'status' NOT IN ('queued','processing') END)
                RETURNING payload""",
            (run_id, config.TRACKING_LEASE_SECONDS, record_id),
        ).fetchone()
    return cast(Record, row[0]) if row else None


def update_tracking(
    record_id: str, run_id: str, fields: Mapping[str, object], renew: bool = False
) -> Record | None:
    """Write only while this unexpired run owns the recording; stale workers change nothing.

    Heartbeats extend ownership using database time. Terminal writes release the lease.
    """
    if any(key in fields for key in ("id", "analysisRunId", "analysisLeaseUntil")):
        raise ValueError("Tracking ownership cannot be replaced by a worker.")
    with pool().connection() as con:
        row = con.execute(
            """UPDATE sportsbuilder_records SET payload=payload || %s ||
                CASE WHEN %s THEN jsonb_build_object('analysisLeaseUntil',
                    EXTRACT(EPOCH FROM clock_timestamp())+%s)
                WHEN %s THEN jsonb_build_object('analysisLeaseUntil',0)
                ELSE '{}'::jsonb END
                WHERE kind='sessions' AND id=%s AND payload->>'analysisRunId'=%s
                AND (payload->>'analysisLeaseUntil')::double precision
                    > EXTRACT(EPOCH FROM clock_timestamp()) RETURNING payload""",
            (
                Jsonb(fields),
                renew,
                config.TRACKING_LEASE_SECONDS,
                fields.get("status") in ("complete", "failed", "uploaded"),
                record_id,
                run_id,
            ),
        ).fetchone()
    return cast(Record, row[0]) if row else None


def cancel_tracking(record_id: str) -> Record | None:
    """Revoke the current run atomically so a peer worker cannot publish after cancellation.

    A legacy unleased running job cannot be fenced, so preserve it until that app stops it.
    """
    with pool().connection() as con:
        row = con.execute(
            """UPDATE sportsbuilder_records SET payload=payload || jsonb_build_object(
                'status','uploaded','progress',0,'error',NULL,
                'stage','Analysis cancelled. Your video is saved.',
                'analysisRunId',NULL,'analysisLeaseUntil',0)
                WHERE kind='sessions' AND id=%s AND payload->>'status' IN ('queued','processing')
                AND payload->>'analysisRunId' IS NOT NULL RETURNING payload""",
            (record_id,),
        ).fetchone()
    return cast(Record, row[0]) if row else None


def analysis_result_unreferenced(record_id: str, key: str) -> bool:
    """Wait for an in-flight publisher before deciding whether its unique result can be removed.

    FOR UPDATE waits for any terminal transaction to commit or roll back; a plain read
    could see the previous payload while an unacknowledged commit is still pending.
    """
    with pool().connection() as con:
        row = con.execute(
            "SELECT payload->>'analysisKey' FROM sportsbuilder_records WHERE kind='sessions' AND id=%s FOR UPDATE",
            (record_id,),
        ).fetchone()
    return row is None or row[0] != key
