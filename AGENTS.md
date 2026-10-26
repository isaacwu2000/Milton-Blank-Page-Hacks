# SportsBuilder agent guidance


- Follow the [development router](.agents/skills/development/SKILL.md) for software work and [Impeccable](.agents/skills/impeccable/SKILL.md) for UI work.
- Read [the specification](docs/SPEC.md), [coding standards](.agents/context/CODING_STANDARDS.md), and [local verification](.agents/context/TESTING.md) for implementation.
- Frontend code belongs in `Web/frontend/`; backend code belongs in `Web/backend/`. Copied agent guidance and harness sources belong in `.agents/`. Shared numerical code lives in `Web/shared/`; Python video services live in `Web/backend/server/`.
- Preserve LearnUnlock's [design system](.agents/context/DESIGN.md), self-hosted Lexend, and reusable components.
- Treat feedback as amendments to the active task. Carry every unfinished earlier request forward, reconcile conflicting requirements using the user's latest direction, and continue implementing and verifying the full remaining scope. Cancel or defer work only when the user explicitly requests it; report concrete blockers instead of silently dropping tasks.
- Use Bun for package management and TypeScript commands. The user explicitly requested `npx openai-oauth` for the local model proxy.
- Commit reviewable checkpoints and push to the `codex/` feature branch. Keep the app local; deployment and pushes to `main` are outside this task.
- Store credentials in ignored `.env`/`.env.local` or installer-managed `.sportsbuilder/credentials.json`; commit only placeholder examples.
- Distinguish sample data from measured video evidence. AI configures and coaches; trusted code computes measurements.

- Use uv for Python dependencies and execution; verify Python with pytest, ty, and Ruff. Use Vitest for TypeScript and meaningful behavior checks. Keep nonsecret defaults in typed config files.

## Shared harness and local overrides

Use [the shared harness](.agents/HARNESS.md) and [local workflow extensions](.agents/context/WORKFLOW.md).
Resolve a workflow with `python3 .agents/harness.py --skill development` (or
`impeccable`, `writing-for-agents`, `development/implement`, etc.) and read its
`skillPath`. Local context and same-path local skills always take priority.
General improvements belong in the central clone; project-specific guidance stays
here. This uses live local files, without copied shared sets or automatic sync.
