# SportsBuilder

A local prototype with Build your coach, Get coached, and Your profile navigation for inspecting sports footage and building reusable coaching tools through an interview. The fixed analysis workspace handles clickable body joints, position/velocity/acceleration, custom metrics, reference comparison, one athlete’s history, and image-grounded coaching.

## Run locally

From the downloaded/cloned project folder, run:

```sh
bash install.sh
```

That’s it. The installer adds missing Bun, uv, and Python 3.12, installs the app,
prepares the database, checks video storage, builds it, and starts all services.
You do not need pip, npm, or Python installed beforehand. It supports macOS and
Linux; on Windows, run it inside Ubuntu/WSL.

It automatically reuses `.env.local`, `.env`, or exported credentials. Otherwise,
it asks for your Neon database/storage details and Daytona key once, with hidden
input, and saves only missing values in ignored `.env.local`. You need an existing
Neon database and private `videos` bucket, plus a Daytona account.

If Codex is installed, setup uses the local ChatGPT sign-in and installs Node
locally if needed. Otherwise it uses **OpenRouter** and asks for your OpenRouter
API key. No Codex or ChatGPT subscription is required for the OpenRouter path.
Provider errors never silently switch accounts or spend credits elsewhere.

Open [SportsBuilder locally](http://127.0.0.1:5173/). Stop it with Ctrl+C. Run
`bash install.sh` again next time; installed tools and configured secrets are reused.
The first video analysis downloads its tracking models, so it can take longer.

For install-only or automated setup:

```sh
bash install.sh --no-start
bash install.sh --no-start --non-interactive
```

Automated setup requires credentials already present. Errors explain what is
missing; detailed installation output stays in private `.sportsbuilder/setup.log`.
The installer never overwrites your configured environment file.

## Organization

- `Web/frontend/`: React + TypeScript + Vite, fonts, and UI. The product module separates `types.ts`, `config.ts`, services, runtime, hooks, and UI behind a public entry point.
- `Web/backend/server/`: typed Python/FastAPI, body tracking, Neon records and storage. Uses NamedTuples for fixed records, TypedDict wire contracts, and Pydantic request validation.
- `Web/backend/agent/`: TypeScript config, model transport, interview, coach, and Daytona review runtime.
- `Web/shared/`: public types, configuration, and deterministic geometry/motion calculation services shared by the UI and agent.
- `.agents/`: copied LearnUnlock guidance and the reusable review-loop harness, plus SportsBuilder context.
- `docs/SPEC.md`: agreed scope. `docs/METRICS.md`: supported calculations.

## Configuration and storage

Nonsecret defaults live in the frontend/backend/shared `config.ts` files and Python `server/config.py`. Model and reasoning policy are fixed to GPT-6.1 Sol / medium. Development automatically uses local ChatGPT OAuth when Codex is installed and OpenRouter otherwise; production mode selects OpenRouter. Both providers share prompts, tools, calculation validation, and browser-review behavior. No provider failure silently spends credits elsewhere.

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

The pre-upload slider selects 0.05–2 seconds in 0.05-second steps (default 0.1s) for both body tracking and coach images. Complete one-athlete height onboarding before uploading; Your profile stays at the sidebar bottom. Measurements are sampled 2D estimates. A valid upright, uncropped height reference can establish an approximate planar scale; otherwise use manual calibration or keep pixel units. The saved athlete height is 178 cm, and all three supplied clips remain physically uncalibrated because the required full-body reference is cropped. Missing points and unsupported calculations remain unavailable. Tracking scores are model scores, not calibrated probabilities. Sample mode is clearly synthetic and works without external services.

[Dark mode is deferred to issue #3](https://github.com/isaacwu2000/Milton-Blank-Page-Hacks/issues/3); no theme control is implemented.

The application has not been deployed. See `docs/RAILWAY.md` for the future hosting plan.
