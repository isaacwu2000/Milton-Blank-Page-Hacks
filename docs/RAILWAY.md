# Future Railway hosting

No app deployment has been performed. The current implementation is a local prototype; the dev runner is not a production process supervisor.

The React frontend builds to static files in `Web/frontend/dist`. FastAPI handles uploads, tracking, and records; the TypeScript service handles interviews, Daytona tool builds, and coaching. A Railway deployment needs one public origin routing `/api` to FastAPI, `/agent` to the TypeScript service, and other requests to the static frontend. Package those processes with a reverse proxy/supervisor in one container, or use separate services behind a common gateway. Before deploying, replace loopback service URLs/binds in typed config with the intended container/private-network layout and honor Railway's injected PORT.

Keep Neon Postgres and Neon Object Storage as the database and file store. Configure their credentials in Railway, set production mode for OpenRouter, and keep Daytona credentials only on the agent control plane. Do not ship the local OAuth proxy, developer credentials, or `.env` files to production.

Real local CPU tracking at 0.1s sampling took roughly 98–140 seconds for the 17–28 second test clips after model loading. The backend used approximately 1.2 GiB resident memory and four CPU threads on this Mac. These are local observations, not Railway benchmarks. Start with memory headroom, benchmark on the actual instance, keep one tracking worker, and cache model downloads on persistent storage. The prototype's in-memory queue and agent jobs require a single process; restarts interrupt pending jobs. A durable queue, authentication, quotas, and controlled public access belong before a broader launch.

Use health checks and verify the full upload → Neon storage → tracking → UI → coaching flow on the deployed revision. A successful build is not deployment acceptance.

Railway reference: https://docs.railway.com/deployments/reference
