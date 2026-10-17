# Seeded artifact design feedback — consolidated July 25, 2026

This document consolidates the July 25 review conversation after the first broad
seeded-artifact redesign. It preserves both direct artifact corrections and the
general review principles revealed by them. Screenshots are evidence of the defect or
strength described; they are not layouts to copy.

## Global visual and teaching direction

- Maximal simplicity means the simplest accurate knowledge model, not the simplest
  implementation. Technical complexity is justified when it makes the lesson easier.
- The visualization needs an overarching explanatory framework. An attractive set of
  nodes, circles, or paths is not enough when it does not reveal a temporal, causal,
  spatial, mathematical, or comparative relationship.
- Prefer white artifact backgrounds for calmness and visual continuity. Use a dark
  background only when the subject makes it meaningfully clearer, such as outer space.
- Do not repeat the artifact title inside the artifact. The reference in chat already
  names it.
- Put operational instructions and longer explanations in chat. The artifact should
  communicate its main relationship without instruction banners, obvious captions, or
  bottom caveats.
- Use Lexend for diagram text and KaTeX for mathematical variables, values, units, and
  equations.
- Do not bold everything or rely on all caps. Reserve emphasis for selection, one key
  contrast, or a genuinely structural label.
- Use LearnUnlock green for selection and focus. The treatment must hug the selected
  object without intersecting its label. Never leak the browser's rectangular blue SVG
  focus outline into the diagram.
- Use Lucide icons or a coherent Lucide-like fallback. Icons should identify meaningful
  objects, not decorate empty space.
- Avoid nested cards, generic dashboard arrangements, decorative gradients, excessive
  dividers, giant arrowheads, and lines that pass through labels.
- A reset control belongs only when the initial state is pedagogically important or a
  simulation can become meaningfully disoriented.
- Every control must reveal learner information. Remove controls that only restate,
  reverse, or cosmetically vary the same relationship.
- Preserve identity and continuity in animations. A moving particle should travel
  through a channel; it must not disappear and be replaced by a newly created particle.
- Auto-framing should remain stable. Keep the important objects large and visible while
  avoiding continual zoom pulses.
- Test the pixels at laptop, tablet landscape, and short landscape sizes. Valid DOM
  bounds do not prove that labels, curves, arrowheads, and depth relationships are clear.
- Omissions and implicit scale errors are accuracy failures. A misleading Sun diameter,
  disappearing circle intersection, mismatched Riemann surface, or transiently incorrect
  equilibrium point is not a cosmetic defect.

## Shared timeline framework

- Timelines should normally be vertical in the portrait-shaped whiteboard half-pane.
- Use a white background, an honest time axis when duration matters, and concise clickable
  event boxes with representative colors and specific Lucide icons.
- Keep connectors and the time axis behind every event, icon, and label.
- Never let events overlap. Move a later collision into a second lane while preserving
  chronology.
- Mark transition periods explicitly but subordinate them to principal periods or events.
- Selected details must not resize the timeline or create vertical bounce.
- Chinese dynasty timelines should retain time-proportional durations, dynasty colors,
  era-family headers, Chinese characters, and concise transition periods.

Evidence:

- [American timeline before](assets/july-25-expanded-artifacts/american-timeline-before.png)
- [Chinese timeline reference](assets/july-25-expanded-artifacts/chinese-timeline-reference.png)

## Artifact-specific feedback

### Solar system scale

- Selection must use an object-level green ring with label clearance.
- Two honest modes are useful: logarithmically compressed orbital distance with enlarged
  planets, and evenly spaced objects with diameter preserved.
- Never imply that the Sun is comparable in diameter to Jupiter. If a same-scale Sun does
  not fit, crop it honestly or use another explicit scale mechanism.
- Dark space is a justified exception to the white-background default. Remove explanatory
  title and instruction text from the visual; chat can explain the two modes.

- [Selection defect](assets/july-25-expanded-artifacts/solar-selection-before.png)
- [Misleading Sun scale](assets/july-25-expanded-artifacts/solar-sun-scale-misleading.png)

### Membrane diffusion

- Keep both regions white and distinguish sides without a blue background wash.
- Remove the title, scale caveat, explanatory conclusion, swap-sides control, and reset.
- Animate the existing particles continuously through the membrane channel. Closing the
  channel must prevent crossing without corrupting their positions.

- [Instruction header](assets/july-25-expanded-artifacts/membrane-instruction-before.png)
- [Excess controls and explanation](assets/july-25-expanded-artifacts/membrane-controls-before.png)

