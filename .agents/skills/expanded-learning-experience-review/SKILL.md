---
name: expanded-learning-experience-review
description: Exhaustively review complete LearnUnlock Tutor sessions as integrated learning experiences spanning chat, artifact references, whiteboard visuals, manipulation, assessment, and follow-up pedagogy. Use after creating or revising an interactive teaching experience, when comparing iterations, before accepting seeded or generated experiences, or when diagnosing visual, factual, responsive, interaction, accessibility, cognitive-load, or learning defects.
---

# Expanded learning experience review

Review the complete Tutor session as one learning experience, even when it currently
contains one message. Treat chat, artifact references, whiteboard visuals, manipulation,
feedback, and later questions as parts of one lesson. Assume competent design ability and
surface the largest educational risks before refinements.

## Run the evaluation

Complete this procedure in order. Do not modify the artifact during evaluation.

### 1. Establish scope without historical anchoring

Read `.agents/context/PRODUCT.md`, `.agents/context/DESIGN.md`,
`Web/src/app/globals.css`, the Impeccable skill, the learner-visible session, the current
specification and critique files under `plans/artifact-whiteboard-rendering/`, the
implementation contract, and
[the LearnUnlock artifact rubric](references/raw/learnunlock-artifact-rubric.md). Apply
Impeccable's product-UI register without repeating its general rules in the report. Do not
read prior critiques or the remaining `references/raw/` material yet.

Identify:

- every Tutor and learner message in the current session;
- the learner level demonstrated inside the session;
- the Tutor framing and operating instructions before each artifact;
- each artifact's intended knowledge model and meaningful manipulation;
- the conceptual feedback produced by that manipulation;
- later explanation, qualification, assessment, or direction.

Review the real Tutor session in its actual half-pane, never only source code or an isolated
full-width preview.

### 2. Make an unanchored first inspection

Read adjacent chat once, inspect the initial artifact state for five seconds, and exercise
the obvious first action. Record what the learner sees first, what appears manipulable, and
what relationship the experience communicates without repeated chat lookup.

Distinguish information that belongs in adjacent chat from information that must remain on
the visual for the representation to stay understandable and truthful.

Inspect the largest, most central, and highest-contrast claims before small details. Record
immediate ambiguity, misleading implication, unknown terminology, dead space, excess
controls, weak hierarchy, and unearned complexity. Capture an initial screenshot at every
required viewport before opening historical feedback.

### 3. State the integrated learning contract

Complete this sentence for every substantial artifact:

> After reading **the minimum framing** and manipulating **X**, the learner should see
> **Y relationship** and be prepared to infer or understand **Z** in chat.

If the sentence cannot be completed concretely, record a foundational defect. Remember
that artifact state remains local: Tutor chat cannot know which selection, value, camera
view, or experiment the learner reached unless the learner reports it.

### 4. Gather complete screenshot and interaction evidence

Screenshot review and live interaction review are both required. Exercise every offered
interaction type and every materially different state, not every numerical point on a
continuous control.

Cover:

- a 1920×1080 desktop viewport, laptop landscape, tablet landscape, and short landscape
  half-panes;
- initial, selected, focused, alternate-mode, return, reset, and error states;
- every control, selection, endpoint, and documented keyboard path;
- minimum, maximum, empty, overlap, long-content, and risk-bearing intermediate states;
- start, meaningful intermediate frames, end, reverse, repeated use, and reduced motion;
- click or tap, drag, empty-space behavior, keyboard, wheel or trackpad zoom, and pinch
  whenever offered or required;
- definitions, accessible names and states, focus order, non-color meaning, and accessible
  knowledge-model summary;
- console, CSP, libraries, assets, fonts, Canvas, WebGL, parsing, and failure fallback;
- reload, artifact switching, and resizing required by the current product contract.

Capture pixels, not only DOM bounds. A bounding box may fit while a line intersects the
subject, a label loses its referent, or perspective implies a false relationship. Mark
every required but untested path `Unknown`; never assume it passes.

### 5. Verify explicit and implicit truth

Verify every factual, mathematical, spatial, temporal, quantitative, or causal claim that
carries the lesson. Spot-check secondary labels. Check what prominence, scale, placement,
duration, geometry, transition, interaction, omission, and simplification imply to a
reasonable learner at the target level.

Use authoritative evidence or an explicit invariant for central claims. A qualification
needed to prevent a false inference must remain beside the affected representation. Chat
may extend a truthful visual but cannot repair a misleading one.

### 6. Apply the complete evaluation set

Read [the complete evaluation](references/eval.md) and score every applicable criterion.

