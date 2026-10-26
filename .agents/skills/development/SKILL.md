---
name: development
description: Use the central development workflows with this repository’s local context and overrides.
---

<!-- coding-harness:entrypoint -->

Read local AGENTS.md and relevant context first. From the repository root, run
`python3 .agents/harness.py --skill development` and read the returned `skillPath`.
For child workflows or resources, resolve their path the same way; local versions
always win over shared defaults. Keep commands in this repository.
