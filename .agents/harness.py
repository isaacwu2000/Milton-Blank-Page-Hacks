"""Find the developer's central harness clone and resolve a live workflow."""

import os
import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
config = subprocess.run(
    ["git", "-C", str(root), "config", "--local", "--get", "harness.source"],
    capture_output=True,
    text=True,
    check=False,
)
global_adapter = Path.home() / ".agents/skills/coding-harness"
candidates = [
    os.environ.get("CODING_HARNESS_HOME"),
    config.stdout.strip(),
    root.parent / "Coding-Agent-Harness",
    global_adapter.resolve().parents[2] if global_adapter.exists() else None,
]
for candidate in candidates:
    if candidate:
        source = Path(candidate).expanduser().resolve()
        helper = source / ".agents/skills/coding-harness/scripts/link.py"
        if helper.is_file():
            os.execv(
                sys.executable,
                [
                    sys.executable,
                    str(helper),
                    "--source",
                    str(source),
                    "--target",
                    str(root),
                    *sys.argv[1:],
                ],
            )
raise SystemExit(
    "Clone https://github.com/isaacwu2000/Coding-Agent-Harness.git locally, then set CODING_HARNESS_HOME or git config --local harness.source /absolute/clone/path. See .agents/HARNESS.md."
)
