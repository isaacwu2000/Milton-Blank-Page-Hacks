# SportsBuilder local prototype acceptance

Evidence reviewed October 17, 2026, America/New_York. This working local prototype
uses live AI, Daytona, Neon Postgres, and private Neon Object Storage integrations.
No application is deployed. Evidence spans local integration checkpoints and the
working tree; captures do not all represent one immutable final commit.

## Verification results

The latest TypeScript typecheck and behavioral tests passed after height onboarding,
custom numeric entry, three-section navigation, and thumbnail changes. The profile/calibration backend passed 62 pytest tests, ty, and Ruff.

- **Vitest:** The earlier full run passed 54 tests across 11 files. A later refinement checkpoint passed 63 tests and the production build before the warning popup replaced the inline warning; two focused popup cases and typecheck then passed. A final combined run after the popup remains to be recorded.
  Coverage includes nine Home, eight Player, and three Analysis cases, including
  sidebar reopening, canonical-height selection, calibration pause and seek reset.
  Coverage includes metric units/dependencies, provider parity/no paid fallback,
  private reasoning replay, exact reviewed-draft acceptance, async UI jobs,
  reference timing, home flows, and selected-joint arrows.
- **Python:** 62 pytest tests, Ruff, and ty passed after profile, height-calibration
  and private-thumbnail changes; latest live evidence is in `output/height-live-evidence.json`.
  Earlier typed runtime evidence is in `output/backend-evidence.json`.
  Python uses uv and 3.12.
- **Live builder:** local OAuth GPT-6.1 Sol with medium reasoning created
  **Overhead Reach**, including composed final-minus-initial wrist rise. The unchanged
  LearnUnlock harness accepted revision 1 after actual desktop/mobile Daytona
  inspection, and the reviewed tool persisted in Neon.
- **Final layout:** a real Daytona smoke loaded `Web/frontend/dist` from the moved
  backend runtime using uv-managed Playwright 1.55.0. Desktop/mobile reported zero
  page errors and rendered the expected tool. The sandbox was deleted afterward.

## Real video evidence

All supplied MOV originals persisted privately and completed body tracking at a
0.1-second interval. These measured uploads are separate from the labeled synthetic
interface sample.

| Original | Duration | Sampled images | Last timestamp | Outcome |
| --- | ---: | ---: | ---: | --- |
| IMG_0507.MOV | 18.60s | 186 | 18.5s | Completed after documented detector-fragment fix/retry |
| IMG_0508.MOV | 17.47s | 175 | 17.4s | Completed |
| IMG_0509.MOV | 27.53s | 276 | 27.5s | Completed |

Timestamps increased strictly; low-confidence points produced no derivatives.
Signed range reads matched original bytes, and completed session records persisted.
The final typed runtime additionally decoded IMG_0507 at a 1-second interval into
19 frames with typed model/video bundles. These checks establish the supplied
recording/analysis/storage path, not general pose accuracy or clinical validity.
Recorded pose confidence scores are model outputs, not calibrated probabilities.

## Journey and evidence matrix

| Journey | Tested state/environment | Evidence and limits |
| --- | --- | --- |
| Home, uploads/history | Current local browser: three actual 512×288 JPEG previews loaded, full-width history, arrow actions, central upload and sampling slider | `output/backend-evidence.json`; `output/screenshots/current-get-coached.png` |
| Single-athlete onboarding and navigation | Required height saved before upload; canonical Athlete reused, height edited under Your profile. Three sections preserve drafts; Get coached has upload/history and tool selection | Nine Home cases cover onboarding, editing, navigation, arrow-only completed rows, custom menu behavior and sidebar collapse/reopen |
| Numeric entry and thumbnails | Recessed decimal text input with cm suffix; private first-frame JPEG, fixed skeleton until load, static error placeholder | Three NumberInput and two SessionPreview cases; no full-video thumbnail fetch |
| Video analysis | Real 4K MOVs, queue/progress, detector rejection/corrected retry, stored image evidence | Backend evidence and private per-session analysis JSON in `output/` |
| Interview/build | Fresh OAuth interview; tool calls, math validation, Daytona pixels, exact revision acceptance, Neon save | `output/uv-build-result.json`; `output/builds/5198ef99-23b9-44cc-8aa8-b7920d962661/accepted.json` and screenshots |
| Player/joint inspection | Playback/scrub, selected point/measurements; deterministic vector fixtures | Player tests and earlier sample browser captures |
| Latest joint panel and velocity/acceleration arrows | Click-open/close panel, plain Speed/Acceleration labels, selected-only overlay geometry; eight Player cases cover directions, stable scale, missing evidence, edge fitting, arrowheads fitting short shafts, and white-backed KaTeX zero-axis labels | Final laptop capture on real stored footage; earlier builder/sample captures predate these last UI additions |
| Calibration, alignment, drills | Invalid inputs rejected; concurrent edits preserved; calibration pauses playback and seeking clears marks; exact canonical Athlete height wins over legacy test profiles | Backend evidence; calibration/Analysis/reference Vitest cases; synthetic browser walkthrough |
| Coach | 276 actual images in 9 batches; earlier measured session; unavailable optional reference | `output/live-coach-final-request.json`; `output/live-coach-final-result.json` |
| Final frontend/backend/shared layout | Real Daytona browser, final paths, uv-managed Python | `output/final-layout-smoke.json`; `output/builds/final-layout-smoke/desktop.png` and `mobile.png` |