### Wave superposition

- Preserve the simple three-wave composition and phase sweep; it communicates clearly.
- Add Lucide play/pause icons without adding explanation or controls.

- [Positive reference](assets/july-25-expanded-artifacts/wave-superposition-positive.png)

### Pythagorean rearrangement proof

- Preserve the responsive square and rearrangement animation.
- Keep the hypotenuse label parallel to its exact edge throughout the animation and for
  every legal pair of leg values.
- Keep mathematical labels in KaTeX and avoid titles, dividers, and redundant prose.

- [Positive reference](assets/july-25-expanded-artifacts/pythagorean-positive.png)

### Power of a point

- Use a white background and keep every relevant intersection visible.
- The external point, two secants, circle, labels, and power product must remain finite,
  correctly ordered, and inside the stage at all legal positions.

- [Broken state](assets/july-25-expanded-artifacts/power-of-point-broken-state.png)

### 2008 financial crisis

- Replace unrelated endpoint arrows with a real data visualization, led by a home-price
  time series through the boom and decline.
- Connect the housing reversal to mortgage distress, frozen credit, and the market trough
  without implying that one chart proves the whole causal story.
- Keep axes, dates, units, recession interval, and provenance accurate; progressively
  disclose secondary indicators.

- [Previous weak framework](assets/july-25-expanded-artifacts/crash-2008-before.png)

### Double-integral Riemann sum

- Preserve the elegant accumulation model, remove reset, and show the function surface in
  a lighter shade behind the approximation.
- Use true manipulable 3D. The surface partition, box footprints, midpoint sample points,
  box heights, and displayed sum must be generated from one coordinate convention.
- The surface must remain visible without painting through occluding columns.

- [Positive starting point](assets/july-25-expanded-artifacts/double-integral-positive.png)

### Double pendulum

- Preserve the paired trajectories and starting-difference experiment.
- Reset is justified because the initial comparison matters. Remove the obvious sentence
  stating that the paths diverge.

- [Positive reference](assets/july-25-expanded-artifacts/double-pendulum-positive.png)

### Green's theorem

- Teach Green's theorem alone rather than presenting Green, Stokes, and generalized Stokes
  at once.
- On a white background, animate local rotation throughout the interior and circulation
  around the boundary so the equality is visible rather than merely stated.

- [Previous theorem-family view](assets/july-25-expanded-artifacts/greens-theorem-before.png)

### Three-body problem

- Preserve the live trajectories, but keep all three bodies and useful trail history large
  enough to inspect.
- Remove the title, perturbation slider, and obvious explanatory sentence.
- Reset is justified. Stabilize framing: choose a useful persistent scale rather than
  continually zooming in and out or shrinking the bodies into a tiny central cluster.

- [Previous framing](assets/july-25-expanded-artifacts/three-body-before.png)
- [Excess control](assets/july-25-expanded-artifacts/three-body-controls-before.png)
- [Excess title](assets/july-25-expanded-artifacts/three-body-title-before.png)

### Philosophy map

- Preserve the useful question-family grouping, but make the group boundaries fully
  encompass their traditions.
- Put larger, color-coded family labels outside the circles with white clearance so no
  boundary or connector intersects the text.
- Use regular text weight by default, sentence case, restrained selection, and concise
  selected details modeled after the Chinese-history timeline.

- [Excess caveat](assets/july-25-expanded-artifacts/philosophy-excess-note.png)
- [Map before](assets/july-25-expanded-artifacts/philosophy-map-before.png)
- [Detail before](assets/july-25-expanded-artifacts/philosophy-detail-before.png)

### Roman slavery

- Replace an ornamental node path with a temporal life-course framework beginning with
  birth into slavery or capture, then sale or transfer, work, community, resistance, and
  contingent outcomes.
- Do not imply one typical biography or inevitable manumission. Use branches to express
  contingency and keep legal status visible across the path.

- [Previous framework](assets/july-25-expanded-artifacts/roman-slavery-before.png)

### American slavery

- Replace concentric target-like rings with a historical timeline.
- Show how hereditary racial status, law, forced migration, family and resistance,
  federal enforcement, emancipation, and post-emancipation consequences change over time.
- Do not imply one representative person lives across the whole period.

- [Previous target metaphor](assets/july-25-expanded-artifacts/american-slavery-before.png)

### VSEPR

