---
name: implement-spec
description: Coordinate implementation of an agreed specification across dependency-aware tickets, isolated worktrees, and a shared integration branch. Use for an entire ticketed effort rather than a single ticket.
metadata:
  source: https://github.com/mattpocock/skills/blob/5beb35b040e3de97e54fa9e386d7e42d15c295c2/skills/engineering/implement-spec/SKILL.md
---

# Implement Spec

Implement an agreed spec and its tickets on one integration branch. Tickets form
a dependency graph: the **frontier** contains unfinished tickets whose blockers
are complete and which another worker has not claimed.

Read the [repository context contract](../references/repository-context.md) and
[tracker configuration](../manage-issues/references/issue-tracker.md). The repo
owns tracker operations, claims, testing, delivery, and how completed work closes.
Use existing specs and tickets; use [to-tickets](../to-tickets/SKILL.md) when the
breakdown is still missing. Clarify ambiguous spec or ticket references before
implementation.

Communicate through pointers to the spec, tickets, decisions, research, and
commits rather than copying their contents into each worker's context.

## 1. Establish the effort

Read the spec, acceptance criteria, tickets, and blocking relationships. Inspect
the checkout revision, local changes, and concurrent work before starting. Resolve
the intended base branch and create or reuse an appropriate integration branch.
Preserve unrelated changes and do not reset existing worktrees to change bases.

Map which tickets can run independently. Dependencies that require code must be
integrated before their dependents start; a worker reporting done is not enough.

An optional exploration worker can investigate shared unknowns before
implementation. Save reusable notes only within the authorized scope and pass
pointers to subsequent workers.

## 2. Dispatch the frontier

When delegation is supported and authorized, claim ready tickets through the
repo's coordination mechanism and dispatch background implementers within the
environment's concurrency limit. Otherwise work the frontier sequentially and
state that execution is sequential.

Each implementer:

- Works in its own branch and isolated worktree created from the integration tip.
  If an existing worktree has the wrong base, preserve its work and create a
  correctly based one rather than resetting it.
- Reads its ticket, the spec, and relevant repository guidance.
- Follows [implement](../implement/SKILL.md), including proportionate verification
  and [TDD](../tdd/SKILL.md) at established public behavior seams.
- Incorporates the current integration tip and resolves conflicts before
  reporting a tested result. Follow the repo's merge/rebase conventions.
- Reports its commit, checks, evidence, unresolved gaps, and any new dependencies.

Do not mark a blocked or incomplete ticket complete to advance the graph.

## 3. Integrate and advance

Serialize merges onto the integration branch so concurrent workers do not mutate
it at the same time. A dedicated merger worker may do this, or the coordinator
may integrate directly. Verify each integration using the repo's relevant checks;
resolve failures before treating the ticket as integrated.

Recompute the frontier after each integration and dispatch newly unblocked work.
Keep claims and tracker state consistent with what has actually landed. If the
work reveals missing requirements or a dependency cycle, resolve that specific
blocker rather than guessing or dispatching blocked work.

If the repo closes work through PRs, or the user requests one, open a draft PR
when the integration branch first has changes, within the authorized publishing
scope. Reference the spec and tickets using the repo's closing conventions.

## 4. Verify and hand off

Once all tickets are integrated, run the repo-required checks for the entire
changed behavior and use [code review](../code-review/SKILL.md) against the pinned
base. Resolve findings, then verify the affected behavior again. Ticket-level
checks alone do not establish acceptance of the combined result.

If a draft PR exists, mark it ready when the agreed acceptance criteria are met.
Otherwise resolve completed tickets using the configured tracker convention and
report the integration branch. Preserve the repo's distinction between
implementation complete, merged, deployed, and production accepted.

Clean up worktrees created for this effort only after their work is preserved in
the integration branch or another durable reference. Leave existing or unrelated
worktrees alone, and retain any worktree needed for unresolved work.
