# Public 48-hour testing deployment

This is an implementation of a temporary public test host, not a production availability guarantee. The user authorized deployment on Daytona for 48 hours, superseding the earlier local-only restriction. No custom domain is selected: the user wants to choose it.

## Shape

One Daytona sandbox runs nginx on port 8000, a single FastAPI process on loopback port 8080, and the Bun agent on loopback port 3001. The fixed React build is served by nginx. Requests to `/api` and `/agent` stay on the same origin. Streaming responses are not buffered; hashed assets are cached, while the app entry point is revalidated. No development server or OAuth proxy runs on the host. Production uses the existing OpenRouter configuration. Daytona cannot reach the current Neon endpoint over direct PostgreSQL TCP in the observed environment, so hosted record queries use the official Neon HTTPS driver through an authenticated loopback route on the agent. The database URL and SQL remain unchanged; each store operation remains one atomic query. Local installs keep psycopg. The internal database route is not routed by the public gateway and additionally requires the generated service secret.

The public workspace is intentionally shared. There is no login, per-user profile isolation, or authentication added. Every visitor can see and change the shared testing records and footage. Continue using the existing Neon account, database, and private bucket; signed object URLs are issued through the public app. Do not replace those destinations for deployment testing.

Start with 2 vCPU, 4 GiB RAM and 10 GiB disk. Keep one tracking job running with at most five active/queued jobs. Downloaded model weights persist in the host's private model cache for its lifetime. The API retains loaded models after the first analysis. Measure actual supplied-video performance on the deployed machine; resource counts do not establish equivalence with the developer's computer.

## Recovery and capacity

Saved session status and database leases form the video queue. In production mode, startup and periodic recovery claim only pending jobs whose lease has expired. A live peer's job stays untouched, and stale workers cannot publish results. Legacy running jobs without ownership information require manual retry from the old app. API startup fails when the database cannot be reached, allowing the supervisor to retry. Local mode retains the existing peer-safe startup behavior.

The host supervisor independently restarts failed API, agent and gateway processes with bounded backoff. This recovers application processes while the sandbox is running; it cannot recover a platform outage or expired sandbox. Interrupted AI builds/coaching remain retry actions rather than durable continuations. Graceful shutdown cancels the API's tracked tasks and lease heartbeats.

Hosted object writes are serialized and check current bucket usage before writing. Reject new writes above 4 GB, leaving headroom under Neon's published 5 GB free object allowance for existing/other project use. Existing objects are never deleted to make space. The guard covers this bucket, not other project branches, Postgres compute/storage, or bandwidth. Provider limits remain authoritative; check actual account allowances. The database, OpenRouter and Daytona retain their provider-side billing settings; no app-level spending control is added.

## Deployment and expiry

Run `bun scripts/deploy-daytona.ts` from the repository root after checks. It reads only the existing allowlisted credentials, packages application sources without environment files, installed dependencies, local videos or evidence, and creates a separately labelled hosting sandbox. It never changes the developer's Neon destination. Source SHA-256, Git revision, public URL, sandbox ID and platform expiry are saved in ignored `.sportsbuilder/daytona-host.json`. A second invocation refuses to create a duplicate recorded host.

The platform wall-clock TTL is 2,880 minutes from sandbox creation, including setup time. Auto-stop and auto-pause are disabled during that window. At expiry Daytona destroys this disposable hosting sandbox, ending its running compute charges even if no local agent is connected. Neon footage/records remain. Temporary coach-review sandboxes retain their existing short independent cleanup settings.

A failed setup deletes its hosting sandbox. Inspect the saved state before retrying; remove the state file only after confirming the old host is deleted. Do not automatically recreate an expired host. This would start another billable window without authorization.

At the published rate of $0.0504/vCPU-hour and $0.0162/GiB-hour, 2 vCPU plus 4 GiB for 48 hours is approximately $7.95, plus billable disk, AI, separate review sandboxes and any Neon overage. Credits and provider limits may end availability earlier. No domain purchase or additional hosting account is required.

## Verification

Required local checks: `bun run build`, `bun run test`, and `uv run --directory Web/backend` with `pytest`, `ruff check server tests`, `ruff format --check server tests`, and `ty check`.

Verify the unauthenticated public URL, both health routes, existing Neon records/video playback, upload → queued → real tracking → persisted analysis, responsive browsing while tracking, API process restart, and production OpenRouter coaching/review. Preserve private evidence under ignored `output/daytona-deployment/`, recording the exact revision, source digest, viewport and environment. Record unavailable live checks explicitly rather than substituting synthetic evidence.

## Verified public test - October 17, 2026

The public application is running at https://8000-d4bad68f-e5d4-4b95-8eb2-1236ab0976c5.daytonaproxy01.net. Its provider expiry is October 19, 2026 at 18:08:24 UTC (2:08 p.m. EDT). Deployed application revision: `295ff92827ac54d478f9e1c82145d2432f860902`. Deployment script/documentation checkpoints after that revision do not change the running app.

Normal streaming coach creation, targeted editing, explicit immutable saving, real-image coaching, private media playback, real video tracking and interrupted-job recovery passed live checks against the existing Neon workspace. The optional explicit `/agent/build` diagnostic screenshot-review route cannot reach Daytona's toolbox proxy from this hosted network and is not accepted as working in production. Routine coach creation does not use this diagnostic route. An experimental linked-sandbox transport was rejected by its host-access check and removed; no linked transport is active. Do not reintroduce a bidirectional link to a credential-bearing host without a complete enforced boundary.

The generated URL can show Daytona's first-visit preview notice; visitors can continue without creating an account. The user retains the custom-domain decision.

Read `docs/DEPLOYMENT_ACCEPTANCE.md` for the evidence matrix, measurements and limits. The short rendered report and raw artifacts remain in ignored `output/`, not Git. A deployment intent is now saved before the billable create request, with a unique attempt label, so an interrupted or unknown create outcome cannot be retried blindly. Confirm the old attempt's state before removing its local record.
