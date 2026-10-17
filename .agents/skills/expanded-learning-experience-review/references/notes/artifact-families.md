# Artifact families

## Contents

1. [Selection rule](#selection-rule)
2. [Three-dimensional and spatial models](#three-dimensional-and-spatial-models)
3. [Timelines and historical systems](#timelines-and-historical-systems)
4. [Mathematical transformations and proofs](#mathematical-transformations-and-proofs)
5. [Simulations and causal explainers](#simulations-and-causal-explainers)
6. [Sequences and procedures](#sequences-and-procedures)
7. [SVG and illustrative diagrams](#svg-and-illustrative-diagrams)
8. [Charts and quantitative views](#charts-and-quantitative-views)
9. [Maps and geographic models](#maps-and-geographic-models)

## Selection rule

Choose the branch by the relationship the learner must understand. Combine branches only
when the learning objective genuinely combines them. A topic name does not determine the
visualization form.

## Three-dimensional and spatial models

Use 3D when viewpoint, form, spatial relationship, terrain, surface, or human scale
contributes to the lesson.

Review:

- truthful or explicitly labeled placement and orientation;
- common scale where comparison matters;
- terrain or elevation that changes perceived height or relation;
- direct selection of visible objects and anchored labels;
- a simple overview when orientation is useful;
- focused detail that centers the selected object without unnecessary chrome;
- projected labels and dimensions derived from world geometry;
- overlay collision at multiple orbits, zoom levels, and pane shapes;
- drag, wheel/trackpad, two-pointer pinch, and keyboard paths;
- bounded camera extremes and stable transitions between input modes;
- visible, recognizable familiar scale references without redundant labels;
- material and lighting fidelity sufficient for the intended construction or surface
  insight;
- explicit present, reconstructed, hypothetical, or simplified state;
- state-specific annotation and qualification;
- natural horizontal orientation when the spatial system is horizontal;
- contextual details using bottom or side space without covering the model.

Do not flatten a spatial model into a diagram to solve overlay bugs. Do not arrange real
objects into a tidy lineup unless the view is explicitly a comparison rather than a site
model.

## Timelines and historical systems

Use timelines to teach duration, sequence, gap, overlap, transition, and historical
grouping.

Review:

- vertical orientation for the portrait half-pane unless the subject strongly demands
  another form;
- continuous time scale and proportional duration when duration is part of the lesson;
- approximate dates represented honestly;
- important gaps, overlaps, contested handoffs, and transition periods;
- transitions visually subordinate to primary periods but still selectable when useful;
- meaningful era or family grouping and restrained semantic color;
- minimum invisible hit targets for short truthful spans;
- label collision handling without falsifying time position;
- selected detail connected to its timeline identity;
- stable details without layout bounce;
- concise insight rather than repeated dates or chronology;
- original-language identity when educationally valuable;
- specific, recognizable, truthful symbols;
- chronological keyboard order and accessible hierarchy;
- natural vertical document scrolling rather than nested scrolling.

An overview-to-focus structure is often effective for history, but it remains a strategy,
not a mandatory template.

## Mathematical transformations and proofs

Use interactive geometry when manipulation reveals an invariant, constraint, magnitude,
equivalence, transformation, or relationship between representations.

Review:

- mathematical correctness across every value and animation frame;
- exact geometry and preserved invariants;
- labels attached to the sides, angles, regions, points, or vectors they describe;
- KaTeX for mathematical variables and values;
- exact symbolic forms when rounded equality would mislead;
- synchronized geometry, values, notation, and conclusion;
- all parameter combinations and meaningful intermediate states;
- size or magnitude changes that remain inside safe bounds;
- visually identifiable pieces across rearrangement;
- progress control when intermediate transformation states teach;
- high-contrast mathematical conclusions;
- reduced-motion comparison that preserves the proof idea;
- chat supplying full rigor after the artifact builds intuition.

These artifacts may begin directly with the focused transformation. Adding an overview
is unnecessary when it contributes no orientation.

## Simulations and causal explainers

Use simulations when changing a real conceptual variable exposes causal response or
system behavior.

Review:

- control variables correspond to the actual model;
- immediate conceptual feedback;
- explicit initial conditions and reset;
- valid physical, mathematical, or domain bounds;
- all dependent outputs updating together;
- before/after comparison possible;
- intermediate behavior meaningful rather than decorative;
- controls close to the changed phenomenon;
- broad exploratory modes simplified enough to avoid overload;
- focused modes able to reveal mechanism detail;
- no false causal implication created by convenient controls;
- repeatable and stable operation.

## Sequences and procedures

Use a sequence visualization when order, dependency, or state transition is part of the
lesson.

Examples include communication handshakes, algorithms whose result determines the next
operation, biological phases, calculation procedures, laboratory workflows, and causal
response chains.

Prefer:

1. a full sequence view that gives the gist;
2. current-step highlighting while the whole remains visible;
3. focused explanation or animation of one transition;
4. learner control when inspecting intermediate state helps;
5. chat for detailed rationale and one-at-a-time questions.

Avoid an isolated next-button stepper that hides system context. Use a stepper only when
it manages real complexity and preserves orientation.

## SVG and illustrative diagrams

Use diagrams for mechanisms, structures, flows, and spatial metaphors that do not require
a heavier simulation.

Review:

- mechanism shown rather than boxes merely naming the mechanism;
- form matched to intent: illustrative, structural, or flow;
- safe viewBox and tightly fitted height;
- longest-label width, wrapping, and padding;
- connector paths avoiding unrelated shapes and every text label;
- lines stopping at component edges;
- subject-led geometry for illustrative diagrams;
- one coherent flow direction when order matters;
- complexity split into focused views rather than crammed;
- color tied to category or physical property;
- consistent external labels and leaders where appropriate;
- no malformed raw SVG, accidental fills, theme breakage, or clipping;
- meaningful manipulation for code artifacts, such as selecting, changing, or revealing a
  relationship.

A static observational diagram without useful manipulation may belong to the future image
tool or a non-code visual path instead of this review scale.

## Charts and quantitative views

Use charts when position, length, area, distribution, or change communicates data more
effectively than prose.

Review:

- chart type matched to the question;
- truthful scale, baseline, unit, aggregation, ordering, and uncertainty;
- source population, time period, and dataset provenance;
- no single survey presented as universally representative;
- readable labels at data and viewport extremes;
- accessible values beyond hover;
- meaningful manipulation such as filtering, comparison, or parameter exploration;
- controls limited to variables that change interpretation;
- responsive canvas/container sizing;
- legend directly mapping visual encoding;
- rounded display values without altering underlying truth;
- no perspective, color, or area effects that mislead.

Keep full citation in chat. Show a concise source label in the artifact when provenance is
necessary to interpret the chart.

## Maps and geographic models

Use maps when actual geography carries the lesson.

Review:

- authoritative topology or coordinates;
- appropriate projection and disclosed distortion where relevant;
- geographic scale and orientation;
- meaningful zoom, pan, selection, or layer manipulation;
- labels and selected details that remain connected to regions;
- color scale, legend, missing data, and uncertainty;
- touch, keyboard, and accessible region identification;
- no invented coordinates or decorative map shapes;
- detail placement that uses available bottom or side space without obscuring geography.
