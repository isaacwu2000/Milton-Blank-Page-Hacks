# LearnUnlock artifact rubric — raw draft

## Sources

This rubric distills:

- `.agents/context/PRODUCT.md`, `.agents/context/DESIGN.md`, and `Web/src/app/globals.css`
- `.agents/skills/expanded-learning-experience-review/references/raw/external/blackboard-visual-ai-tutor-evaluation-metrics-full.txt`
- `.agents/skills/expanded-learning-experience-review/references/raw/external/imagine-visual-creation-suite-full.txt`
- all critiques under `.agents/skills/expanded-learning-experience-review/references/raw/feedback/`

Consult the original artifact-specific critique when a finding depends on a concrete
design decision. Use this file for recurring standards.

## Non-negotiable quality bar

- The visual mechanism is the primary content. Explanatory prose and operating guidance
  belong in the adjacent Tutor message.
- Interaction must reveal a relationship that is harder to understand from text alone.
- Introduce at most one or two concepts at a time. Selection should progressively disclose
  deeper information rather than swap arbitrary presentation.
- Review harshly. “Works” is insufficient for an exemplary seed.
- Test every control extreme and intermediate state. No clipping, bounce, overlap, raw
  markup, console errors, or misleading geometry is acceptable.

## Learned design preferences

### Composition

- The whiteboard already supplies the outer surface. Never add another outer card.
- Never nest cards.
- Do not repeat the Artifact title above or inside the whiteboard; retain accessible names.
- Avoid headers, introductory prose, captions, dividers, borders, and instruction chips
  when the visual or chat already communicates their purpose.
- Use the full half-pane intentionally. Removing text should enlarge the teaching visual,
  not create dead space.
- Keep variable detail regions dimensionally stable so selection does not move the layout.

### Proximity and interaction

- Put labels, dimensions, and controls beside the object they identify or change.
- Prefer clicking the visual object to choosing it from a detached menu.
- Keep a clear, quiet way to return from focused detail to comparison.
- Controls must provide immediate educational feedback, not merely change decoration.

### Visual truth

- Preserve actual scale or duration when that relationship is part of the lesson.
- Use minimum-size invisible hit targets rather than falsifying small data marks.
- Show gaps, overlaps, and uncertainty honestly. Clearly subordinate transitions,
  hypotheses, or contextual states to primary entities.
- Use color to encode a defined relationship. Do not assign arbitrary rainbow colors.
- Material, texture, icons, human figures, and three-dimensional form must be recognizable
  when they carry the teaching. Generic placeholders are defects.

### Mathematical visuals

- Render mathematical variables and numerical mathematical values with KaTeX.
- Keep mathematical body text in high-contrast ink unless color itself encodes meaning.
- Attach labels to the geometry they describe and keep them attached through animation.
- Validate the full geometry, labels, and viewBox at every parameter extreme.
- Animation must preserve the proof invariant and remain understandable with reduced motion.

### Timelines

- Use a time-scaled axis when duration matters.
- Group color by meaningful historical era and label the groups.
- Represent important gaps and contested handoffs as subordinate, selectable transitions.
- Repeat a selected entity’s symbol and original-language label in its detail identity.

### Three-dimensional models

- Start with comparison when relative scale matters, then focus one object.
- Preserve real site placement when spatial arrangement carries meaning. If a temporary
  comparison arrangement is used, label it explicitly and never let it imply a real plan.
- Label selectable objects in the scene and support direct selection.
- Put measurements against the modeled dimension, not in a detached fact list.
- Hide dimension lines outside the state where they explain a selected object.
- Derive screen-space labels and dimensions from projected world geometry. Review them at
  several orbit angles, zoom levels, and aspect ratios; a no-overflow DOM check is not
  enough.
- Preserve useful lighting and shadows, but model surface construction with enough fidelity
  to avoid teaching a false smooth or generic form.
- Treat reconstructed or disputed features explicitly as hypotheses.
- Give reconstructed states state-specific annotation so the learner understands what
  changed and which details are uncertain.
- Human scale references must read immediately as people or another familiar scale object.
  Verify the object itself is visible; a visible label is not evidence of this.
- Exercise drag, wheel or trackpad zoom, two-pointer pinch zoom, keyboard operation, and
  their bounded extremes whenever the artifact supports those input modes.

## Evidence checklist

- Real 50/50 workspace screenshot at 1920×1080
- Laptop and tablet-landscape screenshots, including at least one short landscape viewport
- Initial state
- Every selection type
- Every control endpoint
- At least one intermediate animated state
- Minimum and maximum data or geometry values
- Keyboard focus and operation
- Stable chat and whiteboard bounds
- Console and resource-load status
- Gesture extremes and projected-overlay collision checks after orbiting and zooming
