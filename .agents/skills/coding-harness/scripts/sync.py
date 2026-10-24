"""Preview and sync reviewed, versioned harness files into a Git repository."""

import argparse
import hashlib
import json
import os
import stat
import subprocess
import tempfile
from pathlib import Path, PurePosixPath
from urllib.parse import urlsplit, urlunsplit

PACKAGES = ("coding-harness", "development", "impeccable", "writing-for-agents")
ROOTS = tuple(f".agents/skills/{name}" for name in PACKAGES) + (
    ".agents/skills/check_links.py",
)
MANIFEST = ".agents/harness.json"
IGNORED = {"__pycache__", ".DS_Store"}
SOURCE_URL = "https://github.com/isaacwu2000/Coding-Agent-Harness.git"


class SyncError(Exception):
    """An invalid source or changed local file prevents a safe sync."""


def git(root, *args):
    result = subprocess.run(
        ["git", "-C", str(root), *args], capture_output=True, text=True, check=False
    )
    if result.returncode:
        raise SyncError(result.stderr.strip() or "Git operation failed")
    return result.stdout.strip()


def source_repository(root):
    """Record the clone/fork origin without embedding HTTP credentials."""
    origin = git(root, "remote", "get-url", "origin")
    if origin.startswith(("https://", "http://", "ssh://")):
        parts = urlsplit(origin)
        host = parts.hostname or ""
        if parts.port:
            host += f":{parts.port}"
        return urlunsplit((parts.scheme, host, parts.path, "", ""))
    if origin.startswith("git@") and ":" in origin:
        return origin
    raise SyncError("Source needs a portable HTTP/SSH origin URL")


def repository(path):
    root = Path(path).resolve()
    if Path(git(root, "rev-parse", "--show-toplevel")).resolve() != root:
        raise SyncError("Target/source must be a repository root")
    return root


def managed(name):
    path = PurePosixPath(name)
    return (
        isinstance(name, str)
        and not path.is_absolute()
        and ".." not in path.parts
        and path.as_posix() == name
        and (
            name == ROOTS[-1]
            or any(name.startswith(prefix + "/") for prefix in ROOTS[:-1])
        )
    )


def safe_path(root, name):
    path = root / name
    current = root
    for part in PurePosixPath(name).parts:
        current = current / part
        if current.is_symlink():
            raise SyncError(f"Refusing symlink in managed path: {name}")
        if current != path and current.exists() and not current.is_dir():
            raise SyncError(f"Parent is not a directory: {name}")
    if path.exists() and not path.is_file():
        raise SyncError(f"Managed path is not a regular file: {name}")
    return path


def fingerprint(path):
    if not path.exists():
        return None
    return {
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "executable": bool(path.stat().st_mode & stat.S_IXUSR),
    }


def inventory(root):
    found = {}
    for prefix in ROOTS:
        start = root / prefix
        if start.is_symlink():
            raise SyncError(f"Refusing symlink in managed path: {prefix}")
        paths = (
            [start]
            if start.is_file()
            else sorted(start.rglob("*"))
            if start.exists()
            else []
        )
        for path in paths:
            if any(
                part in IGNORED or part.endswith(".pyc")
                for part in path.relative_to(start.parent).parts
            ):
                continue
            if path.is_symlink():
                raise SyncError(
                    f"Refusing source/target symlink: {path.relative_to(root)}"
                )
            if path.is_file():
                name = path.relative_to(root).as_posix()
                found[name] = fingerprint(safe_path(root, name))
    return found


def validate_fingerprints(files):
    if not isinstance(files, dict):
        raise SyncError("Expected a file fingerprint mapping")
    for name, value in files.items():
        if not managed(name) or not isinstance(value, dict):
            raise SyncError(f"Invalid managed path/fingerprint: {name}")
        digest = value.get("sha256")
        if (
            not isinstance(digest, str)
            or len(digest) != 64
            or any(c not in "0123456789abcdef" for c in digest)
            or not isinstance(value.get("executable"), bool)
        ):
            raise SyncError(f"Invalid fingerprint: {name}")


def read_json(path):
    try:
        data = json.loads(path.read_text())
    except (OSError, ValueError) as error:
        raise SyncError(f"Cannot read {path.name}: {error}") from error
    if (
        not isinstance(data, dict)
        or type(data.get("schemaVersion")) is not int
        or data.get("schemaVersion") != 1
    ):
        raise SyncError(f"Unsupported {path.name} schema; expected schemaVersion 1")
    validate_fingerprints(data.get("files"))
    return data


def snapshot(target, output):
    target = repository(target)
    # Explicitly chosen scratch output, never an automatic adoption permission.
    payload = {"schemaVersion": 1, "target": str(target), "files": inventory(target)}
    Path(output).write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")
    return payload


def public_plan(plan):
    return {key: value for key, value in plan.items() if not key.startswith("_")}


