# SportsBuilder agent guidance

- Follow the [development router](.agents/skills/development/SKILL.md) for software work and [Impeccable](.agents/skills/impeccable/SKILL.md) for UI work.
- Read [the specification](docs/SPEC.md), [coding standards](.agents/context/CODING_STANDARDS.md), and [local verification](.agents/context/TESTING.md) for implementation.
- Website code belongs in `Web/`. Copied agent guidance and harness sources belong in `.agents/`. Shared numerical code lives in `shared/`; Python video services live in `server/`.
- Preserve LearnUnlock's [design system](.agents/context/DESIGN.md), self-hosted Lexend, and reusable components.
- Use Bun for package management and TypeScript commands. The user explicitly requested `npx openai-oauth` for the local model proxy.
- Commit reviewable checkpoints and push to the `codex/` feature branch. Keep the app local; deployment and pushes to `main` are outside this task.
- Store credentials in ignored `.env`/`.env.local`; commit only placeholder examples.
- Distinguish sample data from measured video evidence. AI configures and coaches; trusted code computes measurements.
