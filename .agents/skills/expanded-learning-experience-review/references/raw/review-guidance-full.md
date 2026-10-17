# Full expanded-learning-experience-review guidance — discussion draft

This is source material for discussion. It is deliberately exhaustive and is not yet
an executable skill. Later extraction should preserve the distinctions between universal
rules, artifact-family branches, evidence requirements, and examples.

## Purpose

Review a LearnUnlock artifact as a teaching instrument inside a Tutor session. Judge the
combined lesson formed by:

- the adjacent Tutor message;
- the artifact reference and whiteboard;
- the visual mechanism;
- every interaction state;
- responsive and accessible operation;
- factual, spatial, temporal, or mathematical truth.

The review should find the same high-impact problems a demanding teacher, visual
designer, and interaction designer would notice. It should investigate exhaustively,
prioritize ruthlessly, and give specific corrections grounded in visible evidence.

## Quality bar

“Works” is below the bar. “Clean” is below the bar. “Follows best practices” is below
the bar. An exemplary artifact:

- gives a learner an intuition that prose alone would communicate less effectively;
- chooses the medium that best exposes the subject;
- remains accurate under every supported state and interaction;
- feels like one deliberately composed visual rather than assembled UI parts;
- is concise because the visual carries the lesson, not because the lesson was removed;
- uses progressive disclosure to add depth without losing context;
- is visually memorable and polished enough to establish the standard for generated
  artifacts;
- works accessibly at every required landscape size.

Apply the external evaluation standard harshly: a criterion passes only when the result
is exceptional, not merely acceptable.

## Authority

Resolve conflicts in this order:

1. Current user feedback and the current learning objective.
2. Current artifact specification and accepted design decisions.
3. LearnUnlock product, design, tokens, and whiteboard behavior.
4. Observed behavior in the real Tutor session.
5. Learned feedback patterns and earlier artifact critiques.
6. External visualization and visual-tutor guidance.

External references contribute mechanisms, failure checks, and measurable constraints.
They do not replace LearnUnlock typography, color, interaction, or composition decisions.

## Evidence model

Screenshot review and interaction review are one combined assessment. Neither substitutes
for the other.

### Screenshot evidence answers

- What attracts attention first?
- Is the central composition truthful?
- Is the visual mechanism legible without excess explanation?
- Are labels close to their referents?
- Is space used according to teaching value?
- Are text, icons, materials, dimensions, and controls visually polished?
- Do overlaps, clipping, dead space, false alignment, or hierarchy problems exist in this
  exact state and viewport?
- Did responsive layout preserve the lesson or merely shrink it?

Capture screenshots of the initial state, every materially different selection or mode,
every control endpoint, at least one meaningful intermediate state, every responsive
target, and every defect whose visual consequence matters.

### Interaction evidence answers

- Is the first action discoverable?
- Does the action produce immediate educational feedback?
- Does every control change the intended state and only that state?
- Do labels, annotations, and geometry remain attached throughout motion?
- Do minimum, maximum, intermediate, reset, empty, and failure states work?
- Do pointer, touch, wheel or trackpad, pinch, and keyboard paths agree?
- Are camera, value, scroll, and animation bounds stable?
- Does the layout bounce, clip, collide, or lose a referent while moving?
- Does reduced motion preserve the explanation?
- Are focus, selection, pressed state, and accessible announcements correct?

Record what was actually exercised. Source-code inspection or a neighboring screenshot
does not prove a state works.

### Truth evidence answers

- Are the variables carrying the lesson accurate?
- Does the visual imply a stronger claim than the evidence supports?
- Are uncertainty, reconstruction, gaps, overlaps, and contested interpretations visible
  in the state where they matter?
- Does a tidy composition falsify real scale, duration, position, geometry, or causality?

Verify central claims against authoritative sources or explicit invariants. Give spatial,
temporal, mathematical, and scientific truth priority over visual neatness.

## Exhaustive investigation with prioritized reporting

Investigate every applicable criterion and state. Report findings in priority order.
Keep minor observations after the complete set of high-impact findings, never instead of
them.

### Severity

- `P0`: the central lesson is false; a factual or mathematical claim is wrong; the
  primary path is broken; or the artifact creates a safety/security problem.
- `P1`: a major obstacle blocks understanding, direct interaction, spatial truth,
  accessibility, or a required viewport/input mode.
- `P2`: a visible hierarchy, fidelity, cognitive-load, concision, or craft defect prevents
  exemplary status.
- `P3`: a refinement has negligible effect on learning or operation.

