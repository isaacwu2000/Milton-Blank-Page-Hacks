import asyncio
import json
import logging
import math
import os
import tempfile
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated, cast
from uuid import UUID, uuid4

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from server import config, store, vision
from server.types import (
    Analysis,
    HomeData,
    ProfileRecord,
    Record,
    RecordKind,
    SessionRecord,
    ToolRecord,
)

log = logging.getLogger("sportsbuilder")
tracking_lock = asyncio.Lock()
session_lock = asyncio.Lock()
active: set[str] = set()
cache: dict[str, Analysis] = {}


def now() -> str:
    return datetime.now(UTC).isoformat()


def record(kind: RecordKind, key: str) -> Record:
    try:
        UUID(key)
    except ValueError:
        raise HTTPException(404, "Record not found.")
    value = store.get(kind, key)
    if not value:
        raise HTTPException(404, "Record not found.")
    return value


def load_analysis(session: Record) -> Analysis:
    if session["id"] not in cache:
        cache[session["id"]] = cast(Analysis, json.loads(store.read(session["analysisKey"])))
        if len(cache) > 8:
            cache.pop(next(iter(cache)))
    return cache[session["id"]]


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    # A single worker owns jobs; an interrupted process cannot leave a fake running state.
    try:
        for session in await asyncio.to_thread(store.records, "sessions"):
            if session["status"] in ("queued", "processing"):
                await asyncio.to_thread(
                    store.patch,
                    "sessions",
                    session["id"],
                    {"status": "failed", "error": "Analysis was interrupted. Retry this video."},
                )
    except Exception:
        log.exception("Database unavailable at startup")
    yield


app = FastAPI(title="SportsBuilder", lifespan=lifespan)


@app.exception_handler(Exception)
async def failure(request: Request, exc: Exception) -> JSONResponse:
    log.error("Request failed: %s", type(exc).__name__)
    return JSONResponse(
        status_code=503,
        content={
            "detail": "The service could not complete this request. Check local service configuration and retry."
        },
    )


@app.get("/api/health")
async def health() -> dict[str, bool]:
    return {
        "ok": True,
        "database": bool(os.getenv("DATABASE_URL")),
        "storage": bool(os.getenv("NEON_STORAGE_ENDPOINT")),
    }


@app.get("/api/home")
async def home() -> HomeData:
    values = await asyncio.gather(
        *[asyncio.to_thread(store.records, k) for k in ("profiles", "tools", "sessions")]
    )
    return {
        "profiles": cast(list[ProfileRecord], values[0]),
        "tools": cast(list[ToolRecord], values[1]),
        "sessions": cast(list[SessionRecord], values[2]),
    }


