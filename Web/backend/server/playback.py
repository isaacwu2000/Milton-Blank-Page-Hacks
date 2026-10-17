"""Prepare private, seekable MP4 copies without changing original footage or tracking."""

import hashlib
import subprocess
import tempfile
from pathlib import Path
from threading import Lock

from server import config, store

_lock = Lock()


def prepare(source_key: str) -> Path:
    """Cache H.264 playback by source key; serialize conversion and discard partial files.

    FFmpeg applies display rotation, matching the tracking decoder. Original audio
    is omitted because coaching playback needs motion only. No source is overwritten.
    """
    folder = config.ROOT / ".data" / "playback"
    target = folder / (hashlib.sha256(source_key.encode()).hexdigest() + ".mp4")
    with _lock:
        if target.is_file():
            return target
        folder.mkdir(parents=True, exist_ok=True, mode=0o700)
        with tempfile.TemporaryDirectory(dir=folder) as temporary:
            source = Path(temporary) / "source"
            output = Path(temporary) / "playback.mp4"
            source.write_bytes(store.read(source_key))
            try:
                subprocess.run(
                    [
                        "ffmpeg",
                        "-nostdin",
                        "-v",
                        "error",
                        "-i",
                        str(source),
                        "-map",
                        "0:v:0",
                        "-an",
                        "-c:v",
                        "libx264",
                        "-preset",
                        config.PLAYBACK_ENCODER_PRESET,
                        "-crf",
                        str(config.PLAYBACK_QUALITY),
                        "-pix_fmt",
                        "yuv420p",
                        "-vf",
                        "pad=ceil(iw/2)*2:ceil(ih/2)*2",
                        "-movflags",
                        "+faststart",
                        str(output),
                    ],
                    check=True,
                    capture_output=True,
                    timeout=config.PLAYBACK_TIMEOUT_SECONDS,
                )
            except (OSError, subprocess.SubprocessError) as error:
                raise RuntimeError(
                    "Playback preparation failed. Check the local FFmpeg installation."
                ) from error
            output.replace(target)
        return target


def discard(source_key: str) -> None:
    """Remove a local playback copy when its saved source is deleted."""
    with _lock:
        target = (
            config.ROOT
            / ".data"
            / "playback"
            / (hashlib.sha256(source_key.encode()).hexdigest() + ".mp4")
        )
        target.unlink(missing_ok=True)
