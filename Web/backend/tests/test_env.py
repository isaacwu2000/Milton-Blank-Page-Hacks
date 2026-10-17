"""Keep credential text identical across Bun and Python startup."""

import json
import os
import shutil
import subprocess
from pathlib import Path

import pytest

from server.env import load_environment

ROOT = Path(__file__).resolve().parents[3]
KEY = "OPENROUTER_API_KEY"


def saved_credentials(root: Path, value: object) -> None:
    folder = root / ".sportsbuilder"
    folder.mkdir(exist_ok=True)
    (folder / "credentials.json").write_text(json.dumps(value, ensure_ascii=False))


@pytest.mark.parametrize(
    "value",
    [
        "ordinary-credential",
        "demo$TEST_MARKER/${TEST_MARKER}",
        r"backslash\$TEST_MARKER/\\${TEST_MARKER}",
        "quote\" and apostrophe' and \\slash",
        "line\nbreak\tand café",
    ],
)
def test_installer_credentials_round_trip_in_bun_and_python(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, value: str
) -> None:
    bun = shutil.which("bun")
    if bun is None:
        pytest.skip("Bun is needed to check both runtimes")
    agent = tmp_path / "Web/backend/agent"
    agent.mkdir(parents=True)
    shutil.copy(ROOT / "Web/backend/agent/config.ts", agent / "config.ts")
    saved_credentials(tmp_path, {KEY: value})
    monkeypatch.delenv(KEY, raising=False)
    monkeypatch.setenv("TEST_MARKER", "must-not-expand")
    result = subprocess.run(
        [
            bun,
            "-e",
            (
                'await import("./Web/backend/agent/config.ts");'
                f"console.log(JSON.stringify(process.env.{KEY}))"
            ),
        ],
        cwd=tmp_path,
        env=os.environ.copy(),
        text=True,
        capture_output=True,
        check=True,
    )
    assert json.loads(result.stdout) == value
    load_environment(tmp_path)
    assert os.environ[KEY] == value


def test_nonempty_export_and_local_file_win_over_saved_credentials(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv(KEY, raising=False)
    saved_credentials(tmp_path, {KEY: "saved"})
    (tmp_path / ".env.local").write_text(f"{KEY}=local\n")
    (tmp_path / ".env").write_text(f"{KEY}=fallback\n")
    load_environment(tmp_path)
    assert os.environ[KEY] == "local"
    monkeypatch.setenv(KEY, r"inherited\$VALUE")
    load_environment(tmp_path)
    assert os.environ[KEY] == r"inherited\$VALUE"


def test_blank_environment_is_filled_and_unknown_keys_are_ignored(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv(KEY, " ")
    monkeypatch.delenv("SPORTSBUILDER_UNKNOWN_KEY", raising=False)
    saved_credentials(tmp_path, {KEY: "saved", "SPORTSBUILDER_UNKNOWN_KEY": "ignored"})
    load_environment(tmp_path)
    assert os.environ[KEY] == "saved"
    assert "SPORTSBUILDER_UNKNOWN_KEY" not in os.environ


@pytest.mark.parametrize("value", [[], {KEY: 123}, {KEY: " "}])
def test_invalid_credentials_fail_without_exposing_contents(tmp_path: Path, value: object) -> None:
    saved_credentials(tmp_path, value)
    with pytest.raises(RuntimeError, match=r"^Saved credentials could not be read\."):
        load_environment(tmp_path)


def test_malformed_json_error_does_not_expose_secret(tmp_path: Path) -> None:
    folder = tmp_path / ".sportsbuilder"
    folder.mkdir()
    (folder / "credentials.json").write_text('{"secret": "private-dummy-value')
    with pytest.raises(RuntimeError) as error:
        load_environment(tmp_path)
    assert "private-dummy-value" not in str(error.value)
