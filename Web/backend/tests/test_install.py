"""Exercise the public bootstrap with isolated tools and no network or installs."""

import hashlib
import io
import os
import shlex
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path
from typing import NamedTuple

import pytest

ROOT = Path(__file__).resolve().parents[3]


class Bootstrap(NamedTuple):
    root: Path
    home: Path
    tools: Path
    log: Path
    env: dict[str, str]


def executable(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.is_symlink():
        path.unlink()
    path.write_text("#!/bin/sh\nset -eu\n" + text)
    path.chmod(0o755)


@pytest.fixture
def bootstrap(tmp_path: Path) -> Bootstrap:
    root = tmp_path / "checkout with spaces"
    root.mkdir()
    shutil.copy2(ROOT / "install.sh", root / "install.sh")
    home = tmp_path / "user home"
    home.mkdir()
    tools = tmp_path / "tools"
    tools.mkdir()
    log = tmp_path / "calls"
    for command in ("dirname", "uname", "mktemp", "rm", "sh"):
        actual = shutil.which(command)
        assert actual is not None
        (tools / command).symlink_to(actual)
    env = dict(os.environ, HOME=str(home), PATH=str(tools), BOOTSTRAP_LOG=str(log))
    return Bootstrap(root, home, tools, log, env)


def uv_stub(path: Path) -> None:
    executable(
        path,
        'printf "uv %s\\n" "$*" >> "$BOOTSTRAP_LOG"\n'
        'if [ "$1 ${2:-}" = "python find" ]; then\n'
        f"  printf '%s\\n' {shlex.quote(sys.executable)}\nfi\n",
    )


def bun_stub(path: Path) -> None:
    executable(
        path,
        'printf "bun %s cwd=%s\\n" "$*" "$PWD" >> "$BOOTSTRAP_LOG"\n'
        'if [ "$1" = "--version" ]; then echo 1.4.2; fi\n',
    )


def run_bootstrap(fixture: Bootstrap, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["/bin/bash", str(fixture.root / "install.sh"), *args],
        cwd=fixture.home,
        env=fixture.env,
        text=True,
        capture_output=True,
        check=False,
        timeout=15,
    )


def test_existing_tools_skip_download_and_preserve_arguments(bootstrap: Bootstrap) -> None:
    uv_stub(bootstrap.tools / "uv")
    bun_stub(bootstrap.tools / "bun")
    result = run_bootstrap(bootstrap, "--no-start", "--non-interactive")
    assert result.returncode == 0, result.stderr
    calls = bootstrap.log.read_text()
    assert "uv python install 3.12" in calls
    assert "uv python find --managed-python 3.12" in calls
    assert f"bun scripts/setup.ts --no-start --non-interactive cwd={bootstrap.root}" in calls
    assert not (bootstrap.home / ".bun").exists()


def test_fresh_install_needs_no_python_node_pip_or_unzip(bootstrap: Bootstrap) -> None:
    assets = bootstrap.home / "assets"
    assets.mkdir()
    uv_stub(assets / "uv")
    bun_stub(assets / "bun")
    executable(
        assets / "uv-installer",
        f'mkdir -p "$UV_INSTALL_DIR"\ncp {shlex.quote(str(assets / "uv"))} "$UV_INSTALL_DIR/uv"\n',
    )
    # The official installer needs only standard Unix tools, not language runtimes.
    for command in ("mkdir", "cp"):
        actual = shutil.which(command)
        assert actual is not None
        (bootstrap.tools / command).symlink_to(actual)
    archive_buffer = io.BytesIO()
    with zipfile.ZipFile(archive_buffer, "w") as bundle:
        bundle.writestr("bun-darwin-aarch64/bun", (assets / "bun").read_bytes())
    archive = archive_buffer.getvalue()
    (assets / "bun.zip").write_bytes(archive)
    (assets / "SHASUMS256.txt").write_text(
        f"{hashlib.sha256(archive).hexdigest()}  bun-darwin-aarch64.zip\n"
    )
    executable(
        bootstrap.tools / "uname",
        'if [ "$1" = "-s" ]; then echo Darwin; else echo arm64; fi\n',
    )
    executable(
        bootstrap.tools / "curl",
        'while [ "$1" != "--output" ]; do shift; done\n'
        'destination="$2"; url="$3"\n'
        'case "$url" in\n'
        f'  */uv/install.sh) cp {shlex.quote(str(assets / "uv-installer"))} "$destination" ;;\n'
        f'  */SHASUMS256.txt) cp {shlex.quote(str(assets / "SHASUMS256.txt"))} "$destination" ;;\n'
        f'  *.zip) cp {shlex.quote(str(assets / "bun.zip"))} "$destination" ;;\n'
        "  *) exit 20 ;;\nesac\n",
    )
    result = run_bootstrap(bootstrap, "--no-start")
    assert result.returncode == 0, result.stderr
    assert (bootstrap.home / ".local/bin/uv").is_file()
    assert (bootstrap.home / ".bun/bin/bun").is_file()
    assert "bun scripts/setup.ts --no-start" in bootstrap.log.read_text()
    assert not (bootstrap.home / ".profile").exists()
    # A rerun reuses runtimes; it must not need a downloader.
    downloader = (bootstrap.tools / "curl").read_text()
    (bootstrap.tools / "curl").unlink()
    assert run_bootstrap(bootstrap, "--no-start").returncode == 0
    # An older Bun on the system path is replaced with the supported local version.
    (bootstrap.home / ".bun/bin/bun").unlink()
    bun_stub(bootstrap.tools / "bun")
    (bootstrap.tools / "bun").write_text(
        (bootstrap.tools / "bun").read_text().replace("echo 1.4.2", "echo 1.3.0")
    )
    (bootstrap.tools / "curl").write_text(downloader)
    (bootstrap.tools / "curl").chmod(0o755)
    upgraded = run_bootstrap(bootstrap, "--no-start")
    assert upgraded.returncode == 0, upgraded.stderr
    assert "echo 1.4.2" in (bootstrap.home / ".bun/bin/bun").read_text()
    # A modified archive must never become an executable.
    (bootstrap.home / ".bun/bin/bun").unlink()
    (assets / "bun.zip").write_bytes(b"corrupted download")
    failed = run_bootstrap(bootstrap)
    assert failed.returncode != 0
    assert "could not be verified" in failed.stderr
    assert not (bootstrap.home / ".bun/bin/bun").exists()


def test_missing_downloader_explains_recovery(bootstrap: Bootstrap) -> None:
    result = run_bootstrap(bootstrap)
    assert result.returncode != 0
    assert "Install curl or wget" in result.stderr


def test_windows_points_to_wsl(bootstrap: Bootstrap) -> None:
    executable(bootstrap.tools / "uname", "echo MINGW64_NT\n")
    result = run_bootstrap(bootstrap)
    assert result.returncode != 0
    assert "Windows WSL" in result.stderr
    assert not bootstrap.log.exists()


@pytest.mark.parametrize("argument", ["--help", "-h", "--unknown"])
def test_options_do_not_install_or_need_tools(bootstrap: Bootstrap, argument: str) -> None:
    bootstrap.env["PATH"] = str(bootstrap.home / "empty-tools")
    result = run_bootstrap(bootstrap, argument)
    if argument == "--unknown":
        assert result.returncode != 0
        assert "Unknown option" in result.stderr
    else:
        assert result.returncode == 0
        assert "Usage: bash install.sh" in result.stdout
    assert not bootstrap.log.exists()
    assert not (bootstrap.home / ".bun").exists()
    assert not (bootstrap.home / ".local").exists()