The live coach recognized curl-ups rather than the configured squash forehand,
cited timestamps and measured elbow angles, and avoided an improvement claim when
movements/camera conditions differed. It reported the unavailable reference while
completing the athlete report. The drill was framed as a future squash recording
exercise, not a correction inferred from the unrelated footage.

## Visual evidence scope

The current browser walkthrough used CSS 1152×720 at zoom 1.3. Genuine PNG
headers confirm `current-get-coached.png` at 1481×1325, `current-profile.png` at
1497×935, and `current-synthetic-calibration.png` at 1481×1864, all under
`output/screenshots/`. Raster dimensions depend on page content and do not replace
the CSS viewport. These current captures show the final central upload task,
sidebar hamburger, one-athlete profile and custom height entry, and the separately
labeled synthetic calibration result. All three real first-frame previews loaded;
profile height 178 cm retained three inset shadow layers; saving returned to
Get coached. Builder interview, sidebar collapse/reopen focus, and slider 2-second
selection followed by restoration to 0.1 were browser-verified.

The synthetic walkthrough used 178 cm and produced a selected scalar speed of
0.361 m/s and acceleration of 1.07 m/s², with KaTeX unit fractions. This is
explicitly synthetic UI/calculation evidence, not physical measurement of a
supplied clip. The fresh real-clip capture `output/screenshots/current-real-analysis.png` shows
the saved 178 cm profile, scale prompt, visible axes, and withheld dimensional
readings; a DOM check found no visible pixel units. All three supplied clips still
lack a qualifying automatic height reference.

Laptop use is the current priority. An earlier laptop check recorded CSS 1152×720
at zoom 1.3. `output/screenshots/final-laptop-viewport.json` records the actual
viewport, content dimensions, sample time 5.01s, and revision `0d2a331 plus final
frontend working tree`, using live Neon-stored IMG_0508.MOV. Its historical full-page
PNGs are `final-home-laptop.png` (1481×1457), `final-joint-panel-laptop.png`
(1481×1762), and `final-ground-laptop.png` (1481×1582). That home capture shows the previous shell with one athlete implicitly, the open
coaching-tool menu, and no sidebar footer; it predates the current three-tab layout. The browser check
opened and closed joint details and verified plain scalar readings without
persistent joint text, with white-backed KaTeX axis labels. The first-frame ground
capture shows the repaired line at estimated shoe contact. Raster size
is distinct from the CSS viewport. Earlier `.png`-named preview captures can contain
JPEG data and are supplemental historical evidence.

The final-layout Daytona viewports were controlled: desktop 1440×1000, mobile
390×844. Their full-page PNGs are 1440×1472 and 390×1757. They establish the sample
preview at those viewports, not real-video coaching or full accessibility. The
latest laptop joint-panel capture supplements these earlier responsive checks.

The final analysis title retains the real footage filename without the redundant
athlete/tool metadata subtitle. Arrowheads use reduced user-space geometry within
the measured shaft and terminate at the exact vector endpoint; the fifth Player
regression covers short shafts on high-resolution clips. These last corrections
are represented by the final working tree rather than retroactively attributed to
earlier captures.

The coordinate axes now use LearnUnlock grapher styling with white-backed KaTeX
`x=0`/`y=0` labels; joint details still show plain Speed/Acceleration values and
units, with compact physical-unit fractions. The reusable Math component exposes accessible MathML with trusted HTML
commands disabled. Five shadow tokens were copied exactly from LearnUnlock's
canonical stylesheet, replacing the earlier single-layer approximation; dropdown
triggers use the three-layer inset token and menus use the medium raised token.
A whitespace-normalized source comparison passed, and the live dropdown trigger
showed all three inset layers in computed browser styles. These styles appear in
the historical laptop captures; the earlier live builder/coach evidence predates them.

