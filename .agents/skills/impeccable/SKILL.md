---
name: impeccable
description: Use when the user wants to design, redesign, shape, critique, audit, polish, clarify, distill, harden, optimize, adapt, animate, colorize, extract, or otherwise improve a frontend interface. Covers websites, landing pages, dashboards, product UI, app shells, components, forms, settings, onboarding, and empty states. Handles UX review, visual hierarchy, information architecture, cognitive load, accessibility, performance, responsive behavior, theming, anti-patterns, typography, fonts, spacing, layout, alignment, color, motion, micro-interactions, UX copy, error states, edge cases, i18n, reusable design systems or tokens, and ambitious visual effects. Not for backend-only or non-UI tasks.
---

Design interfaces around the user's task, with craft appropriate to the surface
and brief. Quiet, familiar product UI can be the right result; expressive work
belongs where it serves the product. This is shared workflow, not a shared brand.

## Shared principles

- **Make the task clear.** Give the primary action and important state a clear
  hierarchy. Remove repeated summaries, redundant headings, decorative labels,
  persistent helper copy, and chrome that does not help the user act.
- **Preserve meaning.** Keep domain labels, accessible names, useful instructions,
  recovery actions, and information the user needs to decide. Simplicity removes
  obstacles, not necessary capability or relationships.
- **Disclose secondary complexity.** Keep information users need simultaneously
  visible together. Let the agent handle mechanical orchestration where the
  product supports it; expose meaningful progress, outcomes, intervention, and
  recovery without making the user manage internal tools or execution steps.
- **Reuse behavior.** Match established save, navigation, selection, disclosure,
  loading, and recovery behavior, not just component names and styling.
- **The repo owns the product.** Load its product/design contract and actual
  tokens, components, and behavior. Colors, type, layout, terminology, supported
  platforms, input methods, and stop/cancel semantics stay repo-specific.
- **The task owns acceptance.** Follow the user's current requirements over stale
  project guidance within governing instructions. Reconcile superseded guidance
  in scope instead of appending contradictory rules. A new requirement is not
  evidence that earlier work ignored instructions.
- **Inspect the real result.** Use realistic content inside the actual surface,
  including relevant narrow panes, long content, empty/error/pending states, and
  interaction paths. Inspect captures; a screenshot existing is not acceptance.
- **Bound polish, resolve defects.** Batch inspection and fixes. Stop optional
  aesthetic exploration when the agreed bar is met. A pass count never closes a
  known acceptance failure: fix and recheck it, or report the exact blocker or
  unverified gap. Rerun checks when changes invalidate their evidence.

