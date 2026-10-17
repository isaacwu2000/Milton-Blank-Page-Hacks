# Seed artifact critique — 2026-07-18

## Frozen visualization source

This review applies to the three seed artifacts exactly as shipped at commit
[`a0dd4efeb95457c8185406cfc725763430802328`](https://github.com/isaacwu2000/LearnUnlock/commit/a0dd4efeb95457c8185406cfc725763430802328):

- [Egyptian pyramids model source](https://github.com/isaacwu2000/LearnUnlock/blob/a0dd4efeb95457c8185406cfc725763430802328/Web/src/modules/tutor/config/artifactDemoContent.ts#L64-L207)
- [Chinese dynasties timeline source](https://github.com/isaacwu2000/LearnUnlock/blob/a0dd4efeb95457c8185406cfc725763430802328/Web/src/modules/tutor/config/artifactDemoContent.ts#L209-L304)
- [Pythagorean theorem explorer source](https://github.com/isaacwu2000/LearnUnlock/blob/a0dd4efeb95457c8185406cfc725763430802328/Web/src/modules/tutor/config/artifactDemoContent.ts#L306-L420)

The commit is the immutable stored copy. To restore all three artifacts locally:

```bash
git show a0dd4efeb95457c8185406cfc725763430802328:Web/src/modules/tutor/config/artifactDemoContent.ts
```

## User feedback

### Egyptian pyramids model

- The selector fights the half-pane geometry; it should be horizontal.
- Put concise information above the model instead of consuming a narrow side rail.
- Show one pyramid at a time and use selection for progressive disclosure.
- The current pseudo-3D rendering is visually weak and communicates little beyond rough relative scale.
- Each pyramid needs historically meaningful insight, not only dimensions and builder.

### Chinese dynasties timeline

- The underlying concept is stronger, but the visual execution is mediocre.
- Give each dynasty a meaningful symbolic icon, such as a ritual wine vessel for Shang.
- Use a vertical timeline because the artifact lives in a tall half pane.
- Dynamic detail height currently causes distracting layout bounce.
- The side-by-side detail region wastes width; put the dynasty above its description or use a compact popover.
- Remove the oversized explanatory header and the nested-card composition.

### Pythagorean theorem explorer

- The geometry is broken: changing leg lengths can send the construction off-screen.
- Remove the nested-card composition and redundant artifact title.
- Move operating instructions and explanatory prose into Tutor chat.
- Reduce text sharply and render mathematics with proper KaTeX.
- Make the interaction visually self-explanatory and guarantee the construction remains in bounds.

## Cross-artifact diagnosis

The seeds were designed as miniature educational pages rather than focused teaching
instruments. They overuse headings, prose, panels, and cards inside a whiteboard that
already supplies the containing surface. The interactions mostly change presentation;
they do not yet expose a powerful idea or reward exploration with new intuition.

The next versions should be judged against these constraints:

1. The visual mechanism is the primary content; prose stays in Tutor chat.
2. The whiteboard is already the container, so artifacts do not add an outer card.
3. One or two concepts appear at a time, with deeper facts disclosed by selection.
4. Every interaction must reveal a relationship the student could not see as clearly in text.
5. Geometry is computed from the live viewport and tested at every control extreme.
6. Stable regions reserve enough space for variable content; selection never causes layout bounce.
7. Color, icons, animation, and 3D exist only when they encode subject matter.

## Evaluation sources used for the redesign discussion

- `Blackboard and Visual AI Tutor Evaluation Metrics`: emphasizes maximal concision,
  cognitive-load management, bug-free and accurate interaction, progressive disclosure,
  visual originality, and learning gains unavailable from prose alone.
- `Imagine — Visual Creation Suite`: requires text in chat and mechanisms in the visual,
  flat compact composition, no nested scrolling or decorative effects, correct visualization
  selection, explicit SVG bounds, and controls that provide immediate educational feedback.

