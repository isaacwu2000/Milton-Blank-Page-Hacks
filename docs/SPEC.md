# SportsBuilder prototype specification

## Problem Statement
Coaches and athletes need a simple way to inspect movement and create reusable sport-specific coaching tools without coding. Reliable tracking and calculations should come from shared software, while AI handles interviewing, configuration, explanation, and drills.

## Solution
A local two-screen React/TypeScript application in Web/frontend, with backend services in Web/backend and shared contracts in Web/shared with a Python/FastAPI video backend, a TypeScript agent using Daytona for tool creation and browser inspection, Neon Postgres for records, and private Neon Object Storage for footage. Follow LearnUnlock's existing Clear Path Studio design and reuse its components and bounded review-loop harness. No authentication or deployment in this phase.

## User Stories
1. As an athlete, I can upload a clip up to 30 seconds and see processing progress and actionable errors.
2. As a coach, I can create athlete profiles with optional height, weight, dominant side, experience, and notes, with metric/imperial entry.
3. As an athlete, I can revisit uploads and choose a reusable coaching tool.
4. As a builder, I can answer a guided AI interview about sport, audience, desired metrics, and good form.
5. As a builder, I can review the rubric and optional reference footage before building.
6. As a builder, my agent can use files, terminal commands, calculation tools, and a real browser in Daytona, inspect screenshots, repair a draft, and submit a checked JSON tool.
7. As an athlete, I can play, pause, scrub, and click tracked body joints to inspect position, velocity, and acceleration.
8. As an athlete, I can adjust one sampling interval (default 0.1 seconds) that controls both tracking and coach image evidence.
9. As an athlete, I see x=0 at the left frame edge and y=0 at initial feet, with positive y upward; I can correct the ground line.
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
- Two primary surfaces: home (uploads, profiles, tools; builder interview is an inline panel) and analysis (player, clickable overlay, plots, reference comparison, metrics, and coach conversation).
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
The user subsequently requested pytest and Vitest suites, overriding the original brief’s no-new-suite preference. Add meaningful tests for numerical contracts, provider parity, reviewed-draft acceptance, asynchronous UI state, video validation/derivatives, and atomic session updates. Verify the numerical engine with known motion/angle/unit/error fixtures, typecheck and build, exercise backend lifecycle and failure boundaries, and run actual desktop/mobile UI journeys. Include one fresh live AI+Daytona build and real video inference if services and footage permit. Keep deterministic sample evidence separate from real inference and disclose unavailable checks. Capture representative screenshots and an acceptance PDF.

## Out of Scope
Authentication, payments, public deployment, live camera recording, multi-athlete clips, moving-camera compensation, 3D biomechanics, ball/racket detection in this phase, generated UI, post-build tool editing, historical compatibility, Jev, and claims of clinical measurement accuracy.

## Further Notes
Neon destination: dedicated SportsBuilder project in Math Audio, AWS N. Virginia, private videos bucket and development branch. Environment files remain ignored; only placeholder credential/connection examples are committed. Nonsecret settings live in typed configuration. Python uses uv, ty, Ruff, pytest, NamedTuples and explicit types; TypeScript uses Vitest. Full specification supersedes the pasted NicheKit brief where they differ. Initial footage validation needs a real 30-second-or-shorter single-athlete clip; sample mode is synthetic.
