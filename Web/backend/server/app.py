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
from typing import Annotated, Literal, Self, cast
from uuid import UUID, uuid4

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel, Field, model_validator

from server import calibration, config, store, vision
from server.types import (
    Analysis,
    Calibration,
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
cancelled: set[str] = set()
run_ids: dict[str, str] = {}
CANCELLED_FIELDS: Record = {
    "status": "uploaded",
    "progress": 0,
    "stage": "Analysis cancelled. Your video is saved.",
    "error": None,
}
cache: dict[str, Analysis] = {}
tasks: set[asyncio.Task[None]] = set()


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
        data = cast(Analysis, json.loads(store.read(session["analysisKey"])))
        # Apply the current trusted numerical policy to saved tracks without
        # re-running inference or rewriting the athlete's stored analysis.
        vision.motion_derivatives(data["frames"])
        cache[session["id"]] = data
        if len(cache) > 8:
            cache.pop(next(iter(cache)))
    return cache[session["id"]]


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    # Database leases protect live work on other computers while expired work resumes.
    if config.HOSTED_MODE:
        await recover_tracking()
    recovery = asyncio.create_task(recovery_loop()) if config.HOSTED_MODE else None
    try:
        yield
    finally:
        if recovery:
            recovery.cancel()
        for task in list(tasks):
            task.cancel()
        await asyncio.gather(*([recovery] if recovery else []), *tasks, return_exceptions=True)


async def recover_tracking() -> None:
    """Claim saved pending jobs only when their database lease has expired."""
    for session in reversed(await asyncio.to_thread(store.records, "sessions")):
        identifier = session["id"]
        async with session_lock:
            if len(active) >= config.MAX_QUEUED_JOBS:
                break
            if identifier in active or session["status"] not in ("queued", "processing"):
                continue
            run_id = str(uuid4())
            claimed = await asyncio.to_thread(store.claim_tracking, identifier, run_id)
            if claimed is not None:
                active.add(identifier)
                run_ids[identifier] = run_id
                schedule_work(identifier)


async def recovery_loop() -> None:
    """Retry expired video jobs after crashes; transient database failures retry later."""
    while True:
        await asyncio.sleep(config.TRACKING_HEARTBEAT_SECONDS)
        try:
            await recover_tracking()
        except Exception:
            log.exception("Pending video recovery could not reach the database")


def schedule_work(session_id: str) -> None:
    """Retain video tasks until completion so shutdown can cancel their heartbeats."""
    task = asyncio.create_task(work(session_id))
    tasks.add(task)
    task.add_done_callback(tasks.discard)
    task.add_done_callback(lambda t: t.exception() if not t.cancelled() else None)


def tracking_status(session: Record) -> Record:
    """Expose expired owned work as retryable without mutating another computer’s records."""
    if (
        session.get("status") in ("queued", "processing")
        and session.get("analysisRunId")
        and session.get("analysisLeaseUntil", 0) <= datetime.now(UTC).timestamp()
    ):
        return {
            **session,
            "status": "failed",
            "error": "Analysis stopped responding. Retry this video.",
        }
    return session


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
        "sessions": cast(list[SessionRecord], [tracking_status(value) for value in values[2]]),
    }


