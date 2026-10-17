---
name: LearnUnlock — Clear Path Studio
description: SportsBuilder's implementation of LearnUnlock's quiet, content-first visual identity.
colors:
  accent-700: "oklch(50.7% 0.099 170)"
  accent-100: "oklch(95.6% 0.063 170)"
  accent-900: "oklch(29% 0.056 170)"
  neutral-light-100: "#fff"
  neutral-light-400: "oklch(98.88% 0.003 197)"
  neutral-light-500: "oklch(97.99% 0.003 197)"
  neutral-dark-150: "oklch(14.9% 0.022 260)"
  neutral-dark-200: "oklch(19.9% 0.011 260)"
  neutral-dark-400: "#47524f"
  neutral-dark-500: "oklch(50.1% 0.009 260)"
typography:
  headline:
    fontFamily: "Lexend, sans-serif"
    fontSize: "20px"
    fontWeight: 550
    lineHeight: "28px"
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Lexend, sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: "24px"
  body:
    fontFamily: "Lexend, sans-serif"
    fontSize: "14px"
  label:
    fontFamily: "Lexend, sans-serif"
    fontSize: "12px"
rounded:
  field: "8px"
  player: "12px"
spacing:
  compact: "8px"
  group: "16px"
  section: "24px"
  spacious: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent-700}"
    textColor: "{colors.neutral-light-100}"
  button-secondary:
    backgroundColor: "{colors.neutral-light-100}"
    textColor: "{colors.neutral-dark-200}"
  player:
    backgroundColor: "{colors.neutral-light-100}"
    rounded: "{rounded.player}"
---

# Design System: LearnUnlock / SportsBuilder

## Overview

**Creative North Star: “Clear Path Studio.”** Preserve LearnUnlock's cool paper,
ink, Path Teal, Lexend, quiet controls, and progressive disclosure. SportsBuilder
applies that identity to movement analysis: footage and measurements carry the
explanation, while builder and coach conversations stay concise and separate.

This refresh reconciles the incumbent identity with the shipped implementation.
Paths are repository-relative. [styles.css](../../Web/frontend/src/styles.css)
owns the runtime tokens; the extracted frontmatter should be refreshed alongside
intentional system changes rather than independently from that stylesheet.

Key characteristics: content first, restrained accent, borderless surfaces,
readable measurement labels, and recoverable states.

## Colors

### Primary

Path Teal (`accent-700`) marks primary actions, active navigation, selected joints,
and keyboard focus. Pale and deep variants support small selection/status surfaces.

### Neutral

Cool paper variants distinguish page, navigation, fields, and white work surfaces.
Ink variants establish heading, body, and secondary-text hierarchy. Preserve the
cool palette instead of cream, purple glow, or decorative gradients.

**The Quiet Shell Rule.** Color emphasis identifies an action or measured state;
it does not compete with footage or plots. The player's green velocity and rust
acceleration colors are semantic data encodings, not additional brand accents.
Plain readings, units, and the details panel carry meaning alongside color.

## Typography

Use bundled variable Lexend with a sans-serif fallback. Its asset/license live in
`Web/frontend/public/fonts/`. Follow the headline, title, body, and label roles;
section headings also use the existing compact 14px treatment. Smaller metadata
styles are annotations, not a default for explanations.

**The Readable Content Rule.** Adapt layout around readable content instead of
shrinking type to fill wide monitors. Constrain long explanations rather than
stretching them across the analysis surface.

## Layout

Build your coach and Get coached sit at the sidebar top; Your profile anchors its
bottom without a workspace footer. LearnUnlock-style header and floating
hamburgers collapse the entire sidebar and reopen it at the page’s top-left,
restoring keyboard focus and the saved preference. Height onboarding
and editing belong in Your profile; the builder opens directly in its own section;
upload and video history belong in Get coached. The central upload task sits directly
on the workspace background, followed by full-width history and a quiet sample
link. Breadcrumbs and nested upload cards are absent. Saved coaches belong in the
builder section. The visible pre-upload sampling slider sits below the upload action. It uses the
grapher’s native range interaction, a teal thumb, and the three-layer inset track;
its value labels are plain seconds.
The athlete's coach belongs beside analysis. Feature composition lives in
`Web/frontend/src/modules/sportsbuilder/ui/`.

Laptop use is the current review priority. Analysis gives the recording and
measurements a flexible column beside the coach; hiding the coach creates more
viewing room. Preserve portrait handling, video aspect ratio, and overlay alignment.

The actual home sidebar is 224px, changes to 192px below 1100px, and becomes a 64px
icon rail below 760px. At 1600px and above it uses `max(280px, 15vw)`. The analysis
coach column is 340px normally, 300px below 1100px, and 380px on wide displays.
Below 760px, analysis, builder, and reference columns stack. These describe the
current implementation rather than imposing tutor navigation on every new surface.

