# SportsBuilder prototype specification

## Problem Statement
Coaches and athletes need a simple way to inspect movement and create reusable sport-specific coaching tools without coding. Reliable tracking and calculations should come from shared software, while AI handles interviewing, configuration, explanation, and drills.

## Solution
A local two-screen React/TypeScript application in Web/frontend, with backend services in Web/backend and shared contracts in Web/shared with a Python/FastAPI video backend, a TypeScript agent using Daytona for tool creation and browser inspection, Neon Postgres for records, and private Neon Object Storage for footage. Follow LearnUnlock's existing Clear Path Studio design and reuse its components and bounded review-loop harness. No authentication or deployment in this phase.

## User Stories
1. As an athlete, I can upload a clip up to 30 seconds and see processing progress and actionable errors.
2. As a user, I can upload directly for one athlete without profile selection or management. Reuse the canonical Athlete record, or create it automatically on the first upload; preserve older records and session associations.
3. As an athlete, I can revisit uploads and choose a reusable coaching tool.
4. As a builder, I can answer a guided AI interview about sport, audience, desired metrics, and good form.
5. As a builder, I can review the rubric and optional reference footage before building.
6. As a builder, my agent can use files, terminal commands, calculation tools, and a real browser in Daytona, inspect screenshots, repair a draft, and submit a checked JSON tool.
7. As an athlete, I can play, pause, scrub, and click a tracked body joint to open a custom panel showing plain Speed and Acceleration values with units. Keep formulas and vector-component notation out of this panel. The video overlay shows selected-joint arrow geometry and white-backed KaTeX coordinate labels x=0 and y=0. Joint names and numeric readings belong in the details panel; closing it restores the quiet viewing state.
8. As an athlete, I can adjust one sampling interval (default 0.1 seconds) that controls both tracking and coach image evidence.
9. As an athlete, I see x=0 at the left frame edge and y=0 at estimated initial shoe contact, with positive y upward; I can correct the ground line. The automatic estimate uses the earliest clear, unclipped detected person lower bound with a confident ankle inside its lower half, rather than the ankle center.
10. As an athlete, I can mark a known distance to convert pixels into approximate physical units and clear that calibration.
11. As a coach, I can configure frame metrics such as three-point angles, distances, alignment, and summary aggregations with trusted calculation tools.
12. As a builder, I can also request custom mathematical calculations represented in checked JSON. Unsupported inputs, units, operations, invalid math, and missing tracking produce explicit unavailable results.
13. As an athlete, I can ask the coach about form and receive evidence-linked explanations and drills grounded in sampled images, measurements, rubric, profile, and history.
14. As an athlete, I can load an optional good-form reference, pick each video's starting frame, and play them side by side with a deterministic time offset. No AI alignment or time warping.
15. As an athlete, I can record drill completion and see progress/history update.
16. As a user, my videos and reference files persist in private Neon Object Storage; records and configuration persist in Postgres.
17. As a user, I can delete a clip and its associated stored analysis and footage.
18. As a demo presenter, I can explore a clearly labeled deterministic sample without external services; it never masquerades as analyzed uploaded footage.