The automatic ground line now estimates initial shoe contact from the earliest
clear detected person lower bound, with a confident ankle in the box's lower half
and at least two processed pixels of bottom clearance. It waits past a clipped
candidate and rejects a clip if no clear candidate exists. This is a bounding-box
estimate, not sole segmentation; manual ground/calibration overrides remain valid.
Earlier tracking and coach artifacts above used the previous ankle-based origin.
Stored ground metadata was repaired for all three supplied clips: IMG_0507 at
2151.631px (0.1s, skipping the clipped initial detection), IMG_0508 at 2149.276px
(0s), and IMG_0509 at 2019.101px (0s), each in a 2160px-high frame.
`output/ground-repair-evidence.json` records unchanged frame/joint/image hashes
and preserved manual-override fields; this repair did not rerun pose inference.

The latest shell has Build your coach and Get coached at the sidebar top, with
Your profile anchored at the bottom. Required
height onboarding saves the single Athlete profile before upload; editing height
reuses its identity. Custom numeric inputs preserve decimal drafts and validate
range/step without browser spinners. Get coached centers an unframed upload task on the page background, with full-width
video history below. That capture predates removal of the sample entry and duplicate subtitle. Workspace breadcrumbs and duplicate
builder controls are removed. Completed recent rows show an arrow action and a
private first-frame preview, with no aggregate count or Ready label. A visible
pre-upload slider selects 0.05–2 seconds in 0.05-second steps (default 0.1), applied
to both tracking and coach images. Home tests verify the default and 2-second
value in uploaded form data. The `current-*` captures represent these latest shell
changes; older laptop captures remain historical. Older session links are retained.

Live height/profile checks persisted 178 cm on the canonical Athlete record and
verified all three private JPEG previews. The existing clips remain physically
uncalibrated: no stable upright, uncropped head-to-shoe span meets automatic scale
requirements. Automatic height calibration requires three stable upright samples,
with uncropped bounds and wrists below the head. The manual head/sole fallback
with saved height was tested without relabeling pixel data as physical evidence.
See `output/height-live-evidence.json`.

AGENTS.md now explicitly carries unfinished requests forward across user feedback,
reconciles conflicts using the latest direction, and allows cancellation/deferment
only on an explicit request. This records the user’s correction about cumulative
work: the failure mode was treating a new message as replacement scope; the small
intervention is the explicit carry-forward rule, checked by reviewing remaining
requests before completion. Guidance link validation passed; no new visual taste
policy was added.

