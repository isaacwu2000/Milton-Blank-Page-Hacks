> **Additional context needed**: quality bar and shipping constraints.

Polish is refinement, never concealed redesign. Preserve the incumbent visual world, content, behavior, and everything outside scope. If the concept itself is wrong, say so and recommend redesign or `bolder` instead of smuggling in a replacement.

A detector result is defect evidence, not proof of quality. Inspect the rendered experience and real interaction path.

## 1. Establish the system

Read DESIGN.md and representative tokens, shared components, patterns, and neighboring flows. If no formal system exists, use coherent project conventions.

Classify each drift before fixing it:

- **missing token:** the system needs a reusable value;
- **one-off implementation:** an existing shared component or pattern should replace it;
- **conceptual mismatch:** the flow, information architecture, or hierarchy differs from comparable product areas;
- **local defect:** the implementation is simply incomplete or inconsistent.

Fix the cause at the narrowest correct level. Ask when a binding system principle cannot be inferred.

## 2. Gather the evidence

Use the feature yourself on the surfaces and device classes required by the repo
and task. For web, use representative viewports and input methods. For native
`ios`, `android`, or `adaptive` work, use the shipped device classes on a simulator,
emulator, or physical device and follow the matching platform reference:
[iOS](ios.md), [Android](android.md). Record the device/runtime and actual capture
conditions. Mobile web is still web; resizing a browser does not verify native
behavior, and simulation does not establish hardware-dependent behavior.

If the app cannot run, use the [skill's visual-fixture fallback](../SKILL.md#setup)
for the visual questions it can answer and keep live acceptance gaps explicit.

Determine:

- whether the path is functionally complete;
- the intended quality bar and time available;
- known constraints or deliberately unfinished work;
- the states, content lengths, roles, and input methods users will actually encounter.

If the current task includes a prior critique, use its relevant P0/P1 findings as one input. Perform an independent pass either way; do not create or read a project critique archive.

## 3. Triage

Separate functional defects from cosmetic ones and fix in this order:

1. broken or blocked tasks, data loss, misleading state, and inaccessible paths;
2. missing loading, empty, error, success, disabled, and permission states;
3. flow, hierarchy, responsive, and design-system drift;
4. visual and motion inconsistencies;
5. code and asset cleanup.

Do not perfect one corner while leaving the rest below the same quality bar.

## 4. Polish the whole path

### Flow and hierarchy

- Match neighboring mental models, terminology, disclosure, routing, save behavior, and optimistic or pessimistic patterns.
- Make the primary task and current state obvious without flattening every element to equal weight.
- Ensure arrival, transition, empty, and recovery paths connect instead of behaving as isolated screens.

### Layout and type

- Align to the project's grid and spacing scale; fix optical as well as mathematical alignment.
- Group related content tightly and separate distinct groups generously.
- Keep same-role typography consistent; test measure, wrapping, localization expansion, zoom, and font loading.
- Verify the viewports required for the changed journey and repository acceptance scope; do not imply coverage of viewports not checked.

### Color, imagery, and icons

- Use semantic tokens and stable color meanings across themes.
- Verify text, control, and focus contrast in every state.
- Keep icon families, stroke/weight, sizing, and optical alignment coherent.
- Prevent image layout shift; use correct aspect ratios, responsive sources, and useful alt text.

### Interaction and state

- Every control needs appropriate default, hover, focus, active, disabled, loading, error, and success behavior.
- Preserve visible keyboard focus, logical tab order, labels, and platform-appropriate touch targets.
- Keep motion coherent, interruptible, and performant. Do not add animation merely to make polish visible.
- Validate long, missing, localized, offline, slow, and permission-limited content where the product can encounter it.

### Content and code

- Keep terminology, capitalization, punctuation, and factual copy consistent. Ask before changing claims.
- Remove debug output, dead code, unused imports, obsolete styles, and polish-created duplication.
- Replace custom implementations with shared components where the system owns the pattern.
- Promote genuinely reusable values to tokens; do not create a system abstraction for one local exception.

## 5. Verify and finish

Walk the complete path again with its real input methods: mouse, keyboard, touch,
gestures, or other supported input as applicable. Verify native navigation, safe
areas, keyboard/IME behavior, text scaling, and relevant lifecycle transitions
on the agreed device classes. Verify microphone, speaker, and other hardware
claims on physical hardware when required; otherwise report the gap.

Check within the changed scope:

- mobile, intermediate, and wide layouts;
- loading, empty, error, success, disabled, long-content, and missing-content states;
- zoom, contrast, focus, semantics, and screen-reader names;
- console errors, layout shift, interaction latency, image loading, and supported browsers;
- agreement with DESIGN.md, neighboring features, and the user's scope.

For web, follow the quality guidance supplied by `context.mjs`, including the
mechanical detector pass and focused rechecks when fixes invalidate prior
evidence. For native work, use platform-specific checks instead of the web
detector. Run the repo's other relevant QA commands. Fix real defects and
document only narrow intentional exceptions. A clean scan does not replace
visual judgment.

Finish with a source diff: remove accidental churn, orphaned code, redundant values, and temporary artifacts. Ship only when the feature is functionally complete and consistently finished across the path.
