# Skill mechanics

The skill-specific branch of [`writing-for-agents`](SKILL.md): what changes when the document is a skill — frontmatter, the invocation choice, and router skills. Everything else about writing it is the universal reference in `SKILL.md`.

## Invocation

Two choices, trading the two loads:

- A **model-invoked** skill keeps a `description`, so the agent can fire it autonomously — and other skills can reach it. You can still type its name: model-invocation always _includes_ user reach; a description only ever adds agent discovery, never removes the human's. The description is the skill's top-level context pointer, forced to stay loaded at all times — permanent context load in exchange for discoverability. A model-invoked skill whose content is all reference is also one home for shared reference: another skill can invoke it, so reference needed by several skills lives in one place. Mechanics: omit `policy.allow_implicit_invocation` from `agents/openai.yaml` (or set it to `true`), and write a model-facing description carrying the trigger branches (the pointer-writing rules in `SKILL.md` apply in full).
- A **user-invoked** skill strips the description from the agent's reach: only the human typing its name can invoke it. Zero context load, but it spends cognitive load — you are the index that must remember it exists. Mechanics: set `policy.allow_implicit_invocation: false` in `agents/openai.yaml`; the `description` becomes human-facing — a one-line summary, trigger lists stripped.

Preserve the receiving tool's discovery settings. For new skills, keep normal discovery unless the user requests explicit-only invocation. Do not infer an invocation-policy change from the fact that a router can reach a file.

Shared reference that two user-invoked skills both need can live in neither — neither can implicitly fire the other. Push it to a plain file outside the skill system: external reference any skill can point at.

## Splitting by invocation

The invocation cut of splitting (the sequence cut lives in `SKILL.md`): split off a model-invoked skill when you have a distinct leading word that should trigger it on its own — a trigger word you actually use in your prompts — or another skill must reach it. You pay context load for the new always-loaded description, so that independent reach has to be worth it.

## Router skills

When user-invoked skills multiply past what you can remember, that piled-up cognitive load is cured by a **router skill**: one model-invoked skill that names the others and when to read each, so the human has one skill to remember instead of many. A repository router can follow direct file pointers to child `SKILL.md` files; it cannot implicitly invoke those children by name.