def build_plan(source, target, baseline=None):
    source, target = repository(source), repository(target)
    if source == target:
        raise SyncError("Source and target must be different repositories")
    revision = git(source, "rev-parse", "HEAD")
    origin = source_repository(source)
    if git(source, "status", "--porcelain", "--untracked-files=all", "--", *ROOTS):
        raise SyncError(
            "Commit shared source changes before syncing; source must identify an exact clean revision"
        )
    manifest_path = safe_path(target, MANIFEST)
    previous = read_json(manifest_path) if manifest_path.exists() else None
    if previous is not None:
        if previous.get("sourceRepository") != origin:
            raise SyncError("Manifest belongs to another harness source")
        pinned = previous.get("sourceRevision")
        if (
            not isinstance(pinned, str)
            or len(pinned) != 40
            or any(c not in "0123456789abcdef" for c in pinned)
        ):
            raise SyncError("Manifest sourceRevision must be a full Git commit SHA")
    if baseline and previous:
        raise SyncError("Adoption baseline is only valid before the first managed sync")
    baseline_data = read_json(Path(baseline)) if baseline else None
    if baseline_data and baseline_data.get("target") != str(target):
        raise SyncError("Adoption baseline belongs to another target")
    adopted = baseline_data["files"] if baseline_data else {}
    old_files = previous["files"] if previous else {}
    incoming = inventory(source)
    if any(not (source / prefix / "SKILL.md").is_file() for prefix in ROOTS[:-1]):
        raise SyncError("Source is missing a required harness skill")
    tracked = set(git(source, "ls-files", "--", *ROOTS).splitlines())
    if set(incoming) - tracked:
        raise SyncError("Source contains untracked shared files")
    payloads = {name: (source / name).read_bytes() for name in incoming}
    if revision != git(source, "rev-parse", "HEAD") or inventory(source) != incoming:
        raise SyncError("Source changed while preparing the plan")
    actions, conflicts, before = [], [], {}
    for name in sorted(incoming.keys() | old_files.keys()):
        current = fingerprint(safe_path(target, name))
        before[name] = current
        desired, previous_value = incoming.get(name), old_files.get(name)
        if current == desired:
            action = "unchanged"
        elif previous_value is not None and current == previous_value:
            action = "remove" if desired is None else "update"
        elif previous_value is None and current is None:
            action = "add"
        elif (
            previous_value is None
            and adopted.get(name) == current
            and current is not None
        ):
            action = "adopt"
        else:
            action = "conflict"
            conflicts.append(name)
        actions.append({"path": name, "action": action})
    manifest = {
        "schemaVersion": 1,
        "sourceRepository": origin,
        "sourceRevision": revision,
        "packages": list(PACKAGES),
        "files": incoming,
    }
    # Explicit hashes bind preview to current target, prior manifest, and incoming content.
    material = {
        "sourceRepository": origin,
        "sourceRevision": revision,
        "incoming": incoming,
        "before": before,
        "manifestBefore": fingerprint(manifest_path),
        "actions": actions,
    }
    digest = hashlib.sha256(json.dumps(material, sort_keys=True).encode()).hexdigest()
    return {
        "sourceRepository": origin,
        "sourceRevision": revision,
        "target": str(target),
        "planDigest": digest,
        "counts": {
            action: sum(item["action"] == action for item in actions)
            for action in ("add", "update", "adopt", "remove", "unchanged", "conflict")
        },
        "actions": actions,
        "conflicts": conflicts,
        "_before": before,
        "_payloads": payloads,
        "_manifest": manifest,
        "_manifest_before": fingerprint(manifest_path),
    }


def atomic_write(path, content, executable=False):
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(prefix=".harness-", dir=path.parent)
    try:
        with os.fdopen(descriptor, "wb") as stream:
            stream.write(content)
        os.chmod(temporary, 0o755 if executable else 0o644)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def apply_plan(plan, expected_digest):
    if plan["planDigest"] != expected_digest:
        raise SyncError("Preview is stale; inspect a fresh plan before applying")
    if plan["conflicts"]:
        raise SyncError(
            "Local changes conflict with sync: " + ", ".join(plan["conflicts"])
        )
    target = Path(plan["target"])
    manifest_path = safe_path(target, MANIFEST)
    if fingerprint(manifest_path) != plan["_manifest_before"]:
        raise SyncError("Manifest changed after preview")
    for name, value in plan["_before"].items():
        if fingerprint(safe_path(target, name)) != value:
            raise SyncError(f"Target changed after preview: {name}")
    previous_manifest = manifest_path.read_bytes() if manifest_path.exists() else None
    replacements = []
    try:
        for item in plan["actions"]:
            action, name = item["action"], item["path"]
            if action == "unchanged":
                continue
            path = safe_path(target, name)
            if fingerprint(path) != plan["_before"][name]:
                raise SyncError(f"Concurrent modification: {name}")
            old = path.read_bytes() if path.exists() else None
            old_mode = (
                bool(path.stat().st_mode & stat.S_IXUSR) if path.exists() else False
            )
            desired = plan["_manifest"]["files"].get(name)
            if action == "remove":
                path.unlink()
            else:
                atomic_write(path, plan["_payloads"][name], desired["executable"])
            replacements.append((path, old, old_mode, desired))
        # Do not overwrite a manifest another worker changed while files were written.
        if fingerprint(manifest_path) != plan["_manifest_before"]:
            raise SyncError("Concurrent manifest modification")
        data = (json.dumps(plan["_manifest"], indent=2, sort_keys=True) + "\n").encode()
        if previous_manifest != data:
            atomic_write(manifest_path, data)
    except Exception:
        for path, old, old_mode, written in reversed(replacements):
            # Roll back our own writes; preserve a later edit made by another worker.
            if fingerprint(path) == written:
                if old is None:
                    path.unlink(missing_ok=True)
                else:
                    atomic_write(path, old, old_mode)
        raise