### Ordering

Within a severity, rank findings by:

1. damage to the learning objective;
2. prominence and frequency;
3. number of affected states or learners;
4. likelihood of misleading rather than merely inconveniencing;
5. regression risk.

### Specific feedback format

Each finding should say:

1. what is wrong, in concrete visual language;
2. where it occurs: artifact, state, viewport, and input;
3. what visible or measured evidence proves it;
4. what learning or operating consequence follows;
5. which accepted decision or criterion it violates;
6. what specific visual outcome should replace it;
7. what successful decision must remain intact.

Prefer:

> In the comparison view, the three pyramids sit on one straight baseline, which reads as
> a real site arrangement. Place them at an approximately truthful site position and
> common scale; retain the direct labels and overview-to-focus interaction.

Avoid:

> Improve spatial accuracy and hierarchy.

Corrections should be as specific as the user's feedback. They may name placement,
orientation, hierarchy, interaction, copy, or visual form. They should stop before
prescribing implementation code unless the defect depends on a technical constraint.

## Universal review lenses

### 1. Learning contract

Express the artifact in one sentence:

> By manipulating **X**, the learner sees **Y relationship** and can infer **Z**.

Check that `X` is an actual interaction, `Y` is visually perceivable, and `Z` is the
intended learning gain. If the sentence cannot be completed, the artifact is decorative,
textual, or underspecified.

### 2. Medium choice

Decide whether the chosen form is the strongest teaching medium:

- 3D for spatial form, viewpoint, site relationship, surface, and scale;
- timeline for duration, order, gaps, overlaps, and transitions;
- interactive geometry for invariants, transformations, and parameter relationships;
- chart for quantitative comparison or trend;
- map for real geography;
- simulation for a system whose behavior changes through a control;
- illustrative diagram for a physical or abstract mechanism;
- structural diagram for documented relationships;
- flowchart for an actual sequence or decision;
- image for visual detail that does not benefit from interaction;
- prose when a visualization would not improve understanding.

The artifact should draw or simulate the mechanism, not display a generic diagram about
the topic.

### 3. Five-second comprehension

Inspect the initial state briefly before operating it:

- Can the learner identify the subject?
- Is the first useful action apparent?
- Does the primary relationship read without an instruction panel?
- Does the adjacent Tutor message supply only the context the visual cannot show?

Treat immediate ambiguity in the central mechanism as high priority.

### 4. Largest-element audit

Review the largest, most central, and highest-contrast elements before small details.

- Does occupied area match teaching value?
- Is the dominant geometry or data truthful?
- Is the element teaching, orienting, or merely filling space?
- Does surrounding chrome steal room from the mechanism?
- Is large empty space purposeful or evidence of timid composition?

This catches attractive screenshots whose central premise is false or weak.

### 5. Learning gain from interaction

For every primary action, complete:

> Before the action the learner can see __. After it, the learner can newly see __.

Changing only text, color decoration, or card content is weak interaction. Strong
interaction exposes a comparison, invariant, causal response, hidden structure, scale,
or transformation and provides instant feedback.

### 6. Cognitive load

- Present one or two concepts at a time.
- Ask at most one learner question at a time.
- Keep the first state focused on the core comparison or mechanism.
- Reveal deeper information through meaningful selection or manipulation.
- Preserve enough context for the new detail to make sense.
- Use simple language and correct subject terminology.
- Remove interface explanations made obvious by the visual.
- Preserve educational detail when removing chrome or prose.

Simplicity is successful when it removes translation work. It is a regression when it
removes information, atmosphere, or the intuition itself.

### 7. Proximity and direct manipulation

- Select the object itself when possible.
- Place a label immediately beside the object it identifies.
- Put a dimension on the dimension it measures.
- Put a control on or beside the object/state it changes.
- Keep selected identity connected to its original mark.
- Ensure every floating label has a recognizable visible referent.
- Give small truthful marks larger invisible hit targets rather than falsifying their
  visible size.

Detached selectors and fact panels force learners to translate between interface and
subject. Treat that translation as cognitive load.

### 8. Progressive disclosure

Progressive disclosure should add specificity:

- overview establishes the primary relationship;
- selection focuses one entity or state;
- focus reveals only the details relevant to that selection;
- a quiet return restores comparison;
- the interaction preserves or clearly restores necessary context;
- selection does not cause layout bounce.

Do not confuse hidden content with progressive disclosure. Each reveal must advance the
learning contract.

### 9. Chat–artifact division