class ProfileInput(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    heightCm: float | None = Field(default=None, ge=30, le=300)
    weightKg: float | None = Field(default=None, ge=1, le=600)
    dominantSide: str = "Right"
    experience: str = Field(default="", max_length=100)
    notes: str = Field(default="", max_length=1000)


@app.post("/api/profiles")
async def profile(data: ProfileInput) -> ProfileRecord:
    value = {**data.model_dump(), "id": str(uuid4())}
    return cast(ProfileRecord, await asyncio.to_thread(store.save, "profiles", value))


@app.post("/api/tools")
async def save_tool(request: Request) -> ToolRecord:
    # Only the loopback agent service can publish a reviewed configuration.
    import hmac
    import os

    if not hmac.compare_digest(
        request.headers.get("x-agent-secret", ""),
        os.environ.get("AGENT_INTERNAL_SECRET", "disabled"),
    ):
        raise HTTPException(403, "Tools must be created by the builder.")
    value = cast(Record, await request.json())
    value.update(id=str(uuid4()), createdAt=now())
    async with session_lock:
        if value.get("referenceId"):
            await asyncio.to_thread(record, "sessions", value["referenceId"])
        return cast(ToolRecord, await asyncio.to_thread(store.save, "tools", value))


@app.post("/api/upload", response_model=None)
async def upload(
    file: Annotated[UploadFile, File()],
    profileId: str = Form(""),
    toolId: str = Form(""),
    interval: float = Form(config.DEFAULT_SAMPLE_INTERVAL),
    reference: bool = Form(False),
) -> SessionRecord:
    if not math.isfinite(interval) or not 0.033 <= interval <= 1:
        raise HTTPException(422, "Use a sampling interval between 0.033 and 1 second.")
    if not reference:
        await asyncio.to_thread(record, "profiles", profileId)
        await asyncio.to_thread(record, "tools", toolId)
    if file.content_type not in (
        "video/mp4",
        "video/quicktime",
        "video/webm",
        "video/x-m4v",
        "video/avi",
        "video/x-msvideo",
    ):
        raise HTTPException(415, "Upload an MP4, MOV, or WebM video.")
    suffix = Path(file.filename or "video.mp4").suffix.lower()
    if suffix not in (".mp4", ".mov", ".webm", ".m4v", ".avi"):
        suffix = ".mp4"
    path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as handle:
            path = Path(handle.name)
            total = 0
            while chunk := await file.read(1024 * 1024):
                total += len(chunk)
                if total > config.MAX_UPLOAD_BYTES:
                    raise HTTPException(413, "Use a video smaller than 100 MiB.")
                handle.write(chunk)
        try:
            info = await asyncio.to_thread(vision.inspect_video, path)
        except ValueError as e:
            raise HTTPException(422, str(e))
        session_id = str(uuid4())
        key = f"videos/{session_id}{suffix}"
        await asyncio.to_thread(
            lambda: store.put(key, path.read_bytes(), file.content_type or "video/mp4")
        )
        value: Record = {
            "id": session_id,
            "name": (file.filename or "Video")[:160],
            "profileId": profileId,
            "toolId": toolId,
            "createdAt": now(),
            "status": "uploaded",
            "progress": 0,
            "duration": info.duration,
            "interval": interval,
            "sourceKey": key,
            "reference": reference,
            "completedDrills": [],
        }
        try:
            await asyncio.to_thread(store.save, "sessions", value)
        except Exception:
            await asyncio.to_thread(store.remove, key)
            raise
        return cast(SessionRecord, value)
    finally:
        if path:
            path.unlink(missing_ok=True)
        await file.close()


async def work(session_id: str) -> None:
    """Process one clip serially; write only job fields so user edits survive progress saves.

    Failed jobs remain retryable, original videos persist, and temporary files are removed.
    """
    session = None
    path = None
    try:
        async with tracking_lock:
            session = await asyncio.to_thread(record, "sessions", session_id)
            if session_id not in active:
                return
            await asyncio.to_thread(
                store.patch, "sessions", session_id, {"status": "processing", "progress": 0.01}
            )
            suffix = Path(session["sourceKey"]).suffix
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as h:
                path = Path(h.name)
                h.write(await asyncio.to_thread(store.read, session["sourceKey"]))
            last = [0.0]

            def progress(value: float, message: str) -> bool:
                if session_id not in active:
                    return False
                if value - last[0] > 0.05:
                    last[0] = value
                    store.patch("sessions", session_id, {"progress": value, "stage": message})
                return True

            analysis = await asyncio.to_thread(
                vision.analyze, path, session_id, session["interval"], progress
            )
            if session_id not in active:
                return
            key = f"analyses/{session_id}.json"
            await asyncio.to_thread(
                store.put, key, json.dumps(analysis, allow_nan=False).encode(), "application/json"
            )
            await asyncio.to_thread(
                store.patch,
                "sessions",
                session_id,
                {"status": "complete", "progress": 1, "analysisKey": key, "stage": "Ready"},
            )
            cache[session_id] = analysis
            if len(cache) > 8:
                cache.pop(next(iter(cache)))
    except Exception as e:
        log.exception("Tracking failed")
        if session and session_id in active:
            await asyncio.to_thread(
                store.patch,
                "sessions",
                session_id,
                {
                    "status": "failed",
                    "error": str(e)
                    if isinstance(e, ValueError)
                    else "Body tracking could not finish. Check model access and retry.",
                },
            )
    finally:
        active.discard(session_id)
        if path:
            path.unlink(missing_ok=True)


@app.post("/api/sessions/{session_id}/analyze", response_model=None)
async def start(session_id: str) -> SessionRecord:
    async with session_lock:
        session = await asyncio.to_thread(record, "sessions", session_id)
        if session_id in active:
            return cast(SessionRecord, session)
        if len(active) >= config.MAX_QUEUED_JOBS:
            raise HTTPException(429, "Three clips are already queued. Wait for one to finish.")
        active.add(session_id)
        try:
            session = await asyncio.to_thread(
                store.patch,
                "sessions",
                session_id,
                {"status": "queued", "progress": 0, "error": None},
            )
        except Exception:
            active.discard(session_id)
            raise
        task = asyncio.create_task(work(session_id))
        task.add_done_callback(lambda t: t.exception() if not t.cancelled() else None)
        return cast(SessionRecord, session)


@app.get("/api/sessions/{session_id}", response_model=None)
async def session_get(session_id: str) -> SessionRecord:
    return cast(SessionRecord, await asyncio.to_thread(record, "sessions", session_id))


@app.get("/api/sessions/{session_id}/video")
async def video(session_id: str) -> dict[str, str]:
    session = await asyncio.to_thread(record, "sessions", session_id)
    return {"url": await asyncio.to_thread(store.url, session["sourceKey"])}


@app.get("/api/sessions/{session_id}/analysis")
async def analysis_get(session_id: str, images: bool = False) -> Analysis:
    session = await asyncio.to_thread(record, "sessions", session_id)
    if session["status"] != "complete":
        raise HTTPException(409, "Analysis is not ready yet.")
    data = await asyncio.to_thread(load_analysis, session)
    if images:
        return data
    return {
        **data,
        "frames": [{"time": f["time"], "joints": f["joints"]} for f in data["frames"]],
    }


class CalibrationInput(BaseModel):
    model_config = {"extra": "forbid"}
    metersPerPixel: float = Field(gt=0, allow_inf_nan=False, strict=True)
    ground: float = Field(ge=0, le=config.MAX_VIDEO_DIMENSION, allow_inf_nan=False, strict=True)


class AlignmentInput(BaseModel):
    model_config = {"extra": "forbid"}
    current: float = Field(ge=0, allow_inf_nan=False, strict=True)
    reference: float = Field(ge=0, allow_inf_nan=False, strict=True)


class SessionUpdate(BaseModel):
    model_config = {"extra": "forbid"}
    ground: float | None = Field(
        default=None, ge=0, le=config.MAX_VIDEO_DIMENSION, allow_inf_nan=False, strict=True
    )
    calibration: CalibrationInput | None = None
    alignment: AlignmentInput | None = None
    completedDrills: list[str] | None = Field(default=None, max_length=100)


@app.patch("/api/sessions/{session_id}", response_model=None)
async def update_session(session_id: str, update: SessionUpdate) -> SessionRecord:
    """Validate and atomically save user fields without overwriting running job state."""
    value = await asyncio.to_thread(record, "sessions", session_id)
    height = config.MAX_VIDEO_DIMENSION
    if value.get("analysisKey"):
        height = (await asyncio.to_thread(load_analysis, value))["height"]
    if update.ground is not None and update.ground > height:
        raise HTTPException(422, "Ground must be inside the video frame.")
    if update.calibration is not None and update.calibration.ground > height:
        raise HTTPException(422, "Ground must be inside the video frame.")
    if update.alignment is not None:
        if update.alignment.current > value["duration"]:
            raise HTTPException(422, "Choose alignment times inside the clips.")
        tool = await asyncio.to_thread(record, "tools", value["toolId"])
        if tool.get("referenceId"):
            reference = await asyncio.to_thread(record, "sessions", tool["referenceId"])
            if update.alignment.reference > reference["duration"]:
                raise HTTPException(422, "Choose alignment times inside the clips.")
    return cast(
        SessionRecord,
        await asyncio.to_thread(
            store.patch, "sessions", session_id, update.model_dump(exclude_unset=True)
        ),
    )


@app.delete("/api/sessions/{session_id}")
async def delete_session(session_id: str) -> dict[str, bool]:
    async with session_lock:
        if session_id in active:
            raise HTTPException(409, "Wait for analysis to finish before deleting this video.")
        value = await asyncio.to_thread(record, "sessions", session_id)
        for tool in await asyncio.to_thread(store.records, "tools"):
            if tool.get("referenceId") == session_id:
                raise HTTPException(
                    409, "This video is a saved tool’s reference and cannot be deleted."
                )
        for key in [value.get("analysisKey"), value.get("sourceKey")]:
            if key:
                await asyncio.to_thread(store.remove, key)
        await asyncio.to_thread(store.delete, "sessions", session_id)
        cache.pop(session_id, None)
        return {"deleted": True}