class ProfileInput(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    heightCm: float | None = Field(default=None, ge=30, le=300)
    weightKg: float | None = Field(default=None, ge=1, le=600, allow_inf_nan=False)
    gender: str = Field(default="", max_length=100)
    dominantSide: str = "Right"
    experience: str = Field(default="", max_length=100)
    notes: str = Field(default="", max_length=1000)


@app.post("/api/profiles")
async def profile(data: ProfileInput) -> ProfileRecord:
    value = {**data.model_dump(), "id": str(uuid4())}
    return cast(ProfileRecord, await asyncio.to_thread(store.save, "profiles", value))


async def recalibrate_profile_sessions(profile_id: str, height_cm: float | None) -> None:
    """Rescale saved height references while preserving known-distance and user edits."""
    if height_cm is None:
        return
    for session in await asyncio.to_thread(store.records, "sessions"):
        if session["profileId"] != profile_id or session["status"] != "complete":
            continue
        existing = session.get("calibration")
        if (
            existing is not None
            and existing.get("source") in ("athlete_height_auto", "athlete_height_manual")
            and "bodyHeightPixels" in existing
            and "frameTime" in existing
        ):
            changed: Calibration = {
                **existing,
                "heightCm": height_cm,
                "metersPerPixel": height_cm / 100 / existing["bodyHeightPixels"],
            }
            await asyncio.to_thread(store.save_height_calibration, session["id"], changed, existing)
        elif existing is None:
            reference = session.get("heightReference")
            if reference is not None:
                changed = calibration.from_height(height_cm, reference, session["detectedGround"])
                await asyncio.to_thread(store.save_height_calibration, session["id"], changed)


class ProfileUpdate(BaseModel):
    model_config = {"extra": "forbid"}
    name: str | None = Field(default=None, min_length=1, max_length=80)
    heightCm: float | None = Field(default=None, ge=30, le=300, allow_inf_nan=False)
    weightKg: float | None = Field(default=None, ge=1, le=600, allow_inf_nan=False)
    gender: str = Field(default="", max_length=100)
    notes: str = Field(default="", max_length=1000)


@app.patch("/api/profiles/{profile_id}")
async def update_profile(profile_id: str, data: ProfileUpdate) -> ProfileRecord:
    """Save only edited profile fields; preserve identity, history, and other measurements."""
    await asyncio.to_thread(record, "profiles", profile_id)
    changes = data.model_dump(exclude_unset=True)
    if any(changes[key] is None for key in ("name", "heightCm") if key in changes):
        raise HTTPException(422, "Enter a name and an athlete height between 30 and 300 cm.")
    async with session_lock:
        saved = await asyncio.to_thread(store.patch, "profiles", profile_id, changes)
        if "heightCm" in changes:
            await recalibrate_profile_sessions(profile_id, data.heightCm)
    return cast(ProfileRecord, saved)


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


class ToolRename(BaseModel):
    model_config = {"extra": "forbid", "str_strip_whitespace": True}
    name: str = Field(min_length=1, max_length=120)


@app.patch("/api/tools/{tool_id}")
async def rename_tool(tool_id: str, data: ToolRename) -> ToolRecord:
    """Rename one coach while preserving its reviewed configuration and session links."""
    async with session_lock:
        value = await asyncio.to_thread(record, "tools", tool_id)
        if value.get("deletedAt"):
            raise HTTPException(404, "Coach not found.")
        value["name"] = data.name
        return cast(ToolRecord, await asyncio.to_thread(store.save, "tools", value))


@app.delete("/api/tools/{tool_id}")
async def delete_tool(tool_id: str) -> dict[str, bool]:
    """Hide a coach, retaining its configuration for previously recorded sessions.

    Persist shipped coaches too so they do not return on the next library load.
    """
    async with session_lock:
        value = await asyncio.to_thread(record, "tools", tool_id)
        value["deletedAt"] = now()
        await asyncio.to_thread(store.save, "tools", value)
    return {"deleted": True}


@app.post("/api/upload", response_model=None)
async def upload(
    file: Annotated[UploadFile, File()],
    profileId: str = Form(""),
    toolId: str = Form(""),
    interval: float = Form(config.DEFAULT_SAMPLE_INTERVAL),
    reference: bool = Form(False),
) -> SessionRecord:
    if (
        not math.isfinite(interval)
        or not config.MIN_SAMPLE_INTERVAL <= interval <= config.MAX_SAMPLE_INTERVAL
    ):
        raise HTTPException(422, "Use a sampling interval between 0.05 and 2 seconds.")
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
        preview_data = await asyncio.to_thread(vision.first_frame_preview, path)
        session_id = str(uuid4())
        preview_key = f"previews/{session_id}.jpg"
        key = f"videos/{session_id}{suffix}"
        try:
            await asyncio.to_thread(
                lambda: store.put(key, path.read_bytes(), file.content_type or "video/mp4")
            )
        except ValueError as error:
            raise HTTPException(507, str(error)) from error
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
            "previewKey": preview_key,
            "reference": reference,
            "completedDrills": [],
        }
        try:
            await asyncio.to_thread(store.put, preview_key, preview_data, "image/jpeg")
            await asyncio.to_thread(store.save, "sessions", value)
        except Exception:
            await asyncio.to_thread(store.remove, key)
            await asyncio.to_thread(store.remove, preview_key)
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
    run_id = run_ids.get(session_id)
    if not run_id:
        return

    async def heartbeat() -> None:
        # Vision and model loading run in a separate thread; ownership renews even before the first frame.
        try:
            while True:
                await asyncio.sleep(config.TRACKING_HEARTBEAT_SECONDS)
                saved = await asyncio.to_thread(store.update_tracking, session_id, run_id, {}, True)
                if saved is None:
                    cancelled.add(session_id)
                    return
        except asyncio.CancelledError:
            raise
        except Exception:
            # A disconnected worker must stop publishing rather than assume it still owns the job.
            cancelled.add(session_id)
            log.exception("Tracking heartbeat failed")

    heartbeat_task = asyncio.create_task(heartbeat())
    try:
        async with tracking_lock:
            async with session_lock:
                session = await asyncio.to_thread(record, "sessions", session_id)
                if session_id not in active or session_id in cancelled:
                    return
                saved = await asyncio.to_thread(
                    store.update_tracking,
                    session_id,
                    run_id,
                    {"status": "processing", "progress": 0.01},
                )
                if saved is None:
                    return
            suffix = Path(session["sourceKey"]).suffix
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as h:
                path = Path(h.name)
                h.write(await asyncio.to_thread(store.read, session["sourceKey"]))
            last = [0.0]

            def progress(value: float, message: str) -> bool:
                if session_id not in active or session_id in cancelled:
                    return False
                if value - last[0] > 0.05:
                    last[0] = value
                    saved = store.update_tracking(
                        session_id, run_id, {"progress": value, "stage": message}
                    )
                    if saved is None:
                        cancelled.add(session_id)
                        return False
                return True

            if session_id in cancelled:
                return
            analysis = await asyncio.to_thread(
                vision.analyze, path, session_id, session["interval"], progress
            )
            reference = analysis.get("heightReference")
            async with session_lock:
                # Cancellation and publishing share this lock; a late result cannot revive a stopped job.
                if session_id not in active or session_id in cancelled:
                    return
                key = f"analyses/{session_id}/{run_id}.json"
                await asyncio.to_thread(
                    store.put,
                    key,
                    json.dumps(analysis, allow_nan=False).encode(),
                    "application/json",
                )
                if reference is not None and session.get("profileId"):
                    athlete = await asyncio.to_thread(record, "profiles", session["profileId"])
                    height_cm = athlete.get("heightCm")
                    if height_cm is not None:
                        scale = calibration.from_height(height_cm, reference, analysis["ground"])
                        await asyncio.to_thread(
                            store.save_height_calibration, session_id, scale, None, run_id
                        )
                job_fields: Record = {
                    "status": "complete",
                    "progress": 1,
                    "analysisKey": key,
                    "stage": "Ready",
                }
                if reference is not None:
                    job_fields["heightReference"] = reference
                    job_fields["detectedGround"] = analysis["ground"]
                saved = await asyncio.to_thread(
                    store.update_tracking, session_id, run_id, job_fields
                )
                if saved is None:
                    await asyncio.to_thread(store.remove, key)
                    return
            cache[session_id] = analysis
            if len(cache) > 8:
                cache.pop(next(iter(cache)))
    except Exception as e:
        if session_id not in cancelled:
            log.exception("Tracking failed")
        if session and session_id in active and session_id not in cancelled:
            await asyncio.to_thread(
                store.update_tracking,
                session_id,
                run_id,
                {
                    "status": "failed",
                    "error": str(e)
                    if isinstance(e, ValueError)
                    else "Body tracking could not finish. Check model access and retry.",
                },
            )
    finally:
        heartbeat_task.cancel()
        await asyncio.gather(heartbeat_task, return_exceptions=True)
        active.discard(session_id)
        cancelled.discard(session_id)
        run_ids.pop(session_id, None)
        if path:
            path.unlink(missing_ok=True)


