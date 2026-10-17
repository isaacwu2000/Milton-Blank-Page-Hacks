"""Check local Markdown links and skill frontmatter in agent guidance."""

import argparse
import re
from pathlib import Path
from urllib.parse import unquote


def check(root: Path) -> list[str]:
    """Return missing relative links and invalid discovery metadata."""
    errors = []
    files = [root / "AGENTS.md", *sorted((root / ".agents").rglob("*.md"))]
    files += [
        root / name for name in ("testing.md", "glossary.md") if (root / name).exists()
    ]
    for path in files:
        if not path.is_file() or "references/raw" in path.as_posix():
            continue
        text = path.read_text()
        if path.name == "SKILL.md":
            front = text.split("---", 2)
            if (
                len(front) < 3
                or front[0].strip()
                or not all(
                    re.search(rf"^{key}:\s*\S", front[1], re.MULTILINE)
                    for key in ("name", "description")
                )
            ):
                errors.append(
                    f"{path.relative_to(root)}: missing skill name/description"
                )
        text = re.sub(r"```.*?```", "", text, flags=re.DOTALL)
        for target in re.findall(r"\]\(([^)]+)\)", text):
            target = unquote(target.split("#", 1)[0])
            if (
                not target
                or re.match(r"[a-zA-Z][\w+.-]*:", target)
                or target.startswith("/")
            ):
                continue
            if not (path.parent / target).exists():
                errors.append(f"{path.relative_to(root)}: missing {target}")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--root", type=Path, default=Path(__file__).resolve().parents[1]
    )
    root = parser.parse_args().root.resolve()
    errors = check(root)
    for error in errors:
        print(error)
    if not errors:
        print("Agent guidance links and skill discovery metadata are valid.")
    return int(bool(errors))


if __name__ == "__main__":
    raise SystemExit(main())
