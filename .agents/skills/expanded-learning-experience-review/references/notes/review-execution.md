# Review execution

## Contents

1. [Review object](#review-object)
2. [Unanchored inspection](#unanchored-inspection)
3. [Evidence matrix](#evidence-matrix)
4. [Largest-risk sweeps](#largest-risk-sweeps)
5. [Truth checks](#truth-checks)
6. [Regression review](#regression-review)
7. [Prioritization](#prioritization)
8. [Specific findings](#specific-findings)
9. [Acceptance](#acceptance)

## Review object

Review the entire real Tutor session, even when it currently contains only one message:

- every Tutor and learner message currently present;
- preceding chat framing and instructions;
- artifact reference placement;
- whiteboard composition;
- initial artifact state;
- every meaningful manipulation and state;
- later chat rigor, qualification, or question;
- responsive, accessible, error, and reduced-motion behavior.

Never approve an isolated full-width development preview. Never review source alone.

## Unanchored inspection

Inspect before reading known critiques so the reviewer must notice current problems
independently.

1. Read product, design, tokens, current spec, and learner context.
2. Inspect the real initial state for five seconds.
3. Name the subject, primary relationship, and apparent manipulation.
4. Inspect the largest and most central claims.
5. Exercise the obvious first action.
6. Record provisional findings with screenshots.
7. Complete broad state and viewport coverage.
8. Only then read historical feedback and iteration evidence.

This prevents feedback parroting while retaining calibration benefits.

## Evidence matrix

Investigate exhaustively. Adapt the matrix to the artifact, but do not silently skip an
applicable axis.

| Axis | Minimum evidence |
| --- | --- |
| Integrated chat | framing, instructions, later rigor/qualification/question |
| Viewports | desktop composition, laptop landscape, tablet landscape, short landscape |
| Artifact states | initial, every selection family, every mode, return/reset |
| Values | minimum, maximum, and representative intermediate values; not every point on a continuous control |
| Motion | start, meaningful intermediate frames, end, reverse, reduced motion |
| Pointer/touch | click or tap, drag, empty-space behavior, direct manipulation |
| Zoom | wheel/trackpad and two-pointer pinch when spatial navigation exists |
| Keyboard | focus order, Enter/Space, documented arrows, Escape/reset |
| Definitions | unknown terms and accessible disclosure |
| Truth | authoritative source or explicit invariant for central claims |
| Runtime | console, CSP, libraries, assets, rendering, failure fallback |

Exercise every kind of interaction the learner could make, not every possible numerical
value. For example, test click, drag, keyboard adjustment, reset, wheel or trackpad zoom,
and pinch when each is offered; for a slider, test its endpoints and risk-bearing
intermediate values rather than every increment.

Combine axes where defects concentrate:

- 3D: viewport × orbit × zoom × focus × projected labels.
- Timeline: duration extremes × label density × primary/transition selection.
- Mathematics: parameter combinations × transformation progress × label attachment.
- Simulation: control extremes × causal output × reset × repeated use.
- SVG: longest label × smallest pane × connector routing.
- Chart: data extremes × label density × scale × provenance.

Capture pixels, not only DOM bounds. A bounding box can be inside the viewport while a
line crosses the subject, a referent disappears, or the camera makes the model misleading.

## Largest-risk sweeps

### Five-second sweep

Ask what the learner sees first, what they can manipulate, and what relationship reads
before detailed explanation.

### Largest-element sweep

Review the largest, most central, and highest-contrast elements first. Ask whether their
area matches teaching value and whether their geometry or implication is truthful.

### Proximity sweep

Trace every floating label, dimension, definition, qualification, and control to a
visible referent. Confirm related information is adjacent or explicitly connected.

### Interaction-gain sweep

For each action, complete:

> Before the action the learner can see __. After it they can newly see __.

Reject actions whose only result is different prose, arbitrary decoration, or a prettier
state without new intuition.

### Obviousness challenge

Assume one embarrassing defect remains. Reinspect:

1. biggest object;
2. first control;
3. central factual or mathematical claim;
4. most extreme value;
5. shortest pane;
6. least familiar supported input;
7. every floating label and visible referent;
8. every simplified, reconstructed, transitional, or uncertain state;
9. most polished element and whether it teaches;
10. strongest earlier iteration for lost value.

## Truth checks

Verify the variables that carry the lesson:

- spatial: position, orientation, common scale, perspective, occlusion, terrain, material;
- temporal: duration, order, gap, overlap, approximation, contested transition;
- mathematical: invariant, proportion, bound, notation, exactness, transformation;
- causal: input, response, dependency, delay, feedback, counterexample;
- historical/scientific: reconstruction, hypothesis, category, causal wording, source;
- quantitative: baseline, units, aggregation, uncertainty, sampling, provenance.

Check implicit simplifications and inaccuracies even when the artifact does not state
them. Omission review is part of truth review.

## Regression review

Compare the current artifact with the strongest earlier iteration.

Identify:

- clutter removed successfully;
- educational detail removed accidentally;
- visual richness flattened into generic simplicity;
- a bug moved to a different state, input, or viewport;
- accessibility lost while interaction improved;
- truth improved while legibility declined;
- polish added while learning gain weakened.

Name strengths to preserve beside corrections. This prevents oscillation between clutter
and emptiness.

## Prioritization

Investigate all applicable criteria before final ordering.

- `P0`: central lesson false, factual/math error, broken primary path, unsafe.
- `P1`: major block to understanding, meaningful manipulation, spatial truth,
  accessibility, or required responsive/input behavior.
- `P2`: visible hierarchy, fidelity, cognitive-load, concision, or craft defect preventing
  exemplary status.
- `P3`: optional refinement with negligible learning or operational effect.

Rank within each level by educational damage, visual prominence, frequency, reach,
misleading potential, and regression risk. Report exhaustively, but make priority obvious.

## Specific findings

Feedback should resemble a precise annotated design critique.

Include:

- exact element and state;
- screenshot or measurement;
- why the learner is harmed or misled;
- the violated decision or principle;
- specific replacement outcome;
- preserved strength.

Good:

> The comparison places all monuments on one straight baseline, which reads as a real
> site arrangement. Use approximately truthful placement and common scale while keeping
> direct labels and the existing focus interaction.

Weak:

> Improve spatial accuracy and hierarchy.

Do not prescribe implementation code unless the review depends on a technical limit.

## Acceptance

`Exemplary` requires:

- no P0 or P1 findings;
- no educationally meaningful P2 findings;
- complete applicable screenshot and interaction evidence;
- central truth verified;
- unique learning gain from manipulation;
- appropriate cognitive load for the learner;
- coherent, elegant, LearnUnlock-specific craft;
- accessible and reduced-motion operation;
- clean console, resources, parsing, and fallback behavior;
- no high-value regression.

Screenshot-only review can prioritize visual findings but cannot accept. Interaction-only
review can verify behavior but cannot excuse weak composition. Unknown coverage prevents
acceptance when it affects central truth, the primary learning path, an offered interaction
type, a required viewport, core accessibility, or runtime correctness. A low-risk
peripheral unknown may coexist with `Exemplary` when it is reported explicitly and lowers
review confidence.

Always distinguish:

- a verified failure, which becomes a prioritized finding and must trigger a prominent
  notice to the user;
- an untested path, which is marked `Unknown`, triggers a coverage notice, and lowers
  confidence;
- an intentionally unsupported interaction, which is a finding only when learners would
  reasonably expect it or accessibility requires it.

Do not replace the evaluation with a bare failure state. Produce the full natural-language
review even when interaction fails. The future numeric model must also continue to emit a
score while reflecting verified failures and coverage confidence.