Use the repeated compact/group/section spacing rhythm. Progressively disclose
calibration, reference alignment, metric detail, and rubric content.

## Elevation & Depth

Surface contrast, spacing, and LearnUnlock's exact three-layer shadows establish
hierarchy. `Web/frontend/src/styles.css` copies `--shadow-sm`, `--shadow-md`,
`--shadow-mdlg`, `--shadow-lg`, and `--shadow-inner` from LearnUnlock's
`Web/src/app/globals.css`. Each layer uses
`color-mix(in oklch, var(--neutral-dark-150) <opacity>, transparent)`.

| Token | Layers: x / y / blur / opacity | Shipped use |
| --- | --- | --- |
| `--shadow-sm` | -1px / 1px / 1px / 7.5%; -1px / 1px / 3px / 4%; -1px / 2px / 6px / 2% | Small cards and active items |
| `--shadow-md` | -0.5px / 0.5px / 2px / 7.5%; -0.5px / 0.5px / 5px / 2%; -0.5px / 1.5px / 10px / 2% | Menus, forms, charts, settings; `--shadow` aliases this token |
| `--shadow-mdlg` | -1px / 1px / 2px / 7.5%; -1px / 2px / 8px / 4%; -1px / 4px / 16px / 2% | Player surface |
| `--shadow-lg` | -1px / 1.5px / 3px / 5%; -1px / 3px / 10px / 4%; -1px / 6px / 20px / 2% | Builder surfaces |
| `--shadow-inner` | inset -1px / 1px / 1px / 2.5%; inset -1px / 1px / 4px / 2.5%; inset -1px / 2px / 8px / 2% | Recessed fields, dropdown triggers, composer |

Reuse these tokens for their existing roles. The dropdown combines a recessed
trigger with a raised menu; surface depth supports the action hierarchy.

## Brand mark

The approved SportsBuilder mark is Progression: three teal geometric forms in
`Web/frontend/public/sportsbuilder.svg`. Use that same asset for the app logo and
SVG favicon. Pair it with the SportsBuilder name in the sidebar. Keep the mark
unboxed on the existing neutral surface; the other concept marks remain studies.

## Shapes

Native fields use the field radius; the player and recurring panels use a larger
soft-corner treatment. Generic controls retain their own component styles. Borders
are rare; outlines that identify a measured joint, axis, focus state, or calibration
geometry carry information and remain appropriate.

## Components

The [generic component catalog](../../Web/frontend/src/components/README.md) owns
the reuse boundary. Import generic controls through their public `index.ts`.
Keep sports presentation in its feature and use the feature's public entry.

- **Buttons:** teal primary actions, quiet text actions, white secondary surfaces;
  preserve disabled state, visible focus, and icon-only accessible names.
- **Fields:** borderless neutral surfaces, associated labels, and visible focus.
  Use Input for supported text types and NumberInput for decimal drafts and unit
  suffixes. NumberInput preserves the grapher’s Input-based chrome and editable
  text behavior; file/range/select/textarea controls retain native semantics.
- **Navigation:** compact labels, Lucide icons, tonal separation, restrained elevation.
- **Player:** selectable body joints identify the source measurement. Velocity and
  acceleration arrows belong to the selected joint/current sampled frame. Their
  separate scales stay fixed within a clip. A joint click opens its closable custom
  details panel; plain scalar Speed/Acceleration readings, units, and missing evidence
  belong there, alongside the joint name. Keep formulas and vector-component
  notation out of that panel; physical units may use compact KaTeX fractions.
  The video carries neutral axes and
  white-backed KaTeX `x=0`/`y=0` chips, inspired by LearnUnlock’s grapher. Its origin
  stays at the left frame edge and estimated initial shoe-contact line; positive y
  points upward. Components use truthful units.
- **Feedback:** errors explain a recoverable problem once; progress names the
  actual stage; synthetic and unavailable evidence remain explicit.

Keep transitions short and state-driven and honor the existing reduced-motion
override. Keyboard focus, semantic controls, and contrast remain requirements;
this document does not certify a complete accessibility audit.

## Do's and Don'ts

### Do

- **Do** preserve LearnUnlock's Clear Path Studio identity and token vocabulary.
- **Do** make footage, measurements, and the next useful action dominant.
- **Do** verify real laptop content, focus, truncation, and hidden-coach behavior.

### Don't

- **Don't** add feature-overload dashboards or decorative AI chrome.
- **Don't** bypass shared tokens with one-off colors, shadows, or side-stripe accents.
- **Don't** carry old tutor biology diagrams or sidebar labels into SportsBuilder.
- **Don't** rely on arrow length/color alone; expose scale, plain values, units, and gaps.
