---
name: LearnUnlock
description: Learn fast, score high — a whiteboard tutor that guides studying with interactive visuals.
---

# LearnUnlock design direction

All repository paths in this file are relative to the repository root unless
explicitly stated otherwise.

## Clear Path Studio

LearnUnlock is a focused studying tool: a quiet shell around a whiteboard tutor and
chat. The interface should be concise, clear, and tasteful. Decoration exists to
help students understand material—usually through visuals on the board—not to
embellish product chrome.

The product should feel current and dependable: Notion-like content focus,
Claude-like streaming polish without copying its voice, and Cursor-like speed with
progressive disclosure. Students are often under time pressure, so the interface
must make the next useful action obvious and then get out of the way.

## Visual character

- Use cool paper and ink neutrals. Do not drift into cream, sand, purple AI glow,
  or institutional LMS gray.
- Use Path Teal deliberately and rarely. It signals focus, confirmation, and
  meaningful emphasis; it is not a decorative background color.
- Use Lexend throughout product UI. Keep the type hierarchy compact, legible, and
  content-first.
- Let spacing, alignment, and restrained elevation establish hierarchy. Avoid
  decorative borders, nested cards, and competing chrome.
- Prefer shadows, elevation, spacing, or surface contrast to borders. Avoid
  borders in almost all cases; use one only when those quieter cues cannot make
  an essential boundary clear or accessible.
- Make reasonable exceptions when an outline carries meaning, such as the
  boundaries of nodes in a diagram. Note intentional exceptions to the user so
  the tradeoff is explicit.
- Keep motion short and state-driven. Honor reduced-motion preferences.

## Diagram labels

- Place scientific labels on the atom, residue, or base-pair segment they identify.
- Use a translucent white tint with background blur and subtly rounded corners
  behind diagram labels and lone-pair dots; avoid fully opaque white masks.
- Use KaTeX for chemical symbols, attached hydrogen counts, and charges.
- Three-dimensional molecular and biological schematics use the grapher’s shared
  rotation, pan, and zoom controls.

## Typography

- Product UI may use only 8px, 10px, 12px, 14px, 16px, and 20px type sizes.
- Keep line heights and vertical spacing on the 4px grid; prefer 8px steps for
  spacing between distinct groups.
- Do not shrink type merely because a viewport is wide. Display scaling is a
  user and operating-system concern; responsive layout should adapt the space
  around readable type.

## Responsive layout

- Preserve the 240px app sidebar below 1600px. At 1600px and above, give it a
  280px content-safe minimum and let it grow at 15vw without a maximum; it is
  automatic, never draggable. “Course Customizations” should generally remain
  visible in full.
- Keep the board and conversation visually dominant as the sidebar grows; its
  width follows the viewport only to preserve useful navigation context.
- Keep prose between 65ch and 75ch and cap the Tutor conversation and prompt
  instead of stretching them across wide monitors.
- Treat 1920×1080 and 2560×1440 as required monitor checks in addition to the
  existing laptop and mobile viewports. Verify real content, truncation, focus,
  and collapsed-sidebar behavior at each size.
- Size Lucide icons in consistent boxes, then optically adjust broad glyphs
  within those boxes when equal numeric sizes do not look equal.

## Product principles

- **Guide the next step.** Students should rarely wonder what to do next.
- **Make the board the product.** Interactive teaching visuals carry
  understanding; surrounding UI stays quiet.
- **Protect focus.** Prefer one clear action and progressively disclose secondary
  controls.
- **Keep small controls quiet.** Use a concise action name or familiar icon with
  an accessible name. Do not add persistent helper labels, counters, feature
  descriptions, or repeated status text beside small buttons and routine
  controls. Disclose useful detail on hover, focus, or when a state needs action.
  Major section headings may have a short supporting description. Error copy
  should explain the problem once and offer only a relevant recovery action.
- **Be fast and honest.** Use optimistic behavior where safe, preserve real
  content, and show concise, recoverable errors.
- **Use familiar affordances.** Consistency beats novelty in buttons, fields,
  menus, and dialogs.
- **Design accessibly.** WCAG AA contrast, visible keyboard focus, semantic
  controls, and reduced-motion support are the baseline.

## Sources of truth

- `Web/src/app/globals.css` owns the palette,
  elevation tokens, theme aliases, and global interaction foundations. Read it
  before design or UI work; do not copy its values into this document.
- `Web/src/components/README.md` owns the
  generic component catalog, reuse boundary, and component-level conventions.
- Feature-specific presentation stays with its owning module. For example, tutor
  Markdown and Streamdown behavior belongs under `Web/src/modules/tutor/ui`,
  beside its implementation and tests.

## Guardrails

Do keep the interface calm, responsive, and ready to use. Use Lucide for product
icons and the existing token vocabulary for color and elevation.

Author component styling with Tailwind utility classes. Do not create or use CSS
modules; migrate a component's existing CSS module when changing that component.

Do not build a feature-overload SaaS dashboard, a generic chat clone, or nostalgic
edtech. Avoid side-stripe accent borders, gradient text, decorative
glassmorphism, and one-off shadows or colors that bypass the shared system.
