# SportsBuilder

A local prototype for inspecting sports footage and building reusable coaching tools through an interview. The fixed analysis workspace handles clickable body joints, position/velocity/acceleration, custom metrics, reference comparison, one athlete’s history, and image-grounded coaching.

## Run locally

Requires Bun, uv, and a ChatGPT account with access to GPT-6.1 Sol. Python 3.12 is managed by uv.

```sh
bun install
uv sync --project Web/backend
cp .env.example .env.local
# Fill the credential and connection values in .env.local.
uv run --project Web/backend python scripts/migrate.py
bun run build
bun run dev
```

Open [SportsBuilder locally](http://127.0.0.1:5173/). The local runner starts Vite, FastAPI, the TypeScript agent, and Evan Zhou's `openai-oauth` proxy if it is not already running. Complete the proxy's ChatGPT sign-in if requested. `bun run ai:proxy` starts it separately.

**Existing checkout:** the supplied `.env` was copied into ignored `.env.local`, and the dedicated Neon development database/private bucket are configured. Both environment files stay outside Git. Never overwrite an existing configured file with the example.

## Organization

- `Web/frontend/`: React + TypeScript + Vite, fonts, and UI. The product module separates `types.ts`, `config.ts`, services, runtime, hooks, and UI behind a public entry point.
- `Web/backend/server/`: typed Python/FastAPI, body tracking, Neon records and storage. Uses NamedTuples for fixed records, TypedDict wire contracts, and Pydantic request validation.
- `Web/backend/agent/`: TypeScript config, model transport, interview, coach, and Daytona review runtime.
- `Web/shared/`: public types, configuration, and deterministic geometry/motion calculation services shared by the UI and agent.
- `.agents/`: copied LearnUnlock guidance and the reusable review-loop harness, plus SportsBuilder context.
- `docs/SPEC.md`: agreed scope. `docs/METRICS.md`: supported calculations.

## Configuration and storage

Nonsecret defaults live in the frontend/backend/shared `config.ts` files and Python `server/config.py`. Model and reasoning policy are fixed to GPT-6.1 Sol / medium. Development uses local ChatGPT OAuth; production mode selects OpenRouter. Both providers share prompts, tools, calculation validation, and browser-review behavior. No provider failure silently spends credits elsewhere.

Environment files hold keys and connection details only: Daytona, OpenRouter, Neon Postgres, and `NEON_STORAGE_*`. **There is no separate AWS service or account.** Neon Object Storage speaks the S3 protocol; its client is pointed explicitly at the Neon branch endpoint. Videos, sampled image evidence, and analysis objects are private; Postgres stores profiles, tools, sessions, object keys, and drill completion. Playback uses temporary signed URLs.

The tool-builder agent gets a credential-free Daytona workspace with files, commands, calculation tools, and a browser. It produces checked JSON, inspects the actual built app on desktop/mobile, and saves only an accepted draft. Build the frontend again after UI changes so future Daytona reviews use current assets.

## Checks

```sh
bun run build
bun run test
uv run --directory Web/backend ruff check server tests
uv run --directory Web/backend ruff format --check server tests
uv run --directory Web/backend ty check
uv run --directory Web/backend pytest
```

`bun run check` runs the main gates. Tests use Vitest and pytest; deterministic suites do not spend model credits. Live testing and its limits are recorded in `docs/ACCEPTANCE.md`; private screenshots, model results, and raw footage evidence stay in ignored `output/`.

## Prototype boundaries

Upload one athlete filmed with a stationary camera, up to 30 seconds and 100 MiB. Body tracking uses Hugging Face ViTPose++ Small with a person detector. Ball/racket modules, live recording, authentication, post-build editing, and compatibility/version migrations are deferred. [Future editing/compatibility issue](https://github.com/isaacwu2000/Milton-Blank-Page-Hacks/issues/1).

The adjustable interval (default 0.1s) controls both body tracking and coach images. Measurements are sampled 2D estimates; pixels become approximate physical units only after manual calibration. Missing points and unsupported calculations remain unavailable. Tracking scores are model scores, not calibrated probabilities. Sample mode is clearly synthetic and works without external services.

The application has not been deployed. See `docs/RAILWAY.md` for the future hosting plan.
