#!/usr/bin/env bash
# Installs missing runtimes in the user's home, then opens the setup assistant.
# Requires only Bash and curl or wget; Python, pip, Node, and unzip are not needed.
set -euo pipefail

fail() { printf '\nSportsBuilder setup: %s\n' "$*" >&2; exit 1; }
trap 'printf "\nSetup stopped. Fix the error above, then run bash install.sh again. Existing settings are preserved.\n" >&2' ERR

# Parse options before checking or installing anything.
for argument in "$@"; do
  case "$argument" in
    --help|-h)
      printf 'Usage: bash install.sh [--no-start] [--non-interactive]\n\nInstalls missing runtimes and SportsBuilder, then starts the app.\n  --no-start         Install and configure without starting the app.\n  --non-interactive  Use credentials already in .env.local, .env, or the environment.\n'
      exit 0
      ;;
    --no-start|--non-interactive) ;;
    *) fail "Unknown option: $argument. Run bash install.sh --help." ;;
  esac
done

case "$(uname -s)" in
  Darwin|Linux) ;;
  MINGW*|MSYS*|CYGWIN*) fail 'On Windows, run: powershell -NoProfile -ExecutionPolicy Bypass -File "./install.ps1" (or use Windows WSL with bash install.sh).' ;;
  *) fail 'Use macOS/Linux with bash install.sh, or Windows with install.ps1.' ;;
esac

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"
export PATH="$HOME/.bun/bin:$HOME/.local/bin:$PATH"
TEMP_DIR="$(mktemp -d)"
trap 'rm -rf -- "$TEMP_DIR"' EXIT

# Download to a file so a failed transfer never executes a partial installer.
download() {
  if command -v curl >/dev/null 2>&1; then
    curl --fail --location --silent --show-error --retry 2 --output "$2" "$1"
  elif command -v wget >/dev/null 2>&1; then
    wget --quiet --https-only --output-document="$2" "$1"
  else
    fail 'Install curl or wget with your system package manager, then rerun this script.'
  fi
}

printf 'Setting up SportsBuilder…\n'
if ! command -v uv >/dev/null 2>&1; then
  printf 'Installing uv (Python dependency manager)…\n'
  download https://astral.sh/uv/install.sh "$TEMP_DIR/install-uv.sh"
  UV_INSTALL_DIR="$HOME/.local/bin" UV_NO_MODIFY_PATH=1 sh "$TEMP_DIR/install-uv.sh"
fi
uv --version >/dev/null
printf 'Preparing Python 3.12…\n'
uv python install 3.12
PYTHON_BIN="$(uv python find --managed-python 3.12)"

BUN_VERSION=1.4.2
NEEDS_BUN=1
if command -v bun >/dev/null 2>&1; then
  INSTALLED_BUN="$(bun --version 2>/dev/null || true)"
  if [[ "$INSTALLED_BUN" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+) ]] &&
     (( BASH_REMATCH[1] > 1 || (BASH_REMATCH[1] == 1 && BASH_REMATCH[2] > 4) ||
        (BASH_REMATCH[1] == 1 && BASH_REMATCH[2] == 4 && BASH_REMATCH[3] >= 2) )); then
    NEEDS_BUN=0
  fi
fi
if [[ "$NEEDS_BUN" = 1 ]]; then
  printf 'Installing Bun %s…\n' "$BUN_VERSION"
  case "$(uname -s)-$(uname -m)" in
    Darwin-arm64) BUN_TARGET=darwin-aarch64 ;;
    Darwin-x86_64) BUN_TARGET=darwin-x64 ;;
    Linux-aarch64|Linux-arm64) BUN_TARGET=linux-aarch64 ;;
    Linux-x86_64) BUN_TARGET=linux-x64 ;;
    *) fail 'This processor is unsupported. Use an Intel/AMD 64-bit or ARM64 computer.' ;;
  esac
  if [[ "$BUN_TARGET" = linux-* && -f /etc/alpine-release ]]; then
    BUN_TARGET="$BUN_TARGET-musl"
  fi
  BUN_RELEASE="https://github.com/oven-sh/bun/releases/download/bun-v$BUN_VERSION"
  BUN_ARCHIVE="bun-$BUN_TARGET.zip"
  download "$BUN_RELEASE/$BUN_ARCHIVE" "$TEMP_DIR/$BUN_ARCHIVE"
  download "$BUN_RELEASE/SHASUMS256.txt" "$TEMP_DIR/SHASUMS256.txt"
  # Verify the official checksum and extract only the executable, without unzip.
  "$PYTHON_BIN" - "$TEMP_DIR" "$BUN_ARCHIVE" "$HOME/.bun/bin/bun" <<'PY'
import hashlib
from pathlib import Path
import sys
import zipfile

folder, filename, destination = sys.argv[1:]
archive = Path(folder) / filename
checksums = (Path(folder) / "SHASUMS256.txt").read_text()
expected = next(
    (line.split()[0] for line in checksums.splitlines()
     if len(line.split()) == 2 and line.split()[1].lstrip("*").removeprefix("./") == filename),
    None,
)
if expected is None or hashlib.sha256(archive.read_bytes()).hexdigest() != expected:
    sys.exit("Bun download could not be verified. Please rerun setup.")
with zipfile.ZipFile(archive) as bundle:
    binary = bundle.read(f"{filename.removesuffix('.zip')}/bun")
target = Path(destination)
target.parent.mkdir(parents=True, exist_ok=True)
pending = target.with_name(".bun-installing")
pending.write_bytes(binary)
pending.chmod(0o755)
pending.replace(target)
PY
  hash -r
fi
bun --version >/dev/null
bun scripts/setup.ts "$@"
