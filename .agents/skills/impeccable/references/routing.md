# No-argument routing: the context-aware menu

Read this when the user invokes `$impeccable` with no argument. They are asking "what should I do?" Make the menu context-aware instead of static.

Setup has already run `context.mjs`. If that reported `NO_PRODUCT_MD`, the project has no captured context yet: lead the menu with `$impeccable init` as the top recommendation (one line on why) and still show the rest below; don't silently jump into init. Otherwise inspect DESIGN.md, the current request, and relevant changed files, then lead with the **2-3 highest-value next commands**, each with a one-line reason, followed by the full menu (the Commands table in SKILL.md, grouped by category). **Never auto-run a command; the recommendation is a suggestion the user confirms.**

Reason over the signals; there is no score to obey:

- DESIGN.md missing while implementation exists → `document` (capture the visual system).
- No critique is present in the current task → for a real surface, offering `$impeccable critique <surface>` is a strong default.
- A current-task critique has P0/P1 findings → `polish`, or re-run `critique` if the evidence is no longer current.
- Changed files point at one surface → scope `audit` or `polish` to those files specifically, naming them.
- The bundled `detect.mjs` is web-only. If `setup.platform` is `ios`, `android`, or `adaptive`, do not recommend it; the HTML rule engine does not apply to native app code.
- Otherwise group by intent (build new / improve what's there), tailored to the current surface and `setup.platform`.

**If `scan.targets` is non-empty and `setup.platform` is not `ios`/`android`/`adaptive`, run `node .agents/skills/impeccable/scripts/detect.mjs --json <scan.targets joined by spaces>` once** (the bundled detector over local files: no network, no npx; it reads HTML/CSS, so skip it for native projects). `scan.via` tells you what they are: `git-changes` (the markup/style files in your dirty tree, the most relevant set), `source-dir` (e.g. `src`, `app`), `html`, or `root`. Fold the hits into your picks: many quality / contrast hits → `audit` or `polish`; a specific slop family → the matching command (gradient text or eyebrows → `quieter` / `typeset`, flat or gray palette → `colorize`, and so on). It's a real, current signal that beats guessing. If detect errors or the tree is large and slow, skip it and recommend the user run `audit` themselves; never block the suggestion on it.

Keep it to 2-3 pointed picks with the exact command to type. The menu stays the fallback; the recommendation is the lede.
