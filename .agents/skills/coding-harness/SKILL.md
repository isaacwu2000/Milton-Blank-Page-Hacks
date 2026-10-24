---
name: coding-harness
description: Install globally for local Codex, adopt or update the shared Coding-Agent-Harness, or use its coding and UI workflows in a project without its own workflow entrypoint. For projects with their own agent guidance, preserve that routing and use their adopted harness copy when present.
---

# Coding Harness

Use a local copy of the shared harness so the developer and their agent can read,
run, and adapt it without fetching remote instructions on every task. This is
shared workflow; product facts, design, testing, delivery, and local skills belong
to the receiving project. Read that project's AGENTS.md and relevant context;
the harness clone's maintenance instructions do not become project policy.

## Adopt or sync

For adoption, updates, or requests to set this up for a developer, read
[adoption](references/adoption.md). Clone the public repository locally first,
using a developer-chosen location or the project's established checkout area.
For a local Codex installation request, register the global adapter as described
in the guide; adopting a particular repo remains a separate explicit choice.
Use the sync helper for repo copies; enable automatic refresh when requested. Review existing
customizations before the first replacement. Keep reusable local improvements
reviewable for promotion; do not overwrite them or publish private project
context back to the shared public repository.

## Use the workflows

Resolve this skill's real directory through symlinks. With that directory as
`<adapter>`, run:

```sh
python3 <adapter>/scripts/sync.py resolve --target <project-directory>
```

Run this at the start of each coding/design task before reading shared guidance.
An enabled checkout refreshes unchanged shared files automatically from its
configured local clone. Local edits and deletions take priority and are reported
as `localOverrides`; use those local files. If refresh reports an error, use the
existing local copy and report the update problem.

The result's `skillsPath` selects the adopted repo's `.agents/skills` when its
manifest exists; otherwise it selects the sibling skills in this local harness
clone. Read the selected `development/SKILL.md` for software work, or
`impeccable/SKILL.md` for design/UI work. Resolve all further file links from the
actual selected skill directory. Before following any workflow or child link,
prefer the receiving repo's same-path skill if it exists, even without a harness
manifest; use the shared copy only where the repo has no local version. Keep
commands' working directory in the
receiving project. Use the project's package manager/runtime as its policy allows.

If an unadopted project already selects a different development or design
workflow, follow its existing entrypoint and offer a reviewed adoption rather
than silently superseding it. A global install supplies discoverable workflows;
it does not automatically migrate repositories or authorize deployment.

## Where improvements belong

General workflow or design principles: edit the central local clone, validate,
and commit them so automatically refreshing projects receive the update.
Project-specific behavior, taste, commands, tools, or exceptions: edit the
receiving repo's context or local skills. Existing local shared-file edits remain
local overrides. Prefer context extensions when the shared workflow supports
them so unrelated shared improvements can continue to arrive. Local instructions
and local skill customizations always take priority over shared defaults.
Publishing central changes follows the user's existing commit/push scope.
