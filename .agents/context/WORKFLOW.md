# SportsBuilder workflow extensions

The central harness supplies reusable development and design procedures. This
repo's AGENTS.md, specification, testing, coding standards, product, and design
sources supply SportsBuilder's behavior and delivery contract.

- Keep the app local. Commit/push checkpoints only to the active `codex/` feature
  branch as AGENTS.md directs; no deployment or main-branch push is authorized.
- Use the verification scope in [TESTING.md](TESTING.md) for app changes. For
  guidance-only changes, run the shared guidance checker and relevant helper
  tests; do not run paid providers or video inference merely to update skills.
- Keep SportsBuilder's supplied-video evidence, measured values, local OAuth
  proxy, Python services, and reviewed artifact flow as repo-owned concerns.
  Shared demonstration data does not establish real-video acceptance.
- Preserve the existing [DESIGN.md](DESIGN.md), self-hosted Lexend, reusable
  controls, and interaction rules. The shared workflow retains the product's visual identity.
- [Teaching-artifact review](../skills/expanded-learning-experience-review/SKILL.md)
  and [agentic evaluations](../skills/agentic-evaluations/SKILL.md) remain local
  extensions, used only when relevant and within their existing approval scope.

The old LearnUnlock provenance snapshot and `.agents/learnunlock/` source files
are separate from the shared harness and are not updated by its sync command.

Use [shared workflow setup](../HARNESS.md) for live resolution and developer setup.