- Preserve the molecule selector but replace pseudo-3D projection with a genuine Three.js
  structure that can be rotated directly.
- Render atoms, bonds, and lone-pair domains correctly from every angle on white. Lone
  pairs must remain distinct from atoms and every molecule must stay fitted.

- [Previous projected view](assets/july-25-expanded-artifacts/vsepr-before.png)

### Projectile motion with calculus

- Use a white background, remove reset, and use KaTeX for variables, units, components,
  and equations.
- Zoom toward the current motion rather than always fitting the entire flight.
- Make the trajectory, tangent-velocity vector, component legs, axis arrows, and labels
  large enough to read. Their endpoints must agree exactly without overlaps.

- [Previous view](assets/july-25-expanded-artifacts/projectile-before.png)
- [Overemphasized time](assets/july-25-expanded-artifacts/projectile-bold-unit.png)
- [Broken vector construction](assets/july-25-expanded-artifacts/projectile-vector-overlap.png)

### Odyssey literary analysis

- Replace route-style plot summary with scene-specific opposing analytical questions.
- Use a small set of recognizable side icons and let each selected scene expose a tension
  such as cleverness versus pride or glory versus life.
- Keep evidence and full argumentation in chat rather than adding caveats below the visual.

- [Previous plot-summary framework](assets/july-25-expanded-artifacts/odyssey-before.png)

### Modifier placement

- Replace giant curved arrows with direct proximity, a short connector, or a restrained
  bracket.
- Moving the modifier must change the most natural attachment and therefore the reading;
  every state must stay unambiguous without redundant explanation.

- [Broken arrow treatment](assets/july-25-expanded-artifacts/modifier-placement-before.png)

### Five-paragraph essay

- Replace the wall-of-text or giant-arrow flowchart with a quiet argument structure.
- Show one thesis supported by distinct reasons, each grounded in evidence and analysis,
  then a synthesis that explains significance.
- Use a white background, normal weights, sentence case, precise small connectors, and
  progressive disclosure. Treat it as a beginner scaffold, not a universal law.

- [Previous framework](assets/july-25-expanded-artifacts/five-paragraph-before.png)

### Egyptian pyramids

- Let learners click the labeled pyramids directly in their geographically honest 3D
  overview. Do not use a detached selector, title, or instruction chip.
- Focus should center one pyramid and reveal construction, casing, stone texture, history,
  and dimensions. Only the focused state needs dimension guides.
- Support orbit and two-finger zoom. A believable tree or person can provide unlabeled
  scale, but it must remain visible and must not intersect dimension graphics.

## Shell and session behavior

- Artifact titles must be unique within a session and serve as custom artifact references
  in chat, without repeating inside the whiteboard.
- The active reference toggles the whiteboard closed; other references switch artifacts.
- The last reference in a completed session opens automatically.
- The quiet Lucide close icon is absolutely positioned and consumes no layout height.
- Tutor sessions reopen with the sidebar closed.
- Remove the seeded “The Meaning of Life” session.

## Positive patterns to preserve

- The Pythagorean rearrangement and double-integral accumulation examples demonstrate the
  target: one strong visual relationship, meaningful manipulation, minimal chrome, and
  enough mathematical rigor to support the adjacent chat.
- Successful simplicity is not emptiness. Preserve informative geometry, meaningful
  animation, accurate scale, and progressive detail while removing interface noise.

## Follow-up feedback captured before implementation

This batch adds a process constraint: incoming feedback must be written to the raw review
record and revision plan before tests or artifact code are changed. Feedback capture and
implementation are separate phases; implementation waits for the user's explicit release.

### Protected exemplar: multivariable integration

- The three-dimensional multivariable-calculus/Riemann-sum artifact is exemplary and
  should remain unchanged in this revision cycle.

### Pythagorean rearrangement

- The rotated `c = 5` label should nearly touch the hypotenuse, matching its angle and
  preserving that direct association through every animation frame.
- [Detached hypotenuse label](assets/july-25-expanded-artifacts/pythagorean-hypotenuse-label-followup.png)

### Membrane diffusion

- Remove the **Close channel** button; the state change does not add worthwhile learner
  information.
- Verify the model's scientific semantics before implementation. Do not conflate random
  molecular speed with net transport rate or imply an unsupported concentration-ratio
  law. The animation and adjacent explanation must distinguish random motion from net
  flux down the modeled concentration gradient.
- [Channel control and current particle state](assets/july-25-expanded-artifacts/membrane-close-channel-followup.png)

