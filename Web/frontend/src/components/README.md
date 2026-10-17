# Shared frontend components

These controls preserve LearnUnlock's Clear Path Studio input/action chrome. Use
the public [index.ts](./index.ts). [styles.css](../styles.css) owns runtime tokens
and global focus/reduced-motion behavior; the visual direction lives in
[DESIGN.md](../../../../.agents/context/DESIGN.md).

| Public component | Use | Contract |
| --- | --- | --- |
| `Input` | Text, email, password, search, telephone, URL | Forwards native props/ref. Supply an associated label or accessible name. Number, file, and range types are intentionally outside its API. |
| `NumberInput` | Decimal numeric entry with an optional unit suffix | Uses LearnUnlock’s grapher NumberCell pattern over the actual recessed Input. Text draft and decimal keyboard; forwards native change/ref semantics, validates finite decimal syntax, required/min/max/step, and preserves partial/invalid pasted drafts for correction. No native number spinner. |
| `PromptBar` | Builder and coach messages | Adapts LearnUnlock Tutor’s raised white prompt surface and circular upward send action. Controlled draft; bounded autosizing textarea; Enter sends, Shift+Enter and input composition keep editing. Disabled/blank guards cover both keyboard and form submission. Compact circular 28px send action; the builder uses an optional-reference plus action. Toolbar actions and attachment status stay caller-owned. |
| `IconButton` | Compact icon-only actions | Supply `label`; choose raised or transparent `surface`. Preserve native disabled/button semantics and visible focus. |
| `DropdownSelect` | Coaching-tool choice and other compact single-choice menus | Adapted from LearnUnlock's actual `DropdownSelect.tsx`. Controlled value/options/onChange; required accessible label; `disabled` covers loading/uploading. Preserves arrow/Home/End/Enter/Space/Escape/Tab navigation, outside-pointer dismissal, focus restoration, and a raised listbox. Uses the copied LearnUnlock surface/focus/shadow tokens. |
| `Math` | Short coordinate-axis labels and unit typography | Supply `expression` and an accessible `label`. Renders KaTeX HTML plus MathML with `trust: false`; used for white-backed x=0/y=0 chips and compact unit fractions. Joint detail numbers remain plain scalar readings. |
| `MeasurementUnit` | Physical speed/acceleration unit labels | Formats m/s and m/s² as accessible KaTeX fractions through Math; leaves other units as text. Does not transform measurements. |

`InputSurface` and `MultilineInput` remain in `Input.tsx` from LearnUnlock but are
not public exports or used by this MVP. Promote one when a real reuse needs it;
add a public export and semantic interaction check together. Contenteditable
editors require their own keyboard, labeling, and value-handling review.

The pre-upload sampling range is a feature control using LearnUnlock’s grapher
interaction pattern, teal thumb, and recessed track; it is not a new generic Slider.
Native file/range inputs, selects, and textareas use global field styles
without being forced through Input's narrower API. Player, reference video, plots,
builder, coach, logo, errors, and empty states belong to the sportsbuilder module.
Sharing them across sports does not make them generic component-library primitives.

Keep business state and network requests outside these controls. Reuse the public
entry before adding a primitive; retain focus, disabled states, reduced motion,
and concise accessible action names when composing controls.