## Implementation Decisions
- Two primary surfaces: home (uploads and tools; builder interview is an inline panel) and analysis (player, clickable overlay, plots, reference comparison, metrics, and coach conversation).
- Laptop use is the current UI acceptance priority. Joint detail is disclosed on click in a closable panel with plain scalar Speed/Acceleration values and units. Use an explicit unavailable state when measurements are missing. Selected arrow geometry and white-backed coordinate-axis labels belong on the video. Keep arrow direction trustworthy and scale stable within a clip; joint readings stay plain numbers and units in the details panel.
- This prototype has one athlete. Hide athlete navigation, profile forms, selectors, and row subtitles. New uploads use only the canonical Athlete record; existing videos retain their original associations. Keep sampling settings below upload; omit the local-workspace sidebar footer.
- Build once, then use. No post-build adjustment chat, Jev routing, version compatibility, schema migrations for future versions, or editing saved tools. Follow-up: GitHub issue #1.
- Fixed UI and versioned-format JSON data (format identifier only; not historical tool versioning), not generated application code or a textual DSL.
- TypeScript calculation engine uses allowlisted JSON operations, unit-aware validation, finite arithmetic, dependency checks, and bounded expression size. No eval or model-provided executable metric code.
- Built-in functions provide joint positions, components, speed/acceleration, angle, distance, and temporal summaries. AI composes them and defines coaching thresholds and text.
- Sampling timestamps derive from decoded video time. Confidence gaps remain missing, smoothing and derivatives operate only on valid contiguous segments, and insufficient neighbors prevent derived values. Projected 2D measurements cannot establish 3D accuracy.
- Default pose checkpoint: Hugging Face usyd-community/vitpose-plus-small, configurable to a compatible checkpoint. A detector locates the single athlete before pose inference. Ball/racket tracking are future modules, not represented by fabricated results.
- Upload limits: 30 seconds, 100 MiB, bounded decoded dimensions. One tracking job at a time in this prototype, one API process. Temporary decoded files are cleaned after use.
- Local and production AI share prompts, tools, model (GPT-6.1 Sol), medium reasoning, validation, and review behavior. Only provider differs: local openai-oauth proxy vs production OpenRouter. No silent paid-provider fallback.
- Coach receives actual sampled frame images and matching timestamped measurement text in bounded batches. Provider failure is visible; deterministic sample mode is explicitly labeled.
- Daytona provides the agent's file/process/browser environment even with the control plane on localhost. Only valid, screenshot-inspected configurations can be saved. Sandboxes auto-stop and are deleted after build completion; credentials stay on the control plane.
- Storage uses private buckets and short-lived signed reads. Database stores object keys, not permanent public URLs or video bytes.
- Locally run Vite, FastAPI, agent service, and OAuth proxy. Railway deployment is documented but not performed.

## Testing Decisions
The user subsequently requested pytest and Vitest suites, overriding the original brief’s no-new-suite preference. Add meaningful tests for numerical contracts, provider parity, reviewed-draft acceptance, asynchronous UI state, video validation/derivatives, and atomic session updates. Verify known motion/angle/unit/error fixtures, typecheck/build, and backend lifecycle/failure boundaries. Prioritize actual laptop journeys: select a joint, open and close its custom details panel, verify plain Speed/Acceleration number and unit formatting, and confirm joint readings remain in the panel while KaTeX x=0/y=0 labels appear on white chips at their coordinate axes. Check vector direction, units, missing samples, fixed scales, edge fitting, and the ground estimate’s earliest-clear/bottom-clipped cases. Record actual CSS viewport and zoom separately from screenshot raster dimensions. Existing mobile/Daytona captures remain supplemental responsive evidence rather than a new mobile-polish requirement. Include a fresh live AI+Daytona reviewed build and real supplied-video inference. Keep synthetic, deterministic, local-live, and production evidence distinct. Capture representative laptop screenshots and an acceptance PDF; disclose remaining gaps.

## Out of Scope
Athlete management UI, authentication, payments, public deployment, live camera recording, multi-athlete clips, moving-camera compensation, 3D biomechanics, ball/racket detection in this phase, generated UI, post-build tool editing, historical compatibility, Jev, and claims of clinical measurement accuracy.

## Further Notes
Neon destination: dedicated SportsBuilder project in Math Audio, AWS N. Virginia, private videos bucket and development branch. Environment files remain ignored; only placeholder credential/connection examples are committed. Nonsecret settings live in typed configuration. Python uses uv, ty, Ruff, pytest, NamedTuples and explicit types; TypeScript uses Vitest. Full specification supersedes the pasted NicheKit brief where they differ. Initial footage validation needs a real 30-second-or-shorter single-athlete clip; sample mode is synthetic.