### Competitive market

- Keep the otherwise successful graph and add restrained arrowheads to the positive ends
  of both axes.
- [Axes awaiting arrowheads](assets/july-25-expanded-artifacts/market-axis-arrowheads-followup.png)

### Seed list

- Remove the Mercator-projection session because its current learning experience offers
  no compelling artifact through which the learner can inspect or verify the explanation.

### Binary search

- Preserve the praised step-through visualization.
- Use one contextual action with a Lucide icon: **Next comparison** while searching, then
  **Reset** only after the target is found.
- [Redundant simultaneous actions](assets/july-25-expanded-artifacts/binary-search-controls-followup.png)

### American history timeline

- Replace the shallow sticky detail strip with the stronger Chinese-timeline hierarchy:
  representative icon, selected event and date in the header, concise explanation below,
  and a quieter second-order insight only when it earns its space.
- [Current American detail strip](assets/july-25-expanded-artifacts/american-timeline-detail-followup.png)
- [Chinese timeline detail reference](assets/july-25-expanded-artifacts/chinese-timeline-detail-reference-followup.png)

### Power of a point

- Center the equation at the top, away from the whiteboard close control.
- Render letter and length labels with KaTeX and keep every label clear of borders, lines,
  controls, and other labels in every state.
- Do not apply a generic selected/focus box after clicking or dragging the exterior point.
- Put each of the four segment lengths directly on its segment. Derive the displayed
  product equality from those visible values so no large result appears without provenance.
- [Current collisions and unexplained product](assets/july-25-expanded-artifacts/power-of-point-labels-followup.png)

### 2008 housing-crash chart

- Increase the chart's small typography so event labels, tick labels, and detail content
  remain comfortably legible in the half-pane.
- Rotate the home-price-index label along the vertical axis; years already make the
  horizontal axis sufficiently clear.
- Rework the selected-event detail panel using the Chinese-timeline hierarchy and space.
- [Current chart hierarchy](assets/july-25-expanded-artifacts/crash-chart-labels-followup.png)
- [Current detail strip](assets/july-25-expanded-artifacts/crash-detail-panel-followup.png)
- [Detached vertical-axis label](assets/july-25-expanded-artifacts/crash-axis-label-followup.png)

### Implementation release

- The user explicitly released this recorded batch for implementation and asked the agent
  to continue through testing, one consolidated review, correction, code review, and full
  verification without stopping early.

### Green's theorem

- Preserve the clear circulation model and add a state-matched Lucide pause/play icon to
  its simulation control.

### Double pendulum

- Preserve the praised chaos comparison and meaningful reset state.
- Use formal **Path A** and **Path B** labels, inherit the surrounding panel background,
  and rebalance the trails for that light surface.
- Add Lucide play/pause and reset icons. Render the starting angle and degree symbol with
  KaTeX.

### Roman and American slavery timelines

- Increase timeline typography to a normal minimum of `12px`; reserve `10px` only for
  genuinely secondary information when necessary.
- Enlarge selected-stage panels and use the Chinese-timeline hierarchy: icon and temporal
  cue in the header, concise explanation, then one useful secondary historical detail.
- American-slavery stages must be positioned by elapsed historical time rather than equal
  decorative spacing.

### Three-body problem

- Preserve the praised stable simulation and add Lucide play/pause and reset icons.

### Philosophy map

- Preserve the white label halos that improve readability.
- Enlarge the selected-philosophy panel and typography. Include a plain-language account
  of the philosophy's central view as well as the guiding question.

### VSEPR molecular model

- Preserve the praised Three.js model.
- Make atom letters white and keep them fully inside their spheres at every camera angle.
- Label lone-pair electrons with `e^-` or an equally concise electron notation.

### Multivariable-integration interaction

- Preserve the exemplary Riemann-sum visual without reframing it. Correct orbit-drag and
  scroll/pinch directions so direct manipulation feels conventional rather than reversed.

### Modifier placement

- Preserve the praised proximity demonstration and add appropriate Lucide icons to both
  placement controls.

### Projectile motion

- Preserve the praised model. Render velocity units as the KaTeX fraction
  `\mathrm{m}/\mathrm{s}` and enlarge the tangent and component arrows slightly.

### Five-paragraph essay

- Replace the clipped, incoherent version completely. Progressive disclosure is not
  needed for this whole-model overview.