Use [implement's acceptance workflow](../development/implement/SKILL.md#acceptance-evidence)
for correction tracking, revision-aware evidence, real input paths, and scoped
platform parity. Keep these completion rules in that one place.

## Setup

1. Run `node .agents/skills/impeccable/scripts/context.mjs` when first resolving the active project (if the runtime shows this skill's loaded base directory, run `node <skill-base-dir>/scripts/context.mjs`; keep cwd at the user's project). Pass a named source file or route as `--target <path>`. It loads PRODUCT.md, DESIGN.md, and native-platform guidance when applicable; follow the resolved context within governing instructions. Reuse it until the target, product/design sources, or platform changes; then refresh it.
2. Before acting, load the one playbook that owns the request: the Commands table's reference for an explicit or clearly implied sub-command, or [references/new-work.md](references/new-work.md) for a new surface or replacement visual world. Then inspect the target and at least one representative source of incumbent visual truth (tokens, theme, CSS, component, or asset) before editing.
3. After analysis and direction are resolved, load [references/craft-floor.md](references/craft-floor.md) immediately before editing UI. It carries the quality floor, the absolute bans, and the reflexes no detector catches. Do not load it for planning-only work.

**Context helper unavailable:** Tell the user that context loading did not run,
then read the receiving repo's existing product/design sources directly. Inspect
the target, tokens, components, and assets and follow the applicable playbook and
craft floor. Keep missing context explicitly unknown; a helper failure alone
does not block work that the brief and available evidence already establish.

**App unavailable:** Start with committed visual-regression goldens or screenshot
fixtures when available. Establish which route, theme, variant, state, revision,
and viewport each capture represents. Check freshness against current tokens,
styles, components, and assets; resolve conflicts before using a capture as
visual authority. Label fixture-based conclusions separately from live evidence.
A historical screenshot cannot prove current interaction or integration behavior.

## Guidance scope

Read [the repository context contract](../development/references/repository-context.md).
The user's current brief and repo-owned product/design contract govern the
reusable playbooks below. Layout and visual recipes in a playbook are techniques
to evaluate, not permission to replace the repo's identity. For a new or stale
contract, use [the project contract guide](references/project-contract.md).
Existing named design sources remain authoritative; do not create a competing
copy. Helpers run from the receiving repository, using this skill's actual path
when it is stored centrally rather than installed under `.agents/skills/`.

## How to design

- **The brief wins.** Honor pinned aesthetics, eras, materials, fonts, and palettes even when they conflict with a saturated-pattern warning. Redirecting a clear brief toward your taste is failure.
- **Refinement preserves; redesign replaces.** Refinement keeps the incumbent identity, behavior, copy, and everything outside scope. Ask before replacing factual copy or adding claims. Redesign keeps product truth, content, function, native affordances, and constraints, but treats the old look as evidence and anti-reference; choose a replacement world in new-work and replace DESIGN.md. Never split the difference into polish on the discarded look.
- **Visual authority is evidence, not a filename.** Missing DESIGN.md alone does not make a project greenfield; new-work decides whether to preserve, expand, or replace the incumbent world.

## Modes

The mode names what the visitor's success looks like on this surface.

- **Persuade:** the visitor decides and acts; design is the product. Landing pages, marketing, campaigns, pricing. Earn attention and action. Ship real imagery when the brief needs it; follow the committed world, not category habit.
- **Operate:** the visitor completes a task. App UI, dashboards, editors, admin, settings, tools. Scanability, consistency, native expectations, and the real usage scene outrank expression. Brand lives in precise details.
- **Read:** the visitor understands something. Docs, articles, guides, help, changelogs. Structure for comprehension, then make the reading experience worth staying in.
- **Experience:** the visitor is inside the work itself. Portfolios, galleries, showcases. Let the artifact lead from the first viewport; the interface recedes.

Choose the mode from the requested surface, not the product, and keep it in the task-local brief. A tool's landing page is still Persuade; a fashion house's documentation is still Read; a docs index is Read, not Persuade. See [new-work.md](references/new-work.md) for new surfaces and [operate.md](references/operate.md) for deeper Operate/Read guidance.

## Commands

| Command | Category | Description | Reference |
|---|---|---|---|
| `craft [feature]` | Build | Deprecated alias for an ordinary new-work request | [references/craft.md](references/craft.md) |
| `shape [feature]` | Build | Plan UX/UI before writing code | [references/shape.md](references/shape.md) |
| `init` | Build | Capture durable product context in PRODUCT.md | [references/init.md](references/init.md) |
| `document` | Build | Generate DESIGN.md from existing project code | [references/document.md](references/document.md) |
| `extract [target]` | Build | Pull reusable tokens and components into design system | [references/extract.md](references/extract.md) |
| `critique [target]` | Evaluate | UX design review with heuristic scoring | [references/critique.md](references/critique.md) |
| `audit [target]` | Evaluate | Technical quality checks (a11y, perf, responsive) | [references/audit.md](references/audit.md) · native: [references/audit.native.md](references/audit.native.md) |
| `polish [target]` | Refine | Final quality pass before shipping | [references/polish.md](references/polish.md) |
| `bolder [target]` | Refine | Amplify safe or bland designs | [references/bolder.md](references/bolder.md) |
| `quieter [target]` | Refine | Tone down aggressive or overstimulating designs | [references/quieter.md](references/quieter.md) |
| `distill [target]` | Refine | Strip to essence, remove complexity | [references/distill.md](references/distill.md) |
| `harden [target]` | Refine | Production-ready: errors, i18n, edge cases | [references/harden.md](references/harden.md) |
| `onboard [target]` | Refine | Design first-run flows, empty states, activation | [references/onboard.md](references/onboard.md) |
| `animate [target]` | Enhance | Add purposeful animations and motion | [references/animate.md](references/animate.md) |
| `colorize [target]` | Enhance | Add strategic color to monochromatic UIs | [references/colorize.md](references/colorize.md) |
| `typeset [target]` | Enhance | Improve typography hierarchy and fonts | [references/typeset.md](references/typeset.md) |
| `layout [target]` | Enhance | Fix spacing, rhythm, and visual hierarchy | [references/layout.md](references/layout.md) |
| `delight [target]` | Enhance | Add personality and memorable touches | [references/delight.md](references/delight.md) |
| `overdrive [target]` | Enhance | Push past conventional limits | [references/overdrive.md](references/overdrive.md) |
| `clarify [target]` | Fix | Improve UX copy, labels, and error messages | [references/clarify.md](references/clarify.md) |
| `adapt [target]` | Fix | Adapt for different devices and screen sizes | [references/adapt.md](references/adapt.md) · native: [references/adapt.native.md](references/adapt.native.md) |
| `optimize [target]` | Fix | Diagnose and fix UI performance | [references/optimize.md](references/optimize.md) |

Routing:

- **No argument:** read [routing.md](references/routing.md) and present its context-aware menu; never auto-run a command.
- **Explicit or clearly implied command:** load its reference (native variant on native platforms) and follow it. Ask once if two commands fit.
- **Otherwise:** treat the request as general design work. Missing PRODUCT.md routes a new surface or replacement world through init, then new-work; a narrow refinement of existing code proceeds on the incumbent implementation as context.mjs directs, offering init afterward rather than blocking on it.
- `teach` aliases `init`. `craft` is a deprecated alias for ordinary new-work and adds nothing. `shape` owns task discovery, then enters new-work only for visual-world and surface-concept decisions.

After init writes PRODUCT.md, resume without rerunning `context.mjs`; init loads the native platform reference itself when the platform it recorded is `ios`, `android`, or `adaptive`.
