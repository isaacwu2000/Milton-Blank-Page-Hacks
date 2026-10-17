# Artifact review context map

Use this map to restore review context after compaction. Read the smallest route
that covers the artifact, then inspect the live artifact. Historical feedback is
calibration evidence, not a substitute for an independent review.

The current exhaustive synthesis is
`.agents/skills/expanded-learning-experience-review/references/raw/review-guidance-full.md`.
It is a discussion draft, not yet executable skill instructions.

## Authority order

When sources conflict, apply them in this order:

1. The current user request and annotated feedback.
2. The artifact's current specification and learning claim.
3. LearnUnlock product and visual-system sources.
4. The expanded-learning-experience-review rubric and prior LearnUnlock critiques.
5. External visual-tutor and visualization guidance.

External guidance supplies review methods. LearnUnlock sources decide the final
style. For example, external advice against all shadows or gradients does not
override purposeful depth, lighting, or material cues in a LearnUnlock 3D scene.

## Always retrieve

| Source | Why it matters | Retrieval anchors |
| --- | --- | --- |
| `.agents/context/PRODUCT.md` | Audience, learning promise, product principles | `Register`, `Principles` |
| `.agents/context/DESIGN.md` | LearnUnlock interaction and visual language | `Core Principles`, `Artifact` |
| `Web/src/app/globals.css` | Canonical palette and color-purpose comments | `--color`, `artifact`, `feedback` |
| `.agents/skills/impeccable/SKILL.md` | Required UI audit and responsive workflow | `Audit`, `responsive`, `accessibility` |
| `.agents/skills/expanded-learning-experience-review/references/raw/learnunlock-artifact-rubric.md` | Consolidated acceptance rules and artifact-specific heuristics | artifact type and `Evidence` |

Completion condition: the reviewer can state the learner, learning claim,
primary visual mechanism, allowed interaction, and LearnUnlock style constraints.

## Retrieve for evaluation philosophy

| Source | Use when | What to extract |
| --- | --- | --- |
| `.agents/skills/expanded-learning-experience-review/references/raw/external/blackboard-visual-ai-tutor-evaluation-metrics-full.txt` | Calibrating severity or deciding whether an artifact is exemplary | Harsh pass bar; concision; one-question cognitive load; visual correctness; anti-slop; educational interactivity |
| `.agents/skills/expanded-learning-experience-review/references/raw/external/imagine-visual-creation-suite-full.txt` | Auditing visual mechanism, layout math, text fit, medium choice, or progressive disclosure | “Draw the mechanism”; text/visual division; safe bounds; line routing; medium selection; complexity budgets |
| `.agents/skills/expanded-learning-experience-review/references/raw/external/visualizer-architecture-and-guidelines-full.txt` | Reviewing runtime feasibility, sandbox architecture, library choice, Canvas/SVG/Three.js implementation, or generation constraints | Renderer architecture; token bridge; CSP allowlist; concrete medium implementations; full visualizer guidance |

Read the full local copies in chunks because they are long:

```bash
sed -n '1,230p' .agents/skills/expanded-learning-experience-review/references/raw/external/imagine-visual-creation-suite-full.txt
sed -n '231,460p' .agents/skills/expanded-learning-experience-review/references/raw/external/imagine-visual-creation-suite-full.txt
sed -n '461,700p' .agents/skills/expanded-learning-experience-review/references/raw/external/imagine-visual-creation-suite-full.txt
```

## Retrieve by artifact family

### 3D, spatial, and scale models

- Current contract:
  `plans/artifact-whiteboard-rendering/PYRAMID_MODEL_ITERATION_3_SPEC.md`
- Prior independent critique:
  `.agents/skills/expanded-learning-experience-review/references/raw/feedback/2026-07-18-pyramid-model-annotated-critique.md`
- Latest direct user calibration:
  `.agents/skills/expanded-learning-experience-review/references/raw/feedback/2026-07-18-pyramid-model-iteration-3-user-feedback.md`