@app.post("/api/sessions/{session_id}/cancel", response_model=None)
async def cancel_tracking(session_id: str) -> SessionRecord:
    """Stop queued or active tracking while retaining the uploaded clip for retry.

    Completed recordings are unchanged. The worker stops at its next frame boundary
    and removes its temporary file before allowing another job for this recording.
    """
    async with session_lock:
        session = await asyncio.to_thread(record, "sessions", session_id)
        if session["status"] not in ("queued", "processing"):
            return cast(SessionRecord, session)
        saved = await asyncio.to_thread(store.cancel_tracking, session_id)
        if saved is None:
            raise HTTPException(
                409, "This video is running in an older app. Stop it there before retrying."
            )
        if session_id in active:
            cancelled.add(session_id)
        return cast(SessionRecord, saved)


@app.post("/api/sessions/{session_id}/analyze", response_model=None)
async def start(session_id: str) -> SessionRecord:
    async with session_lock:
        session = await asyncio.to_thread(record, "sessions", session_id)
        if session_id in cancelled:
            raise HTTPException(409, "The previous analysis is stopping. Retry in a moment.")
        if session_id in active:
            # Refuse a retry until the previous worker releases the failed recording.
            if session["status"] not in ("queued", "processing", "complete"):
                raise HTTPException(409, "The previous analysis is finishing. Retry in a moment.")
            return cast(SessionRecord, session)
        if session["status"] == "complete":
            return cast(SessionRecord, session)
        if len(active) >= config.MAX_QUEUED_JOBS:
            raise HTTPException(429, "Five clips are already queued. Wait for one to finish.")
        run_id = str(uuid4())
        claimed = await asyncio.to_thread(store.claim_tracking, session_id, run_id)
        if claimed is None:
            current = await asyncio.to_thread(record, "sessions", session_id)
            if current["status"] == "complete":
                return cast(SessionRecord, current)
            if current.get("analysisRunId"):
                if tracking_status(current)["status"] in ("queued", "processing"):
                    return cast(SessionRecord, current)
                raise HTTPException(409, "The previous analysis is finishing. Retry in a moment.")
            raise HTTPException(
                409, "This video is running in an older app. Stop it there before retrying."
            )
        session = claimed
        active.add(session_id)
        run_ids[session_id] = run_id
        schedule_work(session_id)
        return cast(SessionRecord, session)