def enable_automatic(source, target):
    """Remember a machine-local source without putting absolute paths in Git."""
    source, target = repository(source), repository(target)
    if not (target / MANIFEST).is_file():
        raise SyncError("Adopt the project before enabling automatic updates")
    build_plan(
        source, target
    )  # Validate source identity and paths before configuration.
    git(target, "config", "--local", "harness.source", str(source))


def refresh_automatic(project):
    """Refresh unchanged shared files; retain every locally changed file."""
    project = Path(project).resolve()
    probe = subprocess.run(
        ["git", "-C", str(project), "rev-parse", "--show-toplevel"],
        capture_output=True,
        text=True,
        check=False,
    )
    if probe.returncode:
        return None
    root = Path(probe.stdout.strip()).resolve()
    source = subprocess.run(
        ["git", "-C", str(root), "config", "--local", "--get", "harness.source"],
        capture_output=True,
        text=True,
        check=False,
    )
    if source.returncode:
        return None
    plan = build_plan(source.stdout.strip(), root)
    # Local overrides retain the previous baseline. Otherwise a user edit that
    # happens to match an incoming version could be mistaken for managed content.
    old = read_json(root / MANIFEST)["files"]
    overrides = sorted(
        name
        for name, current in plan["_before"].items()
        if (name in old and current != old[name])
        or (name not in old and current is not None)
    )
    for name in overrides:
        if name in old:
            plan["_manifest"]["files"][name] = old[name]
        else:
            plan["_manifest"]["files"].pop(name, None)
    plan["actions"] = [x for x in plan["actions"] if x["path"] not in overrides]
    plan["conflicts"] = []
    apply_plan(plan, plan["planDigest"])
    return {
        "sourceRevision": plan["sourceRevision"],
        "localOverrides": overrides,
        "updated": [x["path"] for x in plan["actions"] if x["action"] != "unchanged"],
    }


def resolve_library(project, skill_directory):
    """Prefer an adopted repo copy; otherwise use this adapter's local clone."""
    project = Path(project).resolve()
    probe = subprocess.run(
        ["git", "-C", str(project), "rev-parse", "--show-toplevel"],
        capture_output=True,
        text=True,
        check=False,
    )
    if probe.returncode == 0:
        project = Path(probe.stdout.strip()).resolve()
    manifest = safe_path(project, MANIFEST)
    if manifest.exists():
        read_json(manifest)
        return project / ".agents/skills"
    return Path(skill_directory).resolve().parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    snap = sub.add_parser(
        "snapshot", help="Capture existing shared paths for one-time review"
    )
    snap.add_argument("--target", required=True)
    snap.add_argument("--out", required=True)
    resolver = sub.add_parser(
        "resolve", help="Resolve repo-local or clone-backed workflow paths"
    )
    resolver.add_argument("--target", required=True)
    automatic = sub.add_parser(
        "enable-auto", help="Refresh on resolve; local edits win"
    )
    automatic.add_argument("--source", required=True)
    automatic.add_argument("--target", required=True)
    for name in ("plan", "apply"):
        command = sub.add_parser(name)
        command.add_argument("--source", required=True)
        command.add_argument("--target", required=True)
        command.add_argument("--adopt-baseline")
        if name == "apply":
            command.add_argument("--expect-plan", required=True)
    args = parser.parse_args()
    try:
        if args.command == "snapshot":
            result = snapshot(args.target, args.out)
            print(
                f"Captured {len(result['files'])} existing files for review: {args.out}"
            )
        elif args.command == "enable-auto":
            enable_automatic(args.source, args.target)
            print(
                "Automatic refresh enabled for this checkout; local edits take priority."
            )
        elif args.command == "resolve":
            try:
                refresh = refresh_automatic(args.target)
            except (SyncError, OSError) as error:
                refresh = {"error": str(error), "usingExistingLocalCopy": True}
            directory = Path(__file__).resolve().parents[1]
            print(
                json.dumps(
                    {
                        "skillsPath": str(resolve_library(args.target, directory)),
                        "refresh": refresh,
                    }
                )
            )
        else:
            plan = build_plan(args.source, args.target, args.adopt_baseline)
            if args.command == "apply":
                apply_plan(plan, args.expect_plan)
            print(json.dumps(public_plan(plan), indent=2))
            return 2 if plan["conflicts"] else 0
    except (SyncError, OSError) as error:
        parser.exit(1, f"{error}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
