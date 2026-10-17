# Daytona deployment acceptance

This is an implementation of the authorized public 48-hour testing host. The app is available without authentication and intentionally shares the existing Neon records and bucket across all visitors. No custom domain was selected.

- Public URL: https://8000-d4bad68f-e5d4-4b95-8eb2-1236ab0976c5.daytonaproxy01.net
- Deployed app revision: `295ff92827ac54d478f9e1c82145d2432f860902`.
- Source archive SHA-256: `ac92959d975ab57bef6378932f9c3dbf6288d740c31c97b911ccd630b47fc629`.
- Provider-confirmed expiry: October 19, 2026, 18:08:24 UTC / 2:08 p.m. EDT.
- Resources: 2 vCPU, 4 GiB RAM, 10 GiB disk; one API process and tracking worker.
- Existing Neon destination and production OpenRouter model/reasoning policy are preserved.

## Evidence matrix

All live evidence below comes from the deployed revision above. Desktop browser CSS viewport was 1107 x 692 at 130% browser zoom; full viewport captures are 1440 x 900 raster pixels. Supplemental mobile browser CSS viewport was 390 x 844 at the same zoom; capture is 507 x 1097. Raw viewport/layout records distinguish CSS sizes, browser zoom and raster dimensions. These are browser checks, not physical-device certification.

| Changed journey | Tested states and outcome | Evidence under ignored `output/daytona-deployment/` |
| --- | --- | --- |
| Public entry | First-visit Daytona notice, continue without signup, existing workspace loads | `home-desktop.jpg`, `mobile-home.png`, `mobile-metrics.json` |
| Existing Neon library/playback | Existing records visible; saved analysis opens; signed footage range read returns 206 | `saved-analysis-desktop.jpg`, `joint-details-desktop.jpg`, `final-live-check.json` |
| Upload and real tracking | Supplied 27.53-second MOV uploaded in browser; queued/processing; 276 real frames at 0.1s; persisted complete result | `processing-desktop.jpg`, `remote-progress.json`, `deployed-session.json`, `real-analysis.png` |
| Unavailable physical scale | Cropped reference does not establish scale; detail panel stays unavailable rather than inventing meters | `real-analysis.png`, `analysis-metrics.json` |
| Normal coach building | Production streaming response; complete validated draft; explicit save; persisted library entry | `stream-result.json`, `saved-stream-coach.json`, `stream-live.log` |
| Targeted refinement | Renamed own test coach through UI; prior configuration stays visible; ready-to-save then saved; original immutable coach remains | `public-test-coach.png`, `browser-metrics.json`, `final-live-check.json` |
| Image-grounded coaching | Real 4.1-second footage processed; coach correctly reports it is not a squat, with evidence and limitations | `coaching-result.json`, `coaching-live.log` |
| Process failure/recovery | API killed during controlled real-video analysis; supervisor restarts it; expired lease reclaimed; different run completes; footage retained | `recovery-events.json`, `recovery-result.json`, `recovery-live.log` |
| Storage/capacity boundaries | Hosted writes refuse new bytes beyond 4 GB without deleting existing objects; concurrent recovery/admission respects five active jobs | `pytest.log`; deterministic tests in `test_store.py` and `test_restart_recovery.py` |
| Duplicate deployment prevention | CLI refuses another attempt when host metadata exists, before creating billable resources | `duplicate-deployment-check.log` |

The short report is `output/pdf/daytona-acceptance.pdf`, rendered and visually inspected as three pages. Raw screenshots, JSON and logs above are complete supporting evidence; the report does not reproduce full chats or source footage.

## Measurements

- Current local analysis: 442.45 seconds plus 5.05 seconds to load models, for the same 27.53-second clip and 276 frames.
- Server first run: approximately 491.01 seconds from saved upload record to observed completion, including first model setup and persistence.
- The local run overlapped validation load. This is an observed comparison, not a controlled proof of equal throughput. Earlier local notes reported 98-140 seconds; do not claim the deployed host meets that historical timing.
- Public status reads while tracking: median 70 ms, p95 295 ms across the sampled observations.
- Controlled crash-to-recovered-completion: 126.3 seconds, including the lease expiry interval and reprocessing the short real clip.
- Normal streaming builder: first useful text at 9.85 seconds; whole validated configuration at 22.27 seconds. Explicit save and later immutable refinement persisted.

## Checks

`bun run build`, TypeScript checks, Ruff checks/formatting and ty passed. The final full TypeScript run passed 176 tests across 37 files with two workers. Python passed 138 tests. Three UI tests initially exceeded their five-second timeout during concurrent inference; all 25 tests in those files passed on focused rerun, followed by a clean complete run. No timeout thresholds were increased.

Recorded logs: `build.log`, `vitest-final.log`, `vitest-retry.log`, `pytest.log`, `changed-tests.log`. Tests use controlled seams and do not substitute synthetic motion for the live uploaded-video checks.

## Standards

Independent review found no material non-tool-enforced standards violations or consequential heuristic concerns. Two operational findings were reported and fixed:

1. Recovery checked queue capacity outside the lock used by new requests; serialize recovery/admission and verify the race with a behavior test (`b1acde3`).
2. Deployment reported running immediately after asynchronous process launch; require bounded internal and public health readiness, capture failure logs and clean up unusable hosts (`b1acde3`).

The later HTTPS bridge review found no concrete correctness/security blocker in the existing single-statement store operations. Live saves, JSONB updates, claims, renewals and terminal writes were exercised by creation, refinement, real tracking and recovery.

## Spec

The independent spec axis reported the same two gaps: five-job capacity could be exceeded during recovery, and an unusable host could be reported as running. Both were fixed before accepted deployment. The immutable deployment commits were reviewed separately from earlier unrelated app changes; the shared origin/main moved during work. The deployed source revision is recorded explicitly above.

## Limits and unverified scope

- The optional explicit `/agent/build` screenshot-review diagnostic failed from the hosted network when contacting Daytona's toolbox proxy. The normal streaming builder does not use this route and passed. Experimental linked networking was rejected by its host-access check, removed from source and the host, and its diagnostic sandboxes were cleaned up. Do not claim deployed diagnostic-review acceptance.
- Live empty-workspace behavior was not exercised because the user required the same existing Neon workspace. Deterministic existing suites cover empty/loading/error cases.
- Full five-clip simultaneous real-video load and physical phone behavior were not benchmarked. Jobs are serialized; queue waiting increases total turnaround.
- This supervisor restarts processes inside a running sandbox. It does not recreate a stopped, failed or expired Daytona host, or resume interrupted AI requests. Those requests require retry.
- Provider TTL metadata confirms the deadline; actual future deletion cannot be observed before October 19. Neon data persists after host expiry.
- The 4 GB write guard covers this bucket only. Other project branches, database compute/storage and bandwidth remain subject to actual Neon plan allowances. Provider-side spending limits remain user-controlled.
- No app credentials, raw footage, full chats or private screenshots are committed to Git.