@app.get("/api/sessions/{session_id}", response_model=None)
async def session_get(session_id: str) -> SessionRecord:
    return cast(
        SessionRecord, tracking_status(await asyncio.to_thread(record, "sessions", session_id))
    )


@app.get("/api/sessions/{session_id}/preview")
async def preview(session_id: str) -> RedirectResponse:
    """Redirect directly to the private first-frame object, without loading analysis."""
    session = await asyncio.to_thread(record, "sessions", session_id)
    key = session.get("previewKey")
    if not key:
        raise HTTPException(404, "Video preview is not available yet.")
    return RedirectResponse(await asyncio.to_thread(store.url, key), status_code=307)


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
    source: Literal["athlete_height_auto", "athlete_height_manual", "known_distance"] | None = None
    heightCm: float | None = Field(default=None, ge=30, le=300, allow_inf_nan=False)
    bodyHeightPixels: float | None = Field(default=None, gt=0, allow_inf_nan=False)
    frameTime: float | None = Field(default=None, ge=0, allow_inf_nan=False)
    metersPerPixel: float = Field(gt=0, allow_inf_nan=False, strict=True)
    ground: float = Field(ge=0, le=config.MAX_VIDEO_DIMENSION, allow_inf_nan=False, strict=True)

    @model_validator(mode="after")
    def validate_height_scale(self) -> Self:
        if self.source in ("athlete_height_auto", "athlete_height_manual"):
            if self.heightCm is None or self.bodyHeightPixels is None or self.frameTime is None:
                raise ValueError(
                    "Height calibration needs the saved height, full-body span, and frame time."
                )
            expected = self.heightCm / 100 / self.bodyHeightPixels
            if not math.isclose(self.metersPerPixel, expected, rel_tol=1e-6):
                raise ValueError(
                    "The scale must match the athlete height divided by the selected body span."
                )
        return self


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
    if (
        update.calibration is not None
        and update.calibration.frameTime is not None
        and update.calibration.frameTime > value["duration"]
    ):
        raise HTTPException(422, "Choose a calibration frame inside the clip.")
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
        for key in [value.get("analysisKey"), value.get("sourceKey"), value.get("previewKey")]:
            if key:
                await asyncio.to_thread(store.remove, key)
        await asyncio.to_thread(store.delete, "sessions", session_id)
        cache.pop(session_id, None)
        return {"deleted": True}