The artifact should contain what must remain visible beside the mechanism:

- object identity;
- direct labels and dimensions;
- visual state;
- concise annotations with physical referents;
- controls and immediate feedback.

Tutor chat should contain:

- operating guidance;
- broader explanation;
- historical or scientific caveats without a direct visual referent;
- reflective questions;
- instructions spanning several steps.

Remove repeated titles, dates, equations, captions, and instructions unless repetition
creates a new relationship. Put each substantial artifact in its own Tutor message when
it needs specific guidance.

### 10. Composition and LearnUnlock fit

- Treat the whiteboard as the containing surface.
- Let the artifact use the available pane rather than adding an outer card.
- Use spacing, alignment, restrained elevation, and surface contrast for hierarchy.
- Keep Path Teal rare and meaningful: focus, confirmation, or selected state.
- Use cool paper and ink neutrals and Lexend for ordinary interface text.
- Use outlines when they encode geometry, chronology, or another subject relationship.
- Keep the close control quiet, discoverable, and overlaid so it does not reserve an
  empty header band.
- Keep titles in artifact references and accessible names rather than repeating a visible
  heading over the whiteboard.
- Avoid card-inside-card composition, decorative dividers, generic panels, ornamental
  gradients, glass, dot grids, and unrelated motion.

### 11. Coherence and anti-slop

Ask whether a human designer made specific decisions for this lesson:

- Does the whole artifact share one visual idea?
- Does color encode subject meaning?
- Does every control belong to the mechanism?
- Are icons and materials specific to the content?
- Is the composition recognizably designed for this subject and half-pane?
- Does it avoid library-default appearance and generic AI visualization patterns?
- Does it interpret the idea rather than use a cliché as shorthand?

Polish alone does not pass. The artifact should be visually distinctive because its
subject matter shaped the design.

### 12. Typography and notation

- Keep body and control text legible at the real half-pane size.
- Use sentence case and a compact hierarchy.
- Render mathematical variables and numerical mathematical content with KaTeX.
- Use high-contrast ink for mathematical conclusions unless color encodes a relationship.
- Keep labels horizontal when rotation harms reading; use leaders when necessary.
- Check text width and wrapping inside every container.
- Prevent raw Markdown, raw KaTeX, tool syntax, code, or parsing artifacts from appearing.

### 13. Color

- Use color to encode category, era, state, magnitude, material, or physical property.
- Keep the number of visual roles small enough to learn.
- Use a legend when meaning is not evident.
- Preserve contrast in default, hover, focus, selected, disabled, and moving states.
- Add shape, text, weight, or position cues so color is not the only carrier.
- Avoid arbitrary rainbow sequence and decorative saturation.

### 14. Icons and recognizable referents

- Choose icons with a specific connection to the subject.
- Use one icon family and consistent size and stroke.
- Center by rendered bounds rather than assumed path coordinates.
- Repeat an identity icon where selection moves attention away from its source.
- Hide decorative duplicate icons from assistive technology.
- Make human figures, trees, tools, materials, or other familiar scale objects visually
  recognizable without relying on a label.

### 15. Motion

- Use motion to show continuity, transformation, rearrangement, focus, or state change.
- Keep motion short and state-driven.
- Avoid bounce and decorative choreography.
- Check start, meaningful intermediate frames, and end.
- Keep labels and referents attached throughout motion.
- Provide a reduced-motion state that retains the explanation, usually instant change or
  crossfade.

### 16. Accessibility

- Meet WCAG AA contrast.
- Use semantic controls with visible focus.
- Support chronological or spatially sensible focus order.
- Provide keyboard equivalents for every primary action.
- Expose selected, pressed, expanded, and current state correctly.
- Give the canvas or visual region a useful accessible name and current-state summary.
- Avoid hover-only content.
- Preserve meaning without color and without motion.
- Keep target sizes usable while preserving truthful visible marks.
- Avoid duplicated screen-reader announcements from decorative icons or repeated labels.

### 17. Runtime and resilience

- Check console, CSP, library, font, image, WebGL, Canvas, KaTeX, and resource failures.
- Confirm the sandbox loads only approved, pinned libraries.
- Confirm fallback output is concise and recoverable.
- Check parsing during and after streaming where relevant.
- Dispose or replace dynamic resources correctly when controls rebuild geometry.
- Keep animation and interaction responsive under repeated use.
- Test reload and artifact switching according to the workspace contract.
- Verify the artifact cannot affect parent navigation, origin data, forms, downloads, or
  unapproved network resources.

