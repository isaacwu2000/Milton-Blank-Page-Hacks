- Treat repository paths in `AGENTS.md` and `.agents/` as relative to the
  repository root unless explicitly stated otherwise.
- Route software-development work through the
  [development skill](../../skills/development/SKILL.md).
- Route LearnUnlock design and UI work through the
  [Impeccable skill](../../skills/impeccable/SKILL.md).
- Follow the repository's
  [coding standards](../../context/CODING_STANDARDS.md) for implementation.
- Before pushing any commit to `origin/main`, read and follow the complete
  [production deployment workflow](../../context/DEPLOY.md). `origin/main`
  continuously deploys to production.
- Finish implementation tasks through verification and production deployment using
  that workflow before ending the turn or delivering the final acceptance PDF,
  unless the user explicitly requests local-only work. Fix routine verification
  failures before deployment; complete production acceptance before the final report.
- Use Bun exclusively for package management and JavaScript/TypeScript commands:
  `bun install`, `bun add`, `bun remove`, `bun run`, and `bunx`. Do not use
  `npm`, `npx`, `pnpm`, `pnpx`, `yarn`, or `yarn dlx` in this repository.
- Prefer Codex's in-app Browser for UI and manual testing over standalone
  Playwright.
- Include screenshot evidence whenever it materially helps verify a success,
  explain a failure, or review a visual result.
- Verify GitHub CLI authentication with macOS Keychain-enabled permissions:
  sandboxed `gh auth status` may falsely report the keyring token as invalid.
  Reuse the existing keyring session and request login only when that
  Keychain-enabled check fails.

- For browser testing, use local **Dev auth** or production `/auth` with
  `agent-test@learnunlock.invalid` / `LearnUnlock-Shared-Test-9s4L!q7p2`.
  Shared synthetic data only; normal usage limits apply. See
  [Testing](../../context/TESTING.md#agent-sign-in) for setup and email testing.

- Before implementation or capability diagnosis, inspect the checkout revision,
  local changes, and relevant newer repository work. Preserve concurrent work.
- Explicitly label prototyping and the question it answers. Accept Tutor/specialist
  changes using the actual app journey, distinguishing prototype, deterministic,
  local live, and production evidence.
- For visual acceptance, follow the evidence procedure in the
  [implementation skill](../../HARNESS.md), including
  representative desktop/mobile screenshots in a short PDF unless the task narrows scope.
