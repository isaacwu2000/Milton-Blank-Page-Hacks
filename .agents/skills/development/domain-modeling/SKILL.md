---
name: domain-modeling
description: Build or sharpen a project's domain vocabulary and record architectural decisions. Use when resolving overloaded terms, editing a glossary, or capturing a significant architectural trade-off.
metadata:
  source: https://github.com/mattpocock/skills/blob/5beb35b040e3de97e54fa9e386d7e42d15c295c2/skills/engineering/domain-modeling/SKILL.md
---

# Domain Modeling

Build and sharpen the project's domain model during design. Challenge terms,
probe concrete scenarios, and record agreed terminology as it becomes clear.
Merely reading a glossary for vocabulary does not require this workflow.

## Find the repository's sources

Read the [repository context contract](../references/repository-context.md).
Use the repo's established glossary and architectural decision records (ADRs),
including `.agents/context/CONTEXT.md` when that is its domain glossary. Preserve
the repo's existing layout and format.

If a `GLOSSARY-MAP.md` exists, use it to find the relevant domain context. If none
of these sources exists, default to a root `GLOSSARY.md` and `docs/adr/`, creating
files only when there is an agreed term or decision to record. These files belong
to the receiving repository, not this shared library.

## During the discussion

- **Challenge conflicts.** When a term conflicts with the glossary, explain the
  difference and resolve which meaning is intended.
- **Sharpen fuzzy language.** Separate overloaded concepts, such as Customer and
  User, and propose a precise canonical term for each.
- **Probe concrete scenarios.** Use edge cases to establish the boundaries and
  relationships between concepts.
- **Check against code.** If the stated behavior and implementation disagree,
  surface the discrepancy rather than silently treating either as the decision.
- **Record agreed terms inline.** Update the relevant glossary as terms are
  resolved, rather than batching them at the end. Keep it about domain language;
  specifications, implementation plans, and temporary notes belong elsewhere.

Use [the glossary format](GLOSSARY-FORMAT.md) when no local format exists. In a
repo with multiple contexts, record the term in the relevant context; clarify
ownership when it cannot be inferred.

## Offer ADRs sparingly

Offer an ADR only when the decision is all three:

1. Meaningfully costly to reverse.
2. Surprising to a future reader without context.
3. The result of a real trade-off between alternatives.

Record the actual agreed decision and why it was made. Use the repo's format or
[the default ADR format](ADR-FORMAT.md). Leave unresolved choices explicitly open;
the agent does not decide for the human.
