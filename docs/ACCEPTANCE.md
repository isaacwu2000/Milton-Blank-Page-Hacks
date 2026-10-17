# SportsBuilder local prototype acceptance

Evidence reviewed October 17, 2026, America/New_York. This working local prototype
uses live AI, Daytona, Neon Postgres, and private Neon Object Storage integrations.
No application is deployed. Evidence spans local integration checkpoints and the
working tree; captures do not all represent one immutable final commit.

## Verification results

The latest build/typecheck and all 35 Vitest tests passed after the single-athlete
UI change. The ground-estimate backend passed 35 pytest tests, ty, and Ruff.

- **Vitest:** 35 tests across 7 files passed in the final regression run.
  Coverage includes metric units/dependencies, provider parity/no paid fallback,
  private reasoning replay, exact reviewed-draft acceptance, async UI jobs,
  reference timing, home flows, and selected-joint arrows.
- **Python:** 35 pytest tests, Ruff, and ty passed after the ground-estimate
  correction; earlier typed runtime evidence is in `output/backend-evidence.json`.
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
| Home, uploads/history | Local browser and persistent records; home lists all sessions; latest UI hides athlete management | `output/backend-evidence.json`; `output/screenshots/final-home-laptop.png` |
| Single-athlete upload and tool selector | Canonical Athlete reused or created on first upload, cached across failed retries; no athlete picker/navigation/footer. LearnUnlock tool menu retains disabled/loading, keyboard, outside dismissal and focus behavior | Six Home regression cases; no new runtime dependency |
| Video analysis | Real 4K MOVs, queue/progress, detector rejection/corrected retry, stored image evidence | Backend evidence and private per-session analysis JSON in `output/` |
| Interview/build | Fresh OAuth interview; tool calls, math validation, Daytona pixels, exact revision acceptance, Neon save | `output/uv-build-result.json`; `output/builds/5198ef99-23b9-44cc-8aa8-b7920d962661/accepted.json` and screenshots |
| Player/joint inspection | Playback/scrub, selected point/measurements; deterministic vector fixtures | Player tests and earlier sample browser captures |
| Latest joint panel and velocity/acceleration arrows | Click-open/close panel, plain Speed/Acceleration labels, selected-only overlay geometry; six Player cases cover directions, stable scale, missing evidence, edge fitting, arrowheads fitting short shafts, and white-backed KaTeX zero-axis labels | Final laptop capture on real stored footage; earlier builder/sample captures predate these last UI additions |
| Calibration, alignment, drills | Invalid inputs rejected; concurrent ground/drill edits preserved; reference timing fixtures | Backend evidence; reference-video Vitest tests |
| Coach | 276 actual images in 9 batches; earlier measured session; unavailable optional reference | `output/live-coach-final-request.json`; `output/live-coach-final-result.json` |
| Final frontend/backend/shared layout | Real Daytona browser, final paths, uv-managed Python | `output/final-layout-smoke.json`; `output/builds/final-layout-smoke/desktop.png` and `mobile.png` |

The live coach recognized curl-ups rather than the configured squash forehand,
cited timestamps and measured elbow angles, and avoided an improvement claim when
movements/camera conditions differed. It reported the unavailable reference while
completing the athlete report. The drill was framed as a future squash recording
exercise, not a correction inferred from the unrelated footage.

## Visual evidence scope

Laptop use is the current priority. The final verified CSS viewport is 1152×720
at zoom 1.3. `output/screenshots/final-laptop-viewport.json` records the actual
viewport, content dimensions, sample time 5.01s, and revision `0d2a331 plus final
frontend working tree`, using live Neon-stored IMG_0508.MOV. The genuine full-page
PNGs are `final-home-laptop.png` (1481×1457), `final-joint-panel-laptop.png`
(1481×1762), and `final-ground-laptop.png` (1481×1582). Home shows one athlete
implicitly, the open coaching-tool menu, and no sidebar footer. The browser check
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
units. The reusable Math component exposes accessible MathML with trusted HTML
commands disabled. Five shadow tokens were copied exactly from LearnUnlock's
canonical stylesheet, replacing the earlier single-layer approximation; dropdown
triggers use the three-layer inset token and menus use the medium raised token.
A whitespace-normalized source comparison passed, and the live dropdown trigger
showed all three inset layers in computed browser styles. These changes appear in
the latest laptop captures; the earlier live builder/coach evidence predates them.

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

The latest home simplification removes athlete management and the sidebar footer.
It preserves older data and video associations; new uploads use the default Athlete
record without importing biography from prior test profiles. The latest home
capture verifies this layout; older captures show historical athlete controls.

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