- Annotated evidence:
  `.agents/skills/expanded-learning-experience-review/references/raw/feedback/assets/pyramid-iteration-2/`
- Iteration comparison:
  `.agents/skills/expanded-learning-experience-review/references/raw/feedback/iterations/{iteration-1,iteration-2,final}/pyramids-*.png`

Probe true placement and scale, overview-to-focus progression, object-proximate
labels, material fidelity, camera bounds, pointer/wheel/pinch/keyboard input,
world-to-screen overlay collisions, casing/reconstruction truth, and a visibly
recognizable scale reference.

### Timelines and historical sequences

- Current contract:
  `plans/artifact-whiteboard-rendering/CHINESE_DYNASTIES_ITERATION_3_SPEC.md`
- Prior critique:
  `.agents/skills/expanded-learning-experience-review/references/raw/feedback/2026-07-18-dynasty-timeline-annotated-critique.md`
- Annotated evidence:
  `.agents/skills/expanded-learning-experience-review/references/raw/feedback/assets/dynasty-iteration-2/`
- Iteration comparison:
  `.agents/skills/expanded-learning-experience-review/references/raw/feedback/iterations/{iteration-1,iteration-2,final}/dynasties.png`

Probe time-proportional duration, visible dates and gaps, era families, semantic
color, subordinate transition periods, stable selection height, icon centering
and repetition, original-language identity, and half-pane vertical efficiency.

### Mathematical demonstrations and manipulatives

- Current contract:
  `plans/artifact-whiteboard-rendering/PYTHAGOREAN_EXPLORER_ITERATION_3_SPEC.md`
- Prior critique:
  `.agents/skills/expanded-learning-experience-review/references/raw/feedback/2026-07-18-pythagorean-explorer-annotated-critique.md`
- Annotated evidence:
  `.agents/skills/expanded-learning-experience-review/references/raw/feedback/assets/pythagorean-iteration-2/`
- Iteration comparison:
  `.agents/skills/expanded-learning-experience-review/references/raw/feedback/iterations/{iteration-1,iteration-2,final}/pythagorean*.png`

Probe mathematical invariants, KaTeX for quantities and variables, labels on
the geometry, responsive proof area, endpoint and intermediate values, animation
meaning, reduced motion, contrast, and stable view bounds.

## Retrieve for system behavior

- Whiteboard and artifact-reference contract:
  `plans/artifact-whiteboard-rendering/SPEC.md`
- Earliest cross-artifact critique:
  `.agents/skills/expanded-learning-experience-review/references/raw/feedback/2026-07-18-seed-artifact-critique.md`
- Current seeded implementation:
  `Web/src/modules/tutor/config/artifactDemoContent.ts`
- Browser coverage:
  `Web/e2e/artifact-whiteboard.spec.ts`

Use this route for whiteboard sizing, close behavior, artifact references,
message separation, sandbox libraries, or session behavior. Do not use it as a
shortcut around reviewing the artifact itself.

## Feedback patterns to recognize independently

Historical critiques repeatedly expose these high-impact misses:

- A large central element is spatially or factually misleading.
- A detached control duplicates an obvious direct manipulation.
- Titles, instructions, captions, or dates repeat adjacent chat or visual facts.
- Cards, dividers, and empty header bands consume the half-pane.
- Labels explain the interface instead of attaching meaning to the object.
- Responsive geometry works at one value or viewport but clips at another.
- A polished surface hides a weak learning mechanism.
- A later iteration removes the visual richness that made an earlier one useful.

Treat these as search prompts, never as automatic findings. Cite visible or
measured evidence for every claim.

## Post-compaction retrieval recipe

1. Read this map.
2. Read the five always-retrieve sources.
3. Read the current artifact-family specification.
4. Inspect the live artifact and collect findings without opening old critiques.
5. Read the matching historical critique and annotated evidence to calibrate
   omissions, severity, and regression awareness.
6. Read the two evaluation-philosophy sources only for unresolved judgment.

The context is restored when the reviewer can explain both the current artifact
and the strongest known prior failure without relying on memory.
