"""Saved footage must reload as seekable browser-compatible MP4."""

import pytest
from fastapi.testclient import TestClient

from server import store
from server.app import app


def test_video_url_uses_local_seekable_playback(monkeypatch: pytest.MonkeyPatch):
    identifier = "00000000-0000-4000-8000-000000000001"
    monkeypatch.setattr(store, "get", lambda *_: {"id": identifier, "sourceKey": "clip.mov"})
    monkeypatch.setattr(store, "url", lambda _: "https://storage.example/clip.mov")
    response = TestClient(app).get(f"/api/sessions/{identifier}/video")
    assert response.json()["url"] == f"/api/sessions/{identifier}/playback"


def test_playback_reloads_and_supports_seeking(monkeypatch: pytest.MonkeyPatch, tmp_path):
    import json
    import shutil
    import subprocess

    from server import config, playback

    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        pytest.skip("FFmpeg is required for playback integration")
    source = tmp_path / "fixture.mov"
    subprocess.run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-f",
            "lavfi",
            "-i",
            "color=c=red:s=64x48:d=1",
            "-c:v",
            "libx264",
            str(source),
        ],
        check=True,
    )
    identifier = "00000000-0000-4000-8000-000000000001"
    monkeypatch.setattr(config, "ROOT", tmp_path)
    monkeypatch.setattr(store, "get", lambda *_: {"id": identifier, "sourceKey": "clip.mov"})
    reads = []

    def read(key):
        reads.append(key)
        return source.read_bytes()

    monkeypatch.setattr(store, "read", read)
    client = TestClient(app)
    for _ in range(2):
        url = client.get(f"/api/sessions/{identifier}/video").json()["url"]
        response = client.get(url, headers={"Range": "bytes=0-127"})
        assert response.status_code == 206
        assert response.headers["content-type"] == "video/mp4"
        assert len(response.content) == 128
        assert b"ftyp" in response.content
    assert reads == ["clip.mov"]
    path = playback.prepare("clip.mov")
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_streams", "-of", "json", str(path)],
        capture_output=True,
        text=True,
        check=True,
    )
    stream = json.loads(result.stdout)["streams"][0]
    assert (stream["codec_name"], stream["pix_fmt"]) == ("h264", "yuv420p")
    assert (stream["width"], stream["height"]) == (64, 48)
