# Agentic evaluation reports

The manually invoked skill is [agentic-evaluations](../SKILL.md). It drives a student through the deployed app, then reviews app-visible evidence in a separate phase. This module validates the reviewer's JSON and renders graphs, a short summary PDF, and one complete chat PDF per Study Session. It does not run students, call a model, inspect private traces, or decide rubric judgments.

## Run

From the repository root:

```sh
bun .agents/skills/agentic-evaluations/scripts/report/cli.mjs /absolute/path/results.json --out /absolute/path/new-report-directory
```

PDF generation requires Python with `reportlab` and `pypdf`. Pass `--python /absolute/path/python3` or set `AGENTIC_REPORT_PYTHON`. In Codex, use `load_workspace_dependencies` to locate the bundled Python; no package install is needed. Normalized mathematical text is accompanied by app screenshots; this exporter does not typeset arbitrary LaTeX.

Use `--baseline /absolute/path/earlier-results.json` for compatible before/after views. Use `--html-only` to produce the chart gallery and computed JSON without Python/PDF dependencies. Existing report outputs are never overwritten; choose a fresh directory when revising a review. The source attempt/evidence remains immutable.

Outputs: `summary.pdf`, `chat-<session-id>.pdf`, `gallery.html`, standalone `charts/*.svg`, `computed.json`, and `pdf-validation.json`. The summary's extracted text is capped at 1,000 words. Findings are limited to 700 words to leave room for labels. Chats have no length cap, retain all captured messages, and visibly label incomplete capture. Inputs must include a complete transcript when claiming complete capture; completeness cannot be inferred automatically.

## JSON contract (schemaVersion 1)

Required run fields:

- `schemaVersion`: `1`.
- `runId`, `skillVersion`, `rubricVersion`, `appVersion`, `evaluator`: nonempty strings. Use `unknown` for a deployment identifier unavailable in the UI. Record actual student/reviewer identities, not assumed Grok identity.
- `findings`: array of short plain-text paragraphs; do not claim recurrence from one case.
- `cases`: nonempty array of the case records below.
- Optional `environment`, `phaseIsolation`, and `screenshots`: useful provenance and selected summary evidence.

Case fields:

- `id`, `scenarioVersion`, `family`; `split`: `training` or `held-out`.
- `attempt`: positive integer. Primary summaries use only complete attempt 1; retries never replace it.
- `status`: `complete`, `incomplete`, or `blocked`.
- `expectedChecks`: every common rubric ID plus `case-focus`. Include excluded checks explicitly. The reporter rejects missing declared IDs and extra/duplicate IDs.
- `checks`: reviewer observations below.
- `sessions`: ordered Study Sessions with `id`, `url`, `captureComplete`, and `messages`. Each message has `role` (`student` or `tutor`), complete `text`, and optional `screenshots`. Optional session `captureNotes` and `observations` preserve visible tools, proposal decisions, saved state and operational events in the chat appendix.

Check fields:

- `id`, `category`, `kind` (`binary` or `rate`), `status`, `note`, and nonempty `evidence` references.
- `status: observed`: integer `successes` and `opportunities`, with `0 <= successes <= opportunities` and `opportunities > 0`. Binary checks require exactly one opportunity.
- `status: not-applicable` or `unable-to-verify`: omit counts; explain the exclusion in `note` and `evidence`.
- `required` defaults to true. Only required binary checks determine case/category outcomes; rate metrics are displayed separately.
- Rate checks in this skill include `observations`: one ledger event per opportunity, with `turn`, `expected`, `actual`, boolean `success`, and `evidence`. Its counts must agree with the aggregate. Observed rate checks require this ledger. Define eligibility before judging success; ambiguous evidence is an unknown, not an inferred success.

Example of a single opportunity-based check (illustrative data, not a product result):

```json
{
  "id": "prep-proposals",
  "category": "exam-prep",
  "kind": "rate",
  "status": "observed",
  "successes": 1,
  "opportunities": 2,
  "note": "One correct proposal; one missed scope change.",
  "evidence": ["turn 4: date card", "turn 8: changed scope"],
  "observations": [
    {"turn":"4","expected":"Update date","actual":"Correct date proposed","success":true,"evidence":"date.png"},
    {"turn":"8","expected":"Add exam topic","actual":"No proposal by session end","success":false,"evidence":"closing.png"}
  ]
}
```

Screenshot records are `{path, caption}`; paths resolve relative to the results JSON directory. Images must remain inside that evidence directory, including after resolving symlinks. Invalid/missing images abort the export. Plain text is escaped in HTML/SVG/PDF; report generation does not execute input HTML.

## Scores and charts

All intervals are two-sided **80% Wilson score intervals**, using `z = 1.2815515655446004`, following the [NIST Wilson interval formula](https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm). These intervals describe uncertainty in a binomial proportion under independent observations; they are not an 80% probability that a fixed unknown success rate lies inside the bounds. Event rates within a chat are correlated, so their intervals are approximate. Scenarios are purposively selected, not random students; avoid population-wide claims.

