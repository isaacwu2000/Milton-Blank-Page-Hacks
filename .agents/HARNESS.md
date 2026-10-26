# Shared workflows

This repo uses one central local harness checkout, not copied shared skills.
Run `python3 .agents/harness.py --skill development` (or `impeccable`,
`writing-for-agents`, or e.g. `development/implement`) and read `skillPath`.
Read local context alongside it. Every local same-path workflow/resource overrides
the shared version. Marked thin entrypoints dispatch to the central workflow.

General improvements go in the central clone; project-specific instructions stay
in this repo's context or local skills. Shared edits are visible on the next read,
including uncommitted edits. Reread loaded guidance after changes. There is no
automatic GitHub pull or file sync. Publication/deployment follows local policy.

New developers: have your agent clone
https://github.com/isaacwu2000/Coding-Agent-Harness.git locally, then set
`git config --local harness.source /absolute/clone/path`. The bootstrap also finds
a sibling `Coding-Agent-Harness` checkout, `CODING_HARNESS_HOME`, or the global
Codex adapter symlink. Keep machine paths out of tracked files.

Local specialized skills and additional capabilities remain authoritative.
