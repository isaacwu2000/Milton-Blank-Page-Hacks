"""Exercise the setup assistant in an isolated checkout without cloud calls."""

import json
import os
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[3]
BUN = shutil.which("bun")


@pytest.fixture
def checkout(tmp_path: Path) -> Path:
    if BUN is None:
        pytest.skip("Bun is needed for the TypeScript assistant integration test")
    folder = tmp_path / "project with spaces"
    (folder / "scripts").mkdir(parents=True)
    (folder / "Web/backend/agent").mkdir(parents=True)
    shutil.copy(ROOT / "scripts/setup.ts", folder / "scripts/setup.ts")
    shutil.copy(ROOT / "Web/backend/agent/config.ts", folder / "Web/backend/agent/config.ts")
    (folder / "package.json").write_text(
        json.dumps({"name": "setup-fixture", "scripts": {"build": "echo built"}})
    )
    subprocess.run(
        [str(BUN), "install", "--lockfile-only"], cwd=folder, check=True, capture_output=True
    )
    return folder


def environment(folder: Path) -> dict[str, str]:
    binaries = folder / "bin"
    binaries.mkdir()
    uv = binaries / "uv"
    uv.write_text('#!/bin/sh\nprintf "%s\\n" "$*" >> "$SETUP_CALLS"\nexit "${UV_EXIT:-0}"\n')
    uv.chmod(0o755)
    values = os.environ.copy()
    # The test must not use the developer's real credentials.
    for key in (
        "DATABASE_URL",
        "DATABASE_URL_UNPOOLED",
        "DAYTONA_API_KEY",
        "NEON_STORAGE_ENDPOINT",
        "NEON_STORAGE_ACCESS_KEY_ID",
        "NEON_STORAGE_SECRET_ACCESS_KEY",
        "OPENROUTER_API_KEY",
    ):
        values.pop(key, None)
    values.update(
        PATH=f"{binaries}:{values.get('PATH', '')}",
        SOL_PROVIDER="openrouter",
        SETUP_CALLS=str(folder / "calls"),
    )
    return values


def credentials(folder: Path) -> str:
    text = (
        "# Preserve this custom setting\nCUSTOM_SETTING=keep-me\n"
        + "\n".join(
            f'{key}="private-test-value"'
            for key in (
                "DATABASE_URL",
                "DAYTONA_API_KEY",
                "NEON_STORAGE_ENDPOINT",
                "NEON_STORAGE_ACCESS_KEY_ID",
                "NEON_STORAGE_SECRET_ACCESS_KEY",
                "OPENROUTER_API_KEY",
            )
        )
        + "\n"
    )
    (folder / ".env.local").write_text(text)
    return text


def run_setup(folder: Path, env: dict[str, str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [str(BUN), "scripts/setup.ts", "--no-start", "--non-interactive"],
        check=False,
        cwd=folder,
        env=env,
        capture_output=True,
        text=True,
        timeout=30,
    )


def test_existing_credentials_reused_and_cloud_steps_ordered(checkout: Path) -> None:
    env = environment(checkout)
    original = credentials(checkout)
    result = run_setup(checkout, env)
    assert result.returncode == 0, result.stderr
    assert "Using OpenRouter" in result.stdout
    assert "Setup complete" in result.stdout
    assert "private-test-value" not in result.stdout + result.stderr
    assert (checkout / ".env.local").read_text() == original
    calls = (checkout / "calls").read_text().splitlines()
    assert calls[0].startswith("sync --project Web/backend --locked --python 3.12")
    assert "scripts/migrate.py" in calls[1]
    assert "head_bucket" in calls[2]
    assert (checkout / ".sportsbuilder/setup.log").stat().st_mode & 0o777 == 0o600
    assert run_setup(checkout, env).returncode == 0
    assert (checkout / ".env.local").read_text() == original


def test_missing_credentials_fail_before_install_or_cloud_access(checkout: Path) -> None:
    env = environment(checkout)
    result = run_setup(checkout, env)
    assert result.returncode != 0
    assert "Neon database connection string is missing" in result.stderr
    assert not (checkout / "calls").exists()
    assert not (checkout / ".env.local").exists()


def test_failed_install_explains_recovery_without_printing_secrets(checkout: Path) -> None:
    env = environment(checkout)
    env["UV_EXIT"] = "7"
    credentials(checkout)
    result = run_setup(checkout, env)
    assert result.returncode != 0
    assert "run bash install.sh again" in result.stderr
    assert "private-test-value" not in result.stdout + result.stderr
    assert len((checkout / "calls").read_text().splitlines()) == 1