A required-binary category outcome is fail if any observed required check fails; otherwise unknown if any required check is unverifiable; otherwise pass if at least one applicable required binary check exists. Rate-only categories have no binary outcome. Subject summaries use one outcome per case across required binary checks. Unknown and N/A counts remain visible outside observed denominators. No single overall score is generated.

The gallery includes category rates, subject rates, individual check rates, opportunity ratios, recurring failures counted by cases, evidence exclusions, attempt coverage, and before/after endpoints and percentage-point changes. Training and held-out charts are separate. Empty views explain missing observations or missing baselines instead of inventing values. Long plots paginate into groups of 18 rows.

Comparisons require matching evaluator, skill and rubric versions, case ID/scenario version, subject/split, and check definitions. Only complete first attempts with observed checks on both sides are paired. Their success/opportunity counts remain visible. Percentage-point changes are descriptive and have no Wilson difference interval or significance claim. App versions may differ because product prompts/tools are the treatment being compared.

## Verify

```sh
bun test --timeout 20000 ./.agents/skills/agentic-evaluations/scripts/report/*.test.mjs
AGENTIC_REPORT_PYTHON=/absolute/path/python3 bun test --timeout 20000 ./.agents/skills/agentic-evaluations/scripts/report/*.test.mjs
```

The second command adds an actual PDF export/extraction test, verifying that an 850-word chat is retained and incomplete capture is labeled. Other public-boundary tests cover Wilson limits, count/evidence validation, opportunity-ledger consistency, missing checks, exclusions, retries, comparison compatibility, escaped HTML, image path containment, and immutable output handling. Live browser runs supplement these deterministic reporter tests.

Reports contain synthetic test-session evidence and belong in the gitignored root `output/` directory. Future local scenario orchestration and controlled-time simulation are tracked in [#53](https://github.com/isaacwu2000/LearnUnlock/issues/53); reuse the existing Conversation Lab rather than duplicating it.

## Approval and report format

Show at most four cases per approval round. See `case-approval.md` for the current approved round. User approval applies to a case version; revised cases require new approval.

Skill versions 2, 3, and 4 results require `startedAt` and `endedAt` as exact UTC ISO timestamps (for example `2026-10-03T19:42:08.123Z`), `timeZone` as an IANA zone, and `localCommit` / `deployedCommit` as strings. Use `unknown` when the deployed commit is not visible. Do not derive run times from file metadata or equate a local commit with production.

`summary` contains ordered `minus`, `plus`, and `interesting` finding arrays, with M/P/I references. Each finding needs `text`, nonempty `records`, and `screenshots` with an image `path` and `caption`. Include supporting app-feature failures directly in `minus`. For earlier inputs, `summary.auxiliaryFailures` is accepted and renders in Minus with continuing M references. Every auxiliary failure needs its own screenshot and record. At most three Plus findings are permitted.

Skill version 5 creates one `evaluation.pdf`: the evaluation, score charts, an exact-time chat-export cover, and complete session exports. Set `reportFormat: "single-evaluation"` to reformat an earlier run. Preserve that run's original skill/scenario versions and timestamps. Reformatting does not claim a new simulation. Earlier report formats remain supported for archived inputs.

Evaluator observations belong in the invoking chat and detailed JSON records. In the unified format, `evaluatorNotes` is preserved as provenance but is excluded from the PDF. Native session exports are verified and preserved unchanged in the source evidence directory; the PDF appends their original pages. The short evaluation retains its 1,000-word cap; appended chats have no word cap.

Each session can provide `nativePdf` as a relative path to the original app-exported PDF and `nativeExportVerified: true` after visual verification. Native PDF paths must remain inside the evidence directory. Without native exports, generated transcript PDFs remain supplemental captures.

Versions 4–6 require screenshot evidence and records for every displayed finding, at most three Plus findings, and alternating mobile/desktop cases with `device` and integer `viewport:{width,height}`. The rubric accepts self-report for provisional initial level 1 and two distinct successful examples for later level 1, including assisted reproduction. Higher levels require stronger evidence.

All executable helpers and bundled fonts live inside the skill's `scripts/` directory.

Version 6 continues device alternation across invocations. Include `startingDevice: "mobile" | "desktop"`; each following case alternates from that assignment. Record the sequence assignment in attempt inputs and update the manifest when simulation starts. Preserve earlier run versions and device records.

Current packaging: `reportFormat: "separate-chat-exports"` writes `evaluation.pdf` and a separate `full-chats.pdf`. `summary.minusContext` is a short paragraph beneath Minus explaining event counting and recurrence. Display at most ten Minus findings in total, including auxiliary failures. The report folder includes portable results/computed JSON, assets, charts, and a renderer manifest with version, source commit, dirty status and hashes.
