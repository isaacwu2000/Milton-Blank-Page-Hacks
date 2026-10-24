# Coding Standards

All repository paths in this file are relative to the repository root unless
explicitly stated otherwise.

Use `bun` and `bun run` commands, not `npm` or `npx`.

## Module design

- A module may import only from layers to its left:

  `types → config → repo → services → runtime → hooks → ui`

- Cross-module imports must use a public `index.ts` declared by the module-boundary
  lint rule. Most modules expose only their root `index.ts`; a module may declare a
  child interface when separate bundles must not share one root interface. Do not
  import another module's internal files directly.

## Comments and technical writing

- Make every comment maximally simple. Use the shortest plain-language wording
  that fully explains the code.
- Define every technical, domain-specific, or jargon term the first time the
  comment uses it. Put the definition in the same comment so a reader never has
  to search elsewhere to understand the explanation.
- Add a brief comment before complex, dense, or non-obvious logic. Explain why
  the block exists, the rule it preserves, and any assumption a maintainer must
  not break. Do not narrate individual lines or restate self-explanatory code.
- In a larger function, use simple section comments to organize one-use logic.
  Prefer this over extracting tiny helpers that would be called only once and
  would make the behavior harder to read in one place.
- For every interface or function that is more than basic, pure UI, write a
  concise interface comment. Use bullets to separate:
  - What the function changes or returns.
  - Which inputs or records each rule applies to.
  - Side effects and important failure behavior.
  - Invariants the function preserves. An invariant is a rule that must remain
    true before and after the function runs.
- Keep contract comments thorough but structurally simple. For example:

  ```ts
  /**
   * Updates a todo and its subtodos.
   *
   * A subtodo is a todo nested under another todo.
   *
   * Applies only to the selected todo:
   * - Title and due-date changes.
   * - Parent changes, which must not create nesting cycles.
   *
   * Applies to the selected todo and all subtodos:
   * - Explicit project changes.
   * - Completion changes.
   */
  export async function updateTodo(...) {}
  ```

## Function parameters

- Give each required input its own named parameter. Do not create a generic
  `input`, `options`, or `params` object only to group unrelated values.
- Keep a domain object as one parameter when its identity and fields form one
  meaningful value, or when optional configuration genuinely benefits from a
  named options object.

## Tests

- Follow `.agents/context/TESTING.md` for the testing workflow, required
  verification, test design, lanes, state, ports, and CI policy.

## Frontend and design

- Follow the Impeccable skill at `.agents/skills/impeccable/SKILL.md` for every
  design or UI task. It owns the design, accessibility, responsive behavior,
  interaction, motion, and visual-verification standards.
- Treat `.agents/context/DESIGN.md`, `Web/frontend/src/styles.css`, and
  `Web/frontend/src/components/README.md` as SportsBuilder's project-specific design sources.
- Ensure to test all changes thoroughly in the browser
- Give screenshots and screenrecordings as evidence for successes and failures.
