# Shared frontend components

These controls preserve LearnUnlock's Clear Path Studio input/action chrome. Use
the public [index.ts](./index.ts). [styles.css](../styles.css) owns runtime tokens
and global focus/reduced-motion behavior; the visual direction lives in
[DESIGN.md](../../../../.agents/context/DESIGN.md).

| Public component | Use | Contract |
| --- | --- | --- |
| `Input` | Text, email, password, search, telephone, URL | Forwards native props/ref. Supply an associated label or accessible name. Number, file, and range types are intentionally outside its API. |
| `IconButton` | Compact icon-only actions | Supply `label`; choose raised or transparent `surface`. Preserve native disabled/button semantics and visible focus. |
| `DropdownSelect` | Coaching-tool choice and other compact single-choice menus | Adapted from LearnUnlock's actual `DropdownSelect.tsx`. Controlled value/options/onChange; required accessible label; `disabled` covers loading/uploading. Preserves arrow/Home/End/Enter/Space/Escape/Tab navigation, outside-pointer dismissal, focus restoration, and a raised listbox. Uses the copied LearnUnlock surface/focus/shadow tokens. |

| `Math` | Short coordinate-axis labels | Supply `expression` and an accessible `label`. Renders KaTeX HTML plus MathML with `trust: false`; current use is limited to white-backed x=0/y=0 chips. Joint detail readings remain plain numbers and units. |

`InputSurface` and `MultilineInput` remain in `Input.tsx` from LearnUnlock but are
not public exports or used by this MVP. Promote one when a real reuse needs it;
add a public export and semantic interaction check together. Contenteditable
editors require their own keyboard, labeling, and value-handling review.

Native number/file/range inputs, selects, and textareas use global field styles
without being forced through Input's narrower API. Player, reference video, plots,
builder, coach, logo, errors, and empty states belong to the sportsbuilder module.
Sharing them across sports does not make them generic component-library primitives.

Keep business state and network requests outside these controls. Reuse the public
entry before adding a primitive; retain focus, disabled states, reduced motion,
and concise accessible action names when composing controls.
