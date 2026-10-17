# SportsBuilder agent

This is a local prototype implementation. The service binds to `127.0.0.1:3001`; Vite forwards `/agent` requests. Run all local processes with `bun run dev`, or run the existing ChatGPT proxy (`bun run ai:proxy`), FastAPI, Vite, and `bun run agent` separately. Build the frontend with `bun run build` before creating a tool: Daytona reviews that built fixed app.

The default provider is the local `openai-oauth@2.0.0` proxy at `127.0.0.1:10531`. Complete its browser sign-in when requested. `SOL_PROVIDER=openrouter` explicitly selects OpenRouter and requires `OPENROUTER_API_KEY`. Both paths use GPT-6.1 Sol with medium reasoning, identical prompts, tools, formula validation, and review policy. Provider errors are visible and never trigger an alternate paid provider.

`DAYTONA_API_KEY` and `AGENT_INTERNAL_SECRET` stay in the ignored root `.env.local`. The local runner generates a shared ephemeral internal secret if none is configured. Never send provider, database, or object-storage credentials into the sandbox. Only the static app build and tool drafts are uploaded.

The interview creates a confirmed brief. Building uses bounded model tool calls for workspace files, terminal commands, trusted calculations, and Playwright browser inspection. `.agents/learnunlock/reviewedArtifactAuthoring.ts` is the unchanged LearnUnlock production review harness: at most two private drafts and three review decisions, exact-revision acceptance, shared cancellation, and no save before inspection. The adapter validates all metrics, renders actual desktop/mobile screenshots in Daytona, returns those pixels to the model, and saves only the exact accepted config. It never publishes sandbox code. Evidence is written under ignored `output/builds/<job-id>/`. Sandboxes auto-stop after ten minutes and are deleted after use; a failed cleanup is reported server-side.

The coach is a separate conversation. It loads actual decoded images and matching numeric measurements from FastAPI, inspects all sampled frames in chronological batches, then synthesizes a timestamped answer and optional drill using the rubric, profile, and recorded history. Missing images and incomplete analyses fail explicitly. Optional reference footage is inspected separately. Pixel coordinates remain pixels until calibration; reference footage does not inherit the athlete's calibration. Synthetic sample motion is never sent as real coaching evidence.

Endpoints:

- `GET /agent/health`: configured provider/model and local proxy readiness.
- `POST /agent/interview`: `{messages}` → `{reply,ready,brief?}`.
- `POST /agent/build`: `{brief,messages,referenceId?}` → `{id}`.
- `POST /agent/coach`: `{sessionId,tool,messages,selectedTime,calibration?}` → `{id}`.
- `GET /agent/jobs/:id`: `{status,stage,tool?,reply?,drill?,error?}`.

Jobs are held in memory for this single local process. Restarting the agent invalidates pending jobs; the client must retry. No deployment, production load guarantee, or live pose-estimation accuracy is established by a successful synthetic browser review. Railway hosting requires separately configured secrets, processes, storage, networking, and resource limits; none is deployed by this implementation.
