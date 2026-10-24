---
name: research
description: Research a question using high-trust primary sources.
---

Use a **background agent** when delegation is supported and authorized, so other work can continue while it reads. Otherwise research directly.

The research task:

1. Investigate the question against **primary sources** — official docs, source code, specs, first-party APIs — not a secondary write-up of them. Follow every claim back to the source that owns it.
2. Return the findings in chat, citing each claim's source.

Do not create, update, or save a research report Markdown file in `research/` or
any other repository folder without explicit user permission. A general request
to investigate, diagnose, or research does not grant that permission. When the
user explicitly requests a durable report, write one Markdown file in the
location they chose, or ask where it should go when no location was given.
