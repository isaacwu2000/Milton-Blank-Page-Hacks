"""Load private connection details without changing inherited nonempty settings."""

import json
import os
from pathlib import Path

from dotenv import dotenv_values

from server import config

CREDENTIAL_KEYS = (
    "DATABASE_URL",
    "DATABASE_URL_UNPOOLED",
    "DAYTONA_API_KEY",
    "NEON_STORAGE_ENDPOINT",
    "NEON_STORAGE_ACCESS_KEY_ID",
    "NEON_STORAGE_SECRET_ACCESS_KEY",
    "OPENROUTER_API_KEY",
)


def load_environment(root: Path = config.ROOT) -> None:
    """Reuse environment files, then fill missing credentials from the installer.

    JSON preserves dollar signs, quotes, and backslashes in newly entered secrets.
    Existing nonempty environment values take precedence. Invalid saved data fails
    with a safe error that contains no credential text.
    """
    for name in (".env.local", ".env"):
        for key, value in dotenv_values(root / name, interpolate=False).items():
            if value is not None and not os.environ.get(key, "").strip():
                os.environ[key] = value
    path = root / ".sportsbuilder/credentials.json"
    if not path.exists():
        return
    try:
        credentials: object = json.loads(path.read_text())
        if not isinstance(credentials, dict):
            raise TypeError
        for key in CREDENTIAL_KEYS:
            if key in credentials and (
                not isinstance(credentials[key], str) or not credentials[key].strip()
            ):
                raise ValueError
    except (OSError, TypeError, ValueError):
        raise RuntimeError(
            "Saved credentials could not be read. Rename .sportsbuilder/credentials.json and rerun bash install.sh to enter them again."
        ) from None
    for key in CREDENTIAL_KEYS:
        if key in credentials and not os.environ.get(key, "").strip():
            os.environ[key] = credentials[key]