- Restore the clearer sequence: broad context narrows to one thesis; the thesis supports
  three body paragraphs with reason, evidence, and analysis; those reasons converge into
  conclusion/synthesis. Keep every label visible at supported viewports.

### Natural background clarification

- Earlier requests for a white background meant “do not choose an arbitrary artifact
  background.” Artifact and chat surfaces should inherit the natural main-panel surface.
  Do not force pure white, gray, tinted, or dark fills merely for decoration. Explicit
color remains appropriate when the concept itself needs it, such as dark space in the
solar-system model.

### Final consolidated review lessons

- Diffusion must remain visibly bidirectional. A net-flux arrow without opposing
  particle crossings teaches directed transport rather than random diffusion. Let the
  gradient affect crossing frequency and directional probability, not particle speed.
- Inspect mathematical labels in screenshots as well as the DOM. A transformed SVG
  `foreignObject` can contain valid KaTeX while its visible text is displaced from its
  label surface. Geometry, transform, and rendered pixels must all agree.
- Three-dimensional wheel and drag gestures should follow conventional direct
  manipulation. Inverted controls are a functional defect, not a matter of taste.
- Explicitly release pointer capture after multi-touch gestures so later nearby controls
  remain reliably clickable.
- Tests for clipping and overlap must query real rendered labels. Empty-selector checks
  can silently turn a visual regression test into a false pass.

## Follow-up: association, motion, and attached details

- Keep a mathematical value physically associated with the geometry it measures. The
  Pythagorean `a = 3` label must touch its leg; power-of-a-point magnitudes should be bare
  values placed against—and rotated exactly with—their segments. Point names remain
  separate labels.
- Bidirectional diffusion must not be animated as equal alternation under an unequal
  concentration. Crossing frequency should reflect source-side concentration while
  individual particle speed stays constant.
- Detail panels are structural footers, not floating cards. Attach them flush to the
  artifact bottom without inset margins, rounded card corners, or drop shadows. This
  applies to American history, philosophy, Roman slavery, American slavery, and
  comparable artifacts.
- Detail icons must match the selected event icon. In the footer, use the outline icon
  directly; do not place it in a circular colored badge.
- Wrap long timeline event names inside their colored event boxes. Increase vertical
  event spacing when necessary, without replacing honest elapsed-time proportions with
  decorative equal spacing.
- When a projectile plot intentionally crops the future trajectory, place a same-color
  arrow tip at the visible path end so continuation is perceptually explicit.

Evidence:

- [Detached Pythagorean leg label](assets/july-25-expanded-artifacts/pythagorean-a-label-followup.png)
- [Diffusion direction-frequency concern](assets/july-25-expanded-artifacts/membrane-direction-frequency-followup.png)
- [Floating American-history detail](assets/july-25-expanded-artifacts/american-history-floating-detail-followup.png)
- [American-history event-name overflow](assets/july-25-expanded-artifacts/american-history-wrap-followup.png)
- [Detached named segment lengths](assets/july-25-expanded-artifacts/power-point-length-labels-followup.png)
- [Floating philosophy detail](assets/july-25-expanded-artifacts/philosophy-floating-detail-followup.png)
- [Floating Roman-slavery detail and mismatched icon badge](assets/july-25-expanded-artifacts/roman-slavery-floating-detail-followup.png)
- [Crowded American-slavery events and floating detail](assets/july-25-expanded-artifacts/american-slavery-spacing-followup.png)
- [Projectile path without continuation tip](assets/july-25-expanded-artifacts/projectile-path-tip-followup.png)

## Follow-up: population-scale diffusion and durable vector labels

- A particle diffusion simulation should show enough particles to communicate a
  concentration distribution rather than isolated tokens. Multiple existing particles
  may pass through the channel concurrently. Do not serialize all crossing events and
  do not create particles at the membrane. Directional crossing frequency should remain
  proportional to the number of particles available on each side, producing a net flow
  down the concentration gradient while still showing motion in both directions.
- Component-vector labels are part of the geometric model, not detached annotations.
  Keep `v_y` visibly adjacent to the right side of its vertical arrow through the entire
  projectile trajectory. Increase the decomposition arrows to about `1.5x` their prior
  size, then test late-flight states where the construction approaches the axes and
  artifact bounds.

Evidence:

- [Sparse serial membrane traffic](assets/july-25-expanded-artifacts/membrane-density-concurrency-followup.png)
- [Occluded projectile vertical-component label](assets/july-25-expanded-artifacts/projectile-vector-visibility-followup.png)
