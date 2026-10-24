# Local adoption and explicit updates

Start by cloning `https://github.com/isaacwu2000/Coding-Agent-Harness.git` into a
local checkout chosen by the developer. They may inspect and modify that checkout
or fork it for their own use; retain applicable upstream attribution/licenses.
Use the local scripts, not remote piping into a shell. Do not modify user-wide
agent settings unless the user requests global installation.

The commands below use `<harness>` for that clean local clone and `<repo>` for the
receiving Git repository root. A fresh clone contains the adapter and scripts.

## First adoption

1. Read the repo's instructions and inspect local changes, its skill folders,
   product/design context, testing, and delivery policy. Preserve concurrent work.
2. Review differences against the shared library. Move genuine local policy into
   repo-owned context or local skills and add explicit routing from AGENTS.md.
   Preserve useful capabilities absent from the central version; a folder-wide
   replacement must not silently downgrade another installation.
3. Preview with `plan`. Existing divergent files are conflicts until reviewed.
   For the one-time migration, capture the existing files to a temporary JSON file:

   ```sh
   python3 <harness>/.agents/skills/coding-harness/scripts/sync.py snapshot --target <repo> --out <temporary-baseline.json>
   python3 <harness>/.agents/skills/coding-harness/scripts/sync.py plan --source <harness> --target <repo> --adopt-baseline <temporary-baseline.json>
   ```

   The baseline is an exact snapshot of reviewed content, not permission to accept
   unknown changes. Inspect every `adopt` action and the files' differences before
   applying. A change after the snapshot remains a conflict. Keep the baseline
   outside the managed skill paths and remove it after the migration.
4. Apply only the reviewed plan using its printed `planDigest`:

   ```sh
   python3 <harness>/.agents/skills/coding-harness/scripts/sync.py apply --source <harness> --target <repo> --adopt-baseline <temporary-baseline.json> --expect-plan <planDigest>
   ```

5. Run the installed `python3 .agents/skills/check_links.py`, validate the relevant
   helper behavior, and review the repository diff. Leave context and app behavior
   intact. Commit/push only within the user's scope and repository delivery rules.
   Existing sessions must reread revised instructions before using them.

The helper manages `coding-harness`, `development`, `impeccable`,
`writing-for-agents`, and `check_links.py` under `.agents/skills/`. The tracked
`.agents/harness.json` records the exact clean source commit and content/mode
fingerprints. AGENTS.md, `.agents/context/`, unrelated files, and other skills are
never sync targets. Local-only files in a managed folder are also preserved.

## Automatic refresh with local priority

When requested, enable automatic updates after adoption:

```sh
python3 <harness>/.agents/skills/coding-harness/scripts/sync.py enable-auto --source <harness> --target <repo>
```

This stores the source path in this checkout's local Git configuration, keeping
machine paths out of tracked files. Add a short instruction to the receiving
repo's AGENTS.md to run its installed adapter's `scripts/sync.py resolve --target .`
at the start of coding/design tasks, before loading shared skills. The global
adapter follows the same entry step. Verify by resolving once and inspecting its
`refresh` result. Each developer enables their own checkout; cloning an adopted
repo does not inherit another machine's settings.

Automatic refresh takes committed changes from the configured local clone.
Unchanged shared files update, while local edits, deletions, and colliding files
remain local overrides. Other updates can proceed alongside those overrides.
Repo-owned context and unrelated skills stay local. The result lists overrides
and updated files. A missing, dirty, or invalid source reports an update error;
the agent uses the existing local copy. No network pull or background watcher is
installed. To receive GitHub changes, update the central local clone first.
Instructions already loaded in a running task must be reread to use new content.

General improvements belong in the central clone; project-specific improvements
belong in local context/skills. Use local guidance whenever it differs from shared
defaults. Disable automatic refresh with `git config --local --unset harness.source`.

## Manual syncs

Update the local source clone explicitly, preserving its changes, then run `plan`
and `apply --expect-plan <planDigest>` without an adoption baseline. Source shared
files must be committed and clean so every sync identifies an exact revision.

Unchanged managed files update; upstream removals delete only unchanged managed
files. Local edits/deletions conflict rather than getting overwritten. A conflict
prevents the entire apply. Reconcile local improvements separately: keep project
policy local, and review reusable changes for the central harness. Manual sync remains strict even when automatic refresh is enabled. There is no
force-overwrite mode. File-write failures roll back writes that still match the
sync's own output, preserving any subsequent concurrent edit.

## Install for local Codex

Codex discovers user skills in `~/.agents/skills` and supports symlinked skill
folders. For a request to install the harness for local Codex, register this
entrypoint after cloning; the installation request covers that registration.
Link only its `coding-harness` folder under that same name:

```sh
mkdir -p ~/.agents/skills
ln -s /absolute/path/to/Coding-Agent-Harness/.agents/skills/coding-harness ~/.agents/skills/coding-harness
```

Check the destination first. Keep an existing matching symlink; preserve and
report an existing different folder or link instead of replacing it. Verify the
link resolves to the clone and its SKILL.md is readable. Invoke `$coding-harness`
on a subsequent turn; restart Codex if the skill has not appeared.

This entrypoint routes
to adopted repo copies or the clone-backed fallback. Do not also globally install
all shared skill folders: same-name global and repo skills can both appear rather
than merging. Other tools need their own supported discovery path; keep one source
of workflow text rather than generating divergent copies.

Skills are available without global AGENTS.md changes. If the user separately
requests automatic global routing, add only a short pointer to their existing
user instructions and preserve unrelated guidance. Global availability is not
permission to run automatic updates.
