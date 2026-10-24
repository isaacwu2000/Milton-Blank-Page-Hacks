# Issue tracker selection

Read the receiving repository's `AGENTS.md` for its tracker configuration. A repo
may supply `.agents/context/ISSUE_TRACKER.md`, or point to an equivalent document,
with the target project, supported tools, labels, parent/child relationships,
blocking, claims, and collaborator/external-author conventions.

Use that configuration when present. For GitHub Issues, the bundled
[GitHub adapter](github.md) supplies the existing LearnUnlock operation recipes;
resolve the actual repository from the receiving checkout's remote. Prefer a
connected provider tool when it supports the requested operation; use the CLI
recipes when needed and available.

When the user requests local tickets, use the local-file branch of
[to-tickets](../../to-tickets/SKILL.md). Other tracker-based workflows, including
Wayfinder's shared claims and dependency queries, require a configured tracker.
If the target is ambiguous, clarify before publishing. A workflow's instruction
to publish is subject to the user's current scope and authorization.

## Wayfinding operations

Use the receiving repo's configured map, child-ticket, dependency, claim, and
frontier operations. The bundled [GitHub adapter](github.md#wayfinding-operations)
provides defaults when GitHub is selected; repo-owned tracker guidance specializes
them without editing the shared copy.
