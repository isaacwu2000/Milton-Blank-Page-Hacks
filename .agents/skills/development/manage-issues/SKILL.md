---
name: manage-issues
description: Manage GitHub issues with the gh CLI.
---

# Manage Issues

Treat each request as a **reconciliation**: inspect the live tracker, compute the requested delta, apply it once, and verify it.

## 1. Load the applicable reference

Always read [references/issue-tracker.md](references/issue-tracker.md). The tracker repository and operation conventions are resolved when its rules are loaded.

Read [references/triage-labels.md](references/triage-labels.md) when an operation reads, creates, or changes a triage label. The label vocabulary is resolved when every state named by the request maps to one tracker label.

Read `.agents/context/CONTEXT.md` when drafting or rewriting issue text. Use its product vocabulary.

## 2. Reconcile live state

1. Confirm the GitHub repository from `git remote -v`.
2. Fetch every targeted issue. For creation or migration, list open and closed issues.
3. Compare intent as well as title text to find semantic duplicates.
4. Compute the smallest delta from live state to requested state.

This step is complete when every requested target is resolved to an existing issue or a confirmed new candidate, and every candidate has a create, update, skip, or conflict outcome. On authentication or network failure, report the failure with the reconciliation unfinished.

## 3. Apply and verify

1. State the targets and delta before closing, reopening, deleting source tasks, or bulk relabeling, unless the request already authorizes those exact changes.
2. Apply only the computed delta with the operations in the tracker reference.
3. Fetch each changed issue and verify its requested fields and state.
4. Return the issue numbers, URLs, and any skipped or conflicted targets.

This step is complete when every intended write is verified against live GitHub state or reported as a specific failure.

Use the `triage` skill when the user asks to evaluate issue validity, investigate a report, produce an agent brief, or decide the correct triage outcome. This skill owns tracker operations; `triage` owns the judgment-heavy evaluation workflow.

## `TODO.md` migration branch

When moving tasks from `TODO.md` into GitHub Issues:

1. Parse each unchecked top-level task as one candidate. Keep its nested bullets together as the body. Parsing is complete when every unchecked top-level task is accounted for exactly once.
2. Reconcile every candidate against open and closed issues. Reconciliation is complete when each candidate is marked create, skip with a matching issue, or conflict for the user to resolve.
3. Show titles, bodies, and labels for approval unless the user already approved those exact candidates.
4. Create approved issues in source order with `Source: TODO.md` at the end. Apply `needs-triage` unless the user selected another state.
5. Verify every created issue and record its number and URL.
6. When the user asked to **move** the tasks and every intended issue is verified, remove the migrated blocks from `TODO.md`. A partial GitHub failure leaves `TODO.md` intact and returns the successfully created issue URLs so a retry can reconcile them.

Keep nested explanatory bullets in their parent issue. Use `to-tickets` when the user requests a finer implementation breakdown.
