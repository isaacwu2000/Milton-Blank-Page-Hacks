# Solar-system selection feedback — 2026-07-25

## Source

- Supplied screenshot: [solar-selected-before.png](assets/solar-selection-2026-07-25/solar-selected-before.png)
- Full July 25 consolidation: [Seeded artifact design feedback](2026-07-25-seeded-artifact-design-feedback.md)

## Direct feedback

- The clicked planet state looked ugly.
- Use LearnUnlock green for the selected state.
- The selected treatment must not intersect the planet name.
- Use a white artifact background; the black space background is unnecessary.

## Review insights

- Draw interaction state around the manipulated object, not the bounding box of a
  compound SVG group that also contains labels and connector lines.
- Brand-colored state is only successful when it remains semantically and visually
  attached to the selected object.
- A selected state and its textual readout must update atomically. A transition that
  briefly leaves the old object highlighted while showing the new object's data is
  misleading, even when it lasts only a fraction of a second.
- Focus and selected treatments may share an object-level ring, but keyboard focus
  must remain visible and the browser's default rectangular SVG outline must not leak
  into the diagram.
- Labels need deliberate clearance from the largest selection ring in every supported
  scale mode and viewport.
- When a dark setting is not essential to the teaching model, prefer LearnUnlock's
  light canvas so the artifact integrates with the surrounding tutor experience.

## Later calibration

The later review reversed the background-specific instruction while preserving the general
principle: outer space is a meaningful reason to retain a dark stage. The final model should
use that darkness to clarify the subject, not to add drama. It must also present two honest
scale modes and never imply that the Sun is comparable in diameter to Jupiter.