For an artifact, select the applicable branch in
[artifact-family notes](references/notes/artifact-families.md) by the relationship being
taught. Treat each applicable family bullet as a binary criterion and assign the family
Likert score. Combine branches only when the learning contract genuinely combines their
defining mechanisms.

Record `Pass`, `Fail`, `Unknown`, or `N/A` for every binary and a rubric-anchored `1`–`5`,
`Unknown`, or `N/A` for every Likert dimension. Do not let a strength in one dimension
erase a failure in another. Continue the full evaluation after a block failure and still
calculate the score.

### 7. Calibrate against history only after the independent pass

Read the relevant current spec, strongest earlier iteration, and historical feedback in
`references/raw/`. Identify known failures the independent pass missed, regressions where
simplification removed educational value or visual richness, and successful decisions the
next iteration must preserve. Repeat the largest-element, extreme-state, and least-familiar
input checks after calibration.

Historical feedback is a calibration set, not a script. A reviewer that only repeats old
feedback has not independently evaluated the current experience.

### 8. Prioritize and report

Order findings by consequence:

- `P0`: false central lesson, factual or mathematical error, broken primary path, or unsafe
  behavior;
- `P1`: major obstacle to understanding, meaningful manipulation, spatial truth,
  accessibility, or required viewport/input operation;
- `P2`: hierarchy, fidelity, cognitive-load, concision, or craft defect preventing
  exemplary quality;
- `P3`: refinement with negligible learning or operational effect.

Within a priority, rank by learning damage, prominence, frequency, affected learners,
misleading potential, and regression risk. Every finding must name the concrete defect,
location and state, evidence, learner consequence, violated criterion, specific correction
outcome, and successful behavior to preserve. If the specification itself causes the defect,
name that conflict explicitly. Recommend the smallest outcome-level correction; do not
prescribe an implementation, redesign the experience, or provide code during evaluation.

Use this report:

```markdown
## Verdict
Exemplary | Iterate | Reject

## Score
Points earned / points available — percentage. Do not derive the verdict from a numeric
threshold.

## Evaluation ledger
- Block failures: every binary result.
- Non-pedagogy quality: every binary result and Likert score.
- Pedagogy quality: every binary result and Likert score.
- Artifact-family criteria: every applicable binary result and family Likert score.

## Integrated learning contract
Framing → manipulation → conceptual feedback → later chat rigor or question.

## Findings
1. [P1] Concrete title — state and evidence; consequence; violated criterion; specific
   correction; preserve.

## Notices
- Verified interaction failures and required paths that remain untested.

## Strengths to preserve
- Specific successful decisions, without generic praise.

## Coverage
- Complete session and chat context:
- Viewports and screenshots:
- States and value extremes:
- Inputs and motion:
- Truth and source checks:
- Accessibility:
- Console, resources, and failures:
- Untested gaps:

## Coverage confidence
High | Medium | Low — explain which unknowns reduce confidence.

## Evidence
- Initial: /absolute/path.png
- State: /absolute/path.png

## Residual risk
Specific remaining uncertainty, or “None.”
```

A verified interaction failure requires a prominent notice. An untested required path is
`Unknown`, requires a coverage notice, and lowers confidence. Do not replace the review
with a bare failure state. Do not approve from screenshots alone or while central truth,
the primary learning path, an offered interaction type, required viewport, core
accessibility, or runtime behavior remains unknown.

Award `Exemplary` only when no `P0` or `P1` findings remain and any remaining `P2` findings
are trivial polish rather than educational, interaction, accessibility, or hierarchy
defects.

## Iterate after the evaluation

Use the notes selectively while designing a correction or reviewing an iteration:

- [Principles](references/notes/principles.md): teaching instrument, meaningful
  manipulation, simplicity, subject-led form, truth, and LearnUnlock identity.
- [Pedagogy](references/notes/pedagogy.md): learner calibration, exploration, progressive
  disclosure, questioning, rigor, terminology, misconceptions, and representations.
- [Design and interaction](references/notes/design-and-interaction.md): whiteboard
  composition, responsive geometry, controls, motion, typography, accessibility, and
  resilience.
- [Artifact families](references/notes/artifact-families.md): family-specific corrections
  for spatial models, timelines, mathematics, simulations, sequences, diagrams, charts,
  and maps.
- [Review execution](references/notes/review-execution.md): deeper evidence matrices,
  risk sweeps, regression comparison, prioritization, and acceptance reasoning.

Correct the highest-priority underlying cause while preserving named strengths. Re-run
the entire evaluation from an unanchored first inspection after each material iteration;
do not review only the changed state. Use `references/raw/` for historical calibration
after the new independent pass, not as the design brief.
