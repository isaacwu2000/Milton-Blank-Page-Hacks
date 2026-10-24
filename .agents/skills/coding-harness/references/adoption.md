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

## Subsequent syncs

Update the local source clone explicitly, preserving its changes, then run `plan`
and `apply --expect-plan <planDigest>` without an adoption baseline. Source shared
files must be committed and clean so every sync identifies an exact revision.

Unchanged managed files update; upstream removals delete only unchanged managed
files. Local edits/deletions conflict rather than getting overwritten. A conflict
prevents the entire apply. Reconcile local improvements separately: keep project
policy local, and review reusable changes for the central harness. There is no
force-overwrite mode. File-write failures roll back writes that still match the
sync's own output, preserving any subsequent concurrent edit.

## Optional global Codex entrypoint

Codex discovers user skills in `~/.agents/skills` and supports symlinked skill
folders. To use this clone globally, link only its `coding-harness` folder there
under that same name, preserving any existing destination. This entrypoint routes
to adopted repo copies or the clone-backed fallback. Do not also globally install
all shared skill folders: same-name global and repo skills can both appear rather
than merging. Other tools need their own supported discovery path; keep one source
of workflow text rather than generating divergent copies.

Skills are available without global AGENTS.md changes. If the user separately
requests automatic global routing, add only a short pointer to their existing
user instructions and preserve unrelated guidance. Global availability is not
permission to run automatic updates.