Dark mode is deferred to [issue #3](https://github.com/isaacwu2000/Milton-Blank-Page-Hacks/issues/3); no dark theme or theme control is implemented.

## Latest live coach check

A fresh browser question on IMG_0508.MOV used the current local OAuth service
(GPT-6.1 Sol, medium reasoning) after the unit-display guard changed. The coach
withheld uncalibrated physical distances, speed and acceleration, recognized the
visible repositioning/squats rather than a forehand, and returned a practical
shadow-swing drill. No pixel units appeared in the rendered page. This is actual
video evidence, separate from the labeled synthetic calibration walkthrough.
Private evidence: `output/current-live-coach-browser.json`.

The independent final visual review found no material defects in the requested
laptop changes. Sidebar collapse and reopening were additionally checked in the
live browser, including focus restoration.

## Boundaries and remaining validation

- One athlete, stationary-camera 2D clips up to 30 seconds. Body joints do not track
  balls/rackets or establish precise 3D biomechanics.
- Physical lengths/speeds/acceleration require a valid planar scale. Uncalibrated
  pixel changes cannot establish physical improvement across camera setups.
- Synthetic movement demonstrates UI/math plumbing, not uploaded-video inference.
- Local ChatGPT OAuth is live-tested. Production OpenRouter has parity/no-fallback
  regression coverage, but was not exercised live in this acceptance run.
- No deployed app, authentication, multi-user load validation, or Railway production
  acceptance. Agent jobs remain in memory in one local process.
- Camera/occlusion limitations and storage/model/provider latency remain relevant.
  An accepted configuration does not certify coaching quality for every input.

Raw footage, analysis images, signed-read checks, and transcripts stay in ignored
local evidence storage. Keep secrets, temporary signed URLs, and private video
artifacts out of commits containing this record.


## Builder and prompt refinement checkpoint

The current working tree adapts LearnUnlock's raised PromptBar in the interview
and coach: optional-reference plus action in the builder, compact 28px circular
send action, bounded textarea growth, and keyboard/composition guards. Decorative
assistant-message icons are removed. The builder no longer sits inside a tall
outer card; its conversation uses the thin LearnUnlock-style scrollbar. The
sidebar logo is 24px. Get coached uses the title-case heading Your Athletic Dreams
Will Become a Reality, with the subtitle and sample entry removed.

Build is available during an unfinished interview. The current unsent prompt is
included. A centered native popup warns about missing details; Keep talking is
the primary, initially focused choice, and Build anyway is secondary. The backend
accepts an absent brief and derives a validated one through the configured model
before opening Daytona. Supplied briefs retain their existing path. Unanswered
assistant suggestions must not be treated as user agreement; unresolved choices
are labeled assumptions. Invalid generated briefs fail before sandbox creation.

Deterministic evidence: three draft-brief service cases cover generation through
the configured provider, unchanged supplied briefs without an extra model call,
and rejection of invalid generated data. The four provider parity/failure cases
also passed. A fresh live OAuth GPT-6.1 Sol medium call generated a validated
beginner squat brief with two knee-angle metrics, conservative recording/form
assumptions, and no invented numerical good-form thresholds. The first live
attempt exposed overly long labels; explicit schema field lengths corrected that
failure, and the fresh retry passed. This establishes live draft extraction,
not completion of the new full early-build journey.

`output/screenshots/early-build-popup.png` records the current popup over the
unframed builder; `output/screenshots/builder-refinement.png` is an earlier
refinement capture and must not be used as proof of the current popup. The current
one-page refinement PDF uses the popup image only. A fresh full early-build browser/Daytona/save run completed successfully: job
`f6479c79-8351-451a-ab7f-ec2c438399a0` saved the validated
Beginner Running Knee-Angle Coach — Draft (`caae461b-fad6-4c8a-a26a-921d43e66952`).
Its provisional assumptions remain explicit. Reviewed draft screenshots and
acceptance data live in `output/builds/f6479c79-8351-451a-ab7f-ec2c438399a0/`.
The current TypeScript suite passes 65 tests. All refinement evidence is local, with no deployment.

## One-command local setup

Revision `0691488` adds `bash install.sh`. A real macOS install-only run reused
existing credentials, installed/reused managed runtimes, synced both dependency
sets, prepared Neon Postgres, checked the private video bucket, and built the app.
The repeat run passed; transcript: `output/setup-validation.log`.

Seven isolated bootstrap cases cover absent runtimes, an older Bun, checksum
failure, missing downloader, unsupported OS, help, and bad arguments. Five isolated
assistant cases cover preserved environment files, missing credentials, failed
installs, literal JSON credentials, and default startup/shutdown. These use local
fixtures rather than claiming a fresh-machine Linux installation.

Provider checks cover Codex-present/absent selection, explicit overrides, and
production OpenRouter. Request failures do not switch providers. JSON credential
checks cover punctuation, existing-value precedence, and sanitized errors in
Python and TypeScript. A new live OpenRouter request and a cold Node download were
not performed; their existing transport and installer paths have deterministic
coverage/inspection only. Final gates: 74 Vitest tests, 85 pytest tests, build,
TypeScript, ty, Ruff lint/format, and agent-guidance links passed. No deployment.


## Mobile navigation refinement

The mobile shell starts hamburger-only at 900px and below. A real browser check
at 390×780 CSS pixels measured the open drawer at 343.2px wide and full height.
The brand and all navigation labels remain visible. Selection and Escape close
the drawer and restore hamburger focus. The backdrop closes it, background content
is inert while open, and desktop collapse persistence remains separate. Eleven
focused Home cases cover existing workspace behavior and mobile navigation.
Captures: `output/screenshots/mobile-sidebar-closed.png` and
`output/screenshots/mobile-sidebar-open.png`. Local verification only.


## Native Windows installer checkpoint

`install.ps1` provides the Windows counterpart to `install.sh`: PowerShell 5.1,
per-user Bun/uv/Python bootstrap, SHA-checked Bun, private credential-directory
ACLs, and the same missing-credential interview. Native Windows Intel/AMD x64 is
the supported target; ARM and 32-bit shells are rejected with guidance. Shared
runtime changes handle Windows Node ZIP layout, semicolon PATH entries, direct
Node execution of npm's npx entry point, and owned process-tree cleanup. Vite's
file URL paths use fileURLToPath for Windows drive letters and spaces.

The offline PowerShell harness passed on macOS using verified Microsoft
PowerShell 7.6.7. Focused checks passed: 18 Vitest cases and 23 pytest cases,
TypeScript, Ruff lint/format, ty, and local build. The native cold-bootstrap,
repeat-install, dependency import, and build workflow is committed in
`.github/workflows/windows-setup.yml`. GitHub run 39050204063 was rejected before
any runner/steps started: recent account payments failed or the spending limit
needs increasing. Native Windows PowerShell 5.1 execution, ACL enforcement, and
cold-runtime downloads therefore remain unverified until that workflow can run.
No billing settings were changed. This is local installer implementation,
not a production deployment.