## Combined coverage matrix

Create a matrix for every review. Combine axes where risk concentrates.

| Axis | Minimum evidence |
| --- | --- |
| Viewport | 1920×1080 composition, representative laptop landscape, tablet landscape, short landscape |
| Screenshot state | initial, every selection family, every mode, return/reset |
| Values | minimum, maximum, one or more intermediate values |
| Animation | start, meaningful intermediate, end, reduced motion |
| Pointer | click/tap, drag where supported, empty-space behavior |
| Spatial zoom | wheel/trackpad, two-pointer pinch, bounded extremes |
| Keyboard | focus order, Enter/Space, documented arrows, Escape/reset |
| Truth | primary factual source or mathematical invariant |
| Failure | console/resources and at least the meaningful library/render fallback |

Examples of concentrated risk:

- 3D: viewport × focus state × orbit angle × zoom × projected overlays.
- Timeline: duration extremes × label collision × dynasty/transition selection.
- Mathematics: all parameter pairs × animation progress × label attachment.
- Chart: data extremes × label density × hover/focus × responsive axes.
- SVG diagram: longest labels × smallest viewport × connector routing.

List every untested cell as a coverage gap. A screenshot-only review can produce findings
and priorities, but final acceptance requires the interaction evidence too.

## Artifact-family guidance

### 3D, spatial, and scale models

The model should exploit 3D rather than behave as a flat illustration.

Review:

- real or explicitly labeled comparison arrangement;
- common scale and truthful orientation;
- terrain or elevation when it changes perception;
- overview without dimensions that only make sense for a focused object;
- direct selection by mesh and anchored label;
- focus that centers the chosen object and adds relevant detail;
- projected labels derived from world coordinates;
- dimensions derived from modeled dimensions, not flat bounding boxes;
- labels and measurement lines at several orbit angles and aspect ratios;
- camera bounds for drag, wheel, pinch, and keyboard;
- stable transition from two-pointer pinch to one-pointer orbit;
- visible, unlabeled familiar scale reference when numeric dimensions already exist;
- material fidelity sufficient to teach construction;
- lighting and shadows that reveal form without obscuring detail;
- state-specific annotations for present, reconstructed, cutaway, or hypothetical states;
- explicit uncertainty for reconstruction;
- no label surviving when its object disappears;
- close control overlaid without consuming scene height.

Specific learned examples:

- A straight row of Giza pyramids is attractive but spatially misleading.
- Overview measurement axes add diagram chrome without meaning; focused axes can be useful.
- A tiny labeled capsule does not teach human scale. The visible figure or tree must read
  immediately, and a tree used only as reference does not need a label.
- Uniform horizontal course lines do not communicate block masonry. Surface, joints,
  weathering, course variation, casing, and granite need enough fidelity to be legible.
- A reconstructed casing state needs different explanatory copy from the present state.
- A speculative pyramidion must look intentional and be identified as hypothetical.

### Timelines and historical sequences

The timeline should make time visible before detail is read.

Review:

- orientation appropriate to the half-pane;
- continuous time scale;
- proportional duration;
- honest gaps, overlaps, contested handoffs, and approximate dates;
- invisible minimum hit targets for visually short periods;
- era or family grouping with meaningful color and headers;
- transitions represented as transitions, subordinate to primary periods;
- actual historical transition language rather than generic labels such as “Bridge”;
- labels beside their spans and collision handling that does not falsify dates;
- stable detail region across selections;
- one concise insight instead of repeated chronology;
- original-language label where meaningful;
- a symbolic, centered icon repeated in the selected identity;
- chronological keyboard order and accessible hierarchy;
- natural page scrolling instead of a nested scroller.

Specific learned examples:

- Equal-height dynasty rows erase the difference between fifteen years and eight
  centuries.
- Empty gaps make history appear to stop. Important transitions explain division,
  conquest, contested rule, and reunification.
- Ten unrelated colors decorate; five historical color families teach.
- A crude custom wine glyph undermines identity. A polished, semantically relevant icon
  must be optically centered.
- Dates belong on the chronology; repeating them in the detail dock wastes attention.

### Mathematical demonstrations and manipulatives

The visual should preserve and expose the mathematical invariant.

Review:

