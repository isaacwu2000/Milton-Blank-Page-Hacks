# Design and interaction

## Contents

1. [Whiteboard composition](#whiteboard-composition)
2. [Portrait half-pane and resizing](#portrait-half-pane-and-resizing)
3. [Natural subject geometry](#natural-subject-geometry)
4. [Information placement](#information-placement)
5. [Controls](#controls)
6. [Motion and transformation](#motion-and-transformation)
7. [Typography and notation](#typography-and-notation)
8. [Color, symbols, and material](#color-symbols-and-material)
9. [Accessibility](#accessibility)
10. [Errors and resilience](#errors-and-resilience)

## Whiteboard composition

The whiteboard is already the outer surface. The artifact should use it directly.

- Keep the visible artifact title in the chat reference, not repeated above the board.
- Preserve accessible region, iframe, and close-control names.
- Overlay the quiet close control so it does not reserve an empty header row.
- Avoid an outer card, nested cards, decorative dividers, instructional chips, detached
  fact columns, and panels whose primary purpose is visual organization rather than
  learning.
- Use full available area intentionally. Removing text or chrome should strengthen the
  teaching visual rather than create unexplained dead space.

Short explanatory text may appear inside an artifact when it is necessary to interpret
the current state and more efficient than another visual device. Avoid universal bans on
paragraphs; evaluate necessity, length, proximity, and learner level.

Make direct manipulation legible through familiar, restrained affordances: visible
labels, cursor and focus treatment, immediate hover or touch response, and clear selected
state. Use chat to provide initial operating instructions when needed. Permanent
instruction panels, pulsing hints, or detached selectors are justified only when the
manipulation cannot be made understandable through the subject itself.

## Portrait half-pane and resizing

Artifacts naturally occupy a portrait half-pane on current desktop and likely future
phone or rearranged layouts. Design for that reality from the beginning.

Prefer resizing the artifact as the whiteboard changes size. Unnecessary features should
already have been removed rather than conditionally hidden as a responsive fix.

Uniformly scale the subject where possible, while preserving minimum readable text,
control, focus, and target sizes. When scaling would make annotations illegible, reposition
or reveal annotations contextually without changing the knowledge model.

Test the real composition at desktop, laptop landscape, tablet landscape, and short
landscape. Future arbitrary pane resizing should not expose camera, overlay, or layout
assumptions.

## Natural subject geometry

Do not distort a subject merely to fit the portrait container.

- Timelines usually remain vertical.
- Naturally horizontal spatial systems remain horizontal.
- Never rotate text vertically to force fit.
- Use available space above, below, or beside a horizontal model for controls or selected
  detail.
- A location-dependent spatial model may reveal region detail in a stable bottom area.
- Long timelines may use natural vertical document scrolling.
- Spatial worlds may pan and zoom.
- Bounded proofs and focused diagrams should fit without generic scrolling.

Avoid nested scrolling created only because the composition was not designed for its
container.

Scale visual density with scope. A broad view containing many objects should show fewer
details per object. A focus state should center or zoom into one subject and may reveal
additional material, annotation, and interpretation without retaining irrelevant overview
chrome.

## Information placement

Keep related information together:

- labels beside objects;
- dimensions against measured geometry;
- controls beside the state they change;
- selected identity connected to its original mark;
- definitions beside unfamiliar terms;
- qualifications beside affected representations.

When adjacency is impossible, add an explicit visual connection such as a leader line,
shared meaningful highlight, repeated symbol, or synchronized state. A vibrant shared hue
can connect elements when the hue is reserved for that relationship.

Use stable contextual regions appropriate to the subject: beside a vertical chronology,
below a horizontal world, or attached to a selected object when collisions can be
controlled. Changing content should not bounce the surrounding layout.

## Controls

Every control should change something conceptually important. Review whether the learner
looks at the subject or at a control panel.

- Prefer one obvious primary manipulation in a phase when the subject permits it.
- Allow several controls when their relationship is the lesson.
- Keep global controls only when they affect the whole model.
- Reveal local controls with their selected object or phase.
- Use conventional controls for precision and accessibility.
- Give direct manipulation an equivalent keyboard path.
- Use invisible minimum hit targets instead of enlarging truthful data marks.
- Provide a quiet, reversible return from focus.

Navigation controls such as zoom can be helpful, but they do not replace meaningful
educational manipulation.

## Motion and transformation

Motion should reveal continuity, rearrangement, causality, focus, or state change.

Give the learner a scrub, pause, or equivalent progress control when intermediate states
teach. Inspecting every part of a transformation may be essential to understanding.

Short focus transitions and ordinary state changes may run automatically. Keep them
brief, state-driven, and free of bounce. Avoid ambient or decorative movement competing
with inspection.

Review start, several meaningful intermediate frames, end, reversal, repeated use, and
reduced motion. Labels, leaders, quantities, and referents should remain coherent through
the entire transformation. Reduced motion must preserve the conceptual comparison.

## Typography and notation

- Use simple learner-level language with correct subject terminology.
- Keep a compact hierarchy and sentence case.
- Maintain readable text at the real half-pane size.
- Render mathematical variables and numerical mathematical content with KaTeX.
- Keep mathematical conclusions in high-contrast ink unless color carries meaning.
- Keep labels horizontal when possible; use leaders rather than rotated text.
- Check longest content, wrapping, foreign-language labels, and CJK rendering.
- Prevent raw Markdown, raw KaTeX, code, tool syntax, or parsing failures.

Little should persist without a reason. Persistent information should be necessary for
interpreting the current state.

## Color, symbols, and material

Color should encode subject meaning: family, state, magnitude, material, physical
property, uncertainty, or selection. Keep roles learnable and add a legend when the
mapping is not evident. Use a non-color cue for selection and state.

Preserve LearnUnlock's semantic interaction roles while allowing subject-specific color
families and physical colors. Do not impose one decorative palette across disciplines.
The dedicated agent-facing Artifact color system remains future work in `TODO.md`.

Choose symbols in this order:

1. specific and immediately recognizable;
2. specific, with enough context to become understandable;
3. recognizable and truthful, even if less specific;
4. no symbol;
5. never a misleading cliché or historical falsehood.

Use one polished icon family, consistent size and stroke, and optical centering. Repeat a
selected identity symbol when attention moves away from the source marker.

Material, texture, lighting, and dimensionality are valuable when they teach construction,
surface, age, scale, or form. They are unnecessary when invisible at the real pane size or
added chiefly for spectacle.

## Accessibility

- Meet WCAG AA contrast.
- Give every control semantic labels, visible focus, and keyboard operation.
- Expose selected, pressed, expanded, current, and live state correctly.
- Provide a concise accessible summary of the knowledge model.
- Let adjacent chat provide the fuller textual explanation instead of duplicating the
  entire visual in hidden text.
- Avoid hover-only meaning.
- Support touch without sacrificing keyboard or pointer behavior.
- Honor reduced motion.
- Ensure information controls and definitions are accessible on pointer, touch, keyboard,
  and screen reader.
- Preserve meaning without color.
- Keep targets usable without falsifying visible scale.

## Errors and resilience

When the renderer, library, asset, or generated code fails, preserve the Tutor
conversation and show one concise recoverable error in the whiteboard. Do not expose raw
technical output or create a decorative error card.

Review console, CSP, libraries, fonts, images, KaTeX, Canvas, WebGL, and resource loading.
Check repeated interactions, resizing, artifact switching, and reload behavior according
to the current workspace contract. Generated code must remain within the sandbox and
approved library policy.
