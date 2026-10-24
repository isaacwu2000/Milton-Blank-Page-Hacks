"""Sync behavior checks against isolated temporary Git repositories."""

import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import sync


class SyncTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="harness-sync-")
        self.addCleanup(self.temporary.cleanup)
        self.source = Path(self.temporary.name).resolve() / "source"
        self.target = Path(self.temporary.name).resolve() / "target"
        for root in (self.source, self.target):
            root.mkdir()
            self.run_git(root, "init", "-q")
        self.run_git(self.source, "remote", "add", "origin", sync.SOURCE_URL)
        for package in sync.PACKAGES:
            self.write(
                self.source, f".agents/skills/{package}/SKILL.md", f"# {package}\n"
            )
        self.name = ".agents/skills/development/SKILL.md"
        self.commit_source()

    def run_git(self, root, *arguments):
        subprocess.run(
            ["git", "-C", str(root), *arguments], check=True, capture_output=True
        )

    def commit_source(self):
        self.run_git(self.source, "add", ".")
        self.run_git(
            self.source,
            "-c",
            "user.name=Fixture",
            "-c",
            "user.email=fixture@example.invalid",
            "commit",
            "-qm",
            "Fixture snapshot",
        )

    def write(self, root, name, text):
        path = root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)
        return path

    def install(self):
        plan = sync.build_plan(self.source, self.target)
        sync.apply_plan(plan, plan["planDigest"])
        return plan

    def test_install_preserves_repo_context_and_is_idempotent(self):
        local = self.write(
            self.target, ".agents/context/DESIGN.md", "Local visual identity\n"
        )
        extra = self.write(
            self.target, ".agents/skills/manual-testing/SKILL.md", "Local skill\n"
        )
        inside = self.write(
            self.target,
            ".agents/skills/development/local-extension.md",
            "Local extension\n",
        )
        self.install()
        self.assertEqual(local.read_text(), "Local visual identity\n")
        self.assertEqual(extra.read_text(), "Local skill\n")
        self.assertEqual(inside.read_text(), "Local extension\n")
        plan = sync.build_plan(self.source, self.target)
        self.assertEqual(plan["counts"]["unchanged"], 4)
        self.assertFalse(plan["conflicts"])

    def test_clean_update_and_upstream_deletion(self):
        self.install()
        self.write(self.source, self.name, "Updated\n")
        obsolete = ".agents/skills/development/obsolete.md"
        self.write(self.source, obsolete, "Old\n")
        self.commit_source()
        self.install()
        (self.source / obsolete).unlink()
        self.commit_source()
        self.install()
        self.assertEqual((self.target / self.name).read_text(), "Updated\n")
        self.assertFalse((self.target / obsolete).exists())

    def test_conflict_prevents_all_writes(self):
        self.install()
        self.write(self.target, self.name, "Unpromoted local change\n")
        self.write(self.source, ".agents/skills/development/new.md", "Incoming\n")
        self.commit_source()
        plan = sync.build_plan(self.source, self.target)
        with self.assertRaises(sync.SyncError):
            sync.apply_plan(plan, plan["planDigest"])
        self.assertFalse((self.target / ".agents/skills/development/new.md").exists())
        self.assertEqual(
            (self.target / self.name).read_text(), "Unpromoted local change\n"
        )

    def test_locally_deleted_managed_file_is_a_conflict(self):
        self.install()
        (self.target / self.name).unlink()
        self.assertIn(self.name, sync.build_plan(self.source, self.target)["conflicts"])

    def test_modified_upstream_deleted_file_is_preserved(self):
        name = ".agents/skills/development/extra.md"
        self.write(self.source, name, "Original\n")
        self.commit_source()
        self.install()
        self.write(self.target, name, "Local work\n")
        (self.source / name).unlink()
        self.commit_source()
        plan = sync.build_plan(self.source, self.target)
        self.assertIn(name, plan["conflicts"])
        self.assertEqual((self.target / name).read_text(), "Local work\n")

    def test_first_adoption_requires_reviewed_snapshot(self):
        self.write(self.target, self.name, "Earlier shared copy\n")
        self.assertIn(self.name, sync.build_plan(self.source, self.target)["conflicts"])
        baseline = Path(self.temporary.name) / "baseline.json"
        sync.snapshot(self.target, baseline)
        plan = sync.build_plan(self.source, self.target, baseline)
        self.assertEqual(plan["counts"]["adopt"], 1)
        sync.apply_plan(plan, plan["planDigest"])
        self.assertEqual((self.target / self.name).read_text(), "# development\n")

    def test_changed_adoption_snapshot_does_not_authorize_new_edits(self):
        self.write(self.target, self.name, "Reviewed\n")
        baseline = Path(self.temporary.name) / "baseline.json"
        sync.snapshot(self.target, baseline)
        self.write(self.target, self.name, "Changed after review\n")
        self.assertIn(
            self.name, sync.build_plan(self.source, self.target, baseline)["conflicts"]
        )

    def test_stale_preview_rejected_before_writes(self):
        plan = sync.build_plan(self.source, self.target)
        self.write(self.target, self.name, "Concurrent work\n")
        with self.assertRaises(sync.SyncError):
            sync.apply_plan(plan, plan["planDigest"])
        self.assertFalse((self.target / sync.MANIFEST).exists())

    def test_unknown_schema_and_out_of_scope_manifest_paths_rejected(self):
        self.install()
        path = self.target / sync.MANIFEST
        data = json.loads(path.read_text())
        data["schemaVersion"] = 99
        path.write_text(json.dumps(data))
        with self.assertRaises(sync.SyncError):
            sync.build_plan(self.source, self.target)
        data["schemaVersion"] = 1
        data["files"]["../outside"] = next(iter(data["files"].values()))
        path.write_text(json.dumps(data))
        with self.assertRaises(sync.SyncError):
            sync.build_plan(self.source, self.target)

    def test_symlinked_destination_is_rejected(self):
        outside = Path(self.temporary.name) / "outside"
        outside.mkdir()
        (self.target / ".agents").symlink_to(outside, target_is_directory=True)
        with self.assertRaises(sync.SyncError):
            sync.build_plan(self.source, self.target)
        self.assertEqual(list(outside.iterdir()), [])

    def test_dirty_source_is_rejected(self):
        self.write(self.source, self.name, "Not committed\n")
        with self.assertRaises(sync.SyncError):
            sync.build_plan(self.source, self.target)

    def test_write_failure_rolls_back_earlier_replacements(self):
        self.install()
        old_manifest = (self.target / sync.MANIFEST).read_bytes()
        for package in sync.PACKAGES:
            self.write(self.source, f".agents/skills/{package}/SKILL.md", "Updated\n")
        self.commit_source()
        plan = sync.build_plan(self.source, self.target)
        original = sync.atomic_write
        calls = []

        def fail_second_write(*args, **kwargs):
            calls.append(args[0])
            if len(calls) == 2:
                raise OSError("Simulated interrupted write")
            return original(*args, **kwargs)

        with (
            patch.object(sync, "atomic_write", fail_second_write),
            self.assertRaises(OSError),
        ):
            sync.apply_plan(plan, plan["planDigest"])
        self.assertEqual((self.target / sync.MANIFEST).read_bytes(), old_manifest)
        for package in sync.PACKAGES:
            self.assertEqual(
                (self.target / f".agents/skills/{package}/SKILL.md").read_text(),
                f"# {package}\n",
            )

    def test_global_adapter_selects_adopted_local_copy(self):
        directory = self.source / ".agents/skills/coding-harness"
        self.assertEqual(sync.resolve_library(self.target, directory), directory.parent)
        self.install()
        self.assertEqual(
            sync.resolve_library(self.target, directory), self.target / ".agents/skills"
        )

    def test_symlinked_global_entrypoint_resolves_its_clone(self):
        directory = self.source / ".agents/skills/coding-harness"
        helper = directory / "scripts/sync.py"
        helper.parent.mkdir(parents=True)
        helper.write_bytes(Path(sync.__file__).read_bytes())
        self.commit_source()
        user_skills = Path(self.temporary.name) / "user-skills"
        user_skills.mkdir()
        link = user_skills / "coding-harness"
        link.symlink_to(directory, target_is_directory=True)
        result = subprocess.run(
            [
                "python3",
                str(link / "scripts/sync.py"),
                "resolve",
                "--target",
                str(self.target),
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        self.assertEqual(json.loads(result.stdout)["skillsPath"], str(directory.parent))

    def test_global_fallback_works_before_git_initialization(self):
        new_project = Path(self.temporary.name) / "new-project"
        new_project.mkdir()
        directory = self.source / ".agents/skills/coding-harness"
        self.assertEqual(sync.resolve_library(new_project, directory), directory.parent)


if __name__ == "__main__":
    unittest.main()