- correctness of every geometric construction;
- labels attached to the specific side, angle, region, vector, or quantity;
- variables and mathematical values rendered with KaTeX;
- exact forms when rounding would create a false equality;
- simultaneous updates of geometry, values, notation, and equation;
- all parameter extremes and intermediate combinations;
- viewBox and safe margins at every animation frame;
- proof pieces that remain visibly identifiable and congruent;
- size changes that communicate magnitude without breaking bounds;
- residual areas labeled in the states where they matter;
- conclusion in high-contrast ink;
- controls separated by spacing instead of decorative dividers;
- redundant prose removed only when the visual genuinely makes it self-evident;
- reduced-motion operation that still exposes both proof states.

Specific learned examples:

- A rearrangement animation without side labels is visually pleasing but loses its proof.
- Labels `a = …`, `b = …`, and `c = …` should follow one representative triangle.
- A fixed-size outer square hides the effect of increasing both legs.
- A large proof square should use the half-pane while keeping every label and control in
  bounds.
- The sentence “The same four triangles leave the same unused area” is redundant only if
  the four triangles and conserved area are visually unmistakable.

### SVG and illustrative diagrams

Review:

- whether the diagram shows the mechanism or only boxes naming it;
- viewBox bounds, safe area, and content height;
- longest-label width plus padding;
- explicit wrapping rather than overflow;
- connector paths that avoid every unrelated box and label;
- line endpoints that stop at component edges;
- one coherent direction for flows;
- complexity limits that lead to multiple focused diagrams rather than cramming;
- physical subjects represented with recognizable simplified shapes;
- color aligned with category or physical property;
- labels placed consistently with clear leaders;
- no raw black-filled connector caused by missing `fill="none"`;
- no nested or theme-class structure that makes shapes render incorrectly.

### Charts, maps, and data views

Review:

- whether the data form answers the learner's question;
- correct scale, baseline, units, aggregation, ordering, and uncertainty;
- labels that remain legible at category and value extremes;
- rounded display values without changing underlying truth;
- explicit canvas container size and responsive behavior;
- legends that directly map visual encoding;
- real geography from authoritative topology rather than invented coordinates;
- accessible equivalents for hover-only values;
- enough padding for scatter, bubble, and dense labels;
- absence of misleading color scale, area, or perspective effects.

### Simulations and interactive explainers

Review:

- a control that corresponds to a real system variable;
- immediate causal feedback;
- clear initial conditions and reset behavior;
- stable numerical or physical bounds;
- all dependent visuals updating together;
- the learner able to compare before and after;
- intermediate states producing insight rather than decorative animation;
- controls close to the changed phenomenon;
- concise Tutor guidance for anything the simulation cannot make obvious.

## Regression review

Compare against the strongest previous iteration, not only the immediate predecessor.

Identify:

- clutter successfully removed;
- learning detail accidentally removed;
- visual richness flattened into generic simplicity;
- a bug fixed in one state but moved to another viewport or input;
- a new interaction that broke accessibility or directness;
- a more truthful visual that became less legible;
- a polished surface that hides weaker educational value.

Every proposed correction should name what must be preserved. This prevents a cycle where
one review adds detail and the next removes the insight while reducing clutter.

## Final obviousness challenge

Assume one embarrassing defect remains. Reinspect:

1. the biggest object;
2. the first control;
3. the central factual or mathematical claim;
4. the most extreme value;
5. the shortest landscape viewport;
6. the least familiar supported input;
7. every floating label and its referent;
8. every reconstructed, transitional, or uncertain state;
9. the most visually polished element and whether it actually teaches;
10. the strongest earlier iteration for lost value.

Evidence, not confidence, closes each item.

## Acceptance

An artifact is exemplary only when:

- no P0 or P1 finding remains;
- no educationally meaningful P2 finding remains;
- screenshot and interaction evidence cover the applicable matrix;
- central truth has been verified;
- the artifact produces unique learning gain;
- the design is coherent, visually polished, and LearnUnlock-specific;
- accessibility and reduced-motion behavior work;
- no console, parsing, CSP, library, or rendering failure remains;
- regression comparison identifies no lost high-value decision.

A screenshot-only assessment can prioritize visual findings but cannot grant final
acceptance. An interaction-only assessment can prove behavior but cannot excuse weak
composition. Final review combines both.

## Sources retained in full

- `external/blackboard-visual-ai-tutor-evaluation-metrics-full.txt`
- `external/imagine-visual-creation-suite-full.txt`
- `external/visualizer-architecture-and-guidelines-full.txt`
- `feedback/` (stored critiques, annotated images, and iteration screenshots)

The context map points to LearnUnlock product, design, implementation specifications,
historical critiques, annotated screenshots, and iteration evidence. Extraction into an
executable skill should happen only after this guidance is discussed and revised.
