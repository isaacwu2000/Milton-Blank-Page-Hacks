---
name: implement
description: Implement work from a specification or tickets.
---

Implement the work described by the user in the spec or tickets. Load the
[repository context contract](../references/repository-context.md), then read the
relevant repository standards and testing guidance. Preserve concurrent work:
inspect the checkout revision, local changes, and relevant newer work first.

Use [TDD](../tdd/SKILL.md) where appropriate at established public behavior seams.
Run focused checks during implementation and the smallest verification plan
required by the repository for the change and intended handoff. Broaden checks
when changes, failures, or unresolved concerns justify it.

Use [code review](../code-review/SKILL.md) when requested or when scope, risk, or
handoff warrants it. Routine small changes with proportionate verification do
not require a separate review phase.

## Acceptance evidence

Maintain a concise checklist from the request and subsequent corrections. Tie
items to the changed behavior/state and the evidence needed to close them. Before
completion, classify each as verified, failed, blocked, deferred with agreement,
or superseded by a later instruction. Keep this in existing task artifacts or
working notes; do not create a parallel reporting system for a small change.
When approved requirements supersede in-scope project guidance, reconcile that
guidance instead of appending contradictory rules.

Distinguish a prototype from an implementation. A prototype answers its named
question; approval of it does not establish integration or production acceptance.
Preserve settled decisions and task-specific testing exceptions.

For each materially changed user journey, record the tested states, relevant
devices, evidence, revision, environment, and remaining gaps. Exercise the actual
integration when the claim concerns integrated behavior. Test the actual input
method and trigger: a typed or button-driven demonstration does not prove an
automatic voice path. The repo owns the intended journey and stop/cancel meaning.
Exercise relevant retries, interruptions, reopen/reload, stale responses, and
persistence; verify replay does not duplicate persisted work when applicable. Label deterministic,
standalone-preview, local-live, and production evidence accurately.

For UI changes, use [Impeccable](../../impeccable/SKILL.md) and repo-owned design
sources, unless the repo selects another design skill. Capture representative screenshots where they substantiate the result. The repository
and task determine device coverage and evidence format; a PDF is not a shared
requirement. A resized screenshot does not prove another viewport's behavior.
Inspect the capture and record actual dimensions, zoom, input method, and relevant runtime.
Check intended scrolling or navigation before calling content clipped. Separate
content/model errors, rendering defects, and disagreements about evaluation.

For multi-platform changes, update the repo's current parity matrix for the
agreed features and states: expected/actual behavior, revision, device/runtime,
evidence, and gaps. Preserve intentional differences. Web does not prove native
behavior; simulator checks do not prove physical microphone/speaker behavior.
Create a matrix only when the changed scope actually needs cross-platform parity.

Run acceptance checks against the final changed revision; after fixes, rerun the
checks whose evidence became stale. Label focused checks and full suites
accurately. Where evidence uses a schema/version, use its validator and report
unsupported or malformed formats rather than accepting them silently.

Complete the authorized verification and delivery scope using the repository's
instructions. Deployment targets, production acceptance, and permission to
publish belong to that scope; this shared workflow does not authorize them.
Report checklist outcomes, checks, and material limitations. Distinguish local
changes, commits, pushes, and deployments. When publishing is authorized, verify
the exact remote revision before claiming success.

Reread revised agent guidance in existing sessions before relying on it.

If a recurring correction surfaced, first check discovery, contradictions, stale
versions, and enforcement of existing rules. Prefer a deterministic regression
check for a machine-checkable failure, a repo-guide correction for a stale product
contract, and a focused instruction or skill for a missing reusable principle.
Measure improvement against comparable past failures and at least one case where
the rule should not apply; adding prose or passing unrelated tests is not evidence
of improvement. Propose the smallest scoped improvement:
correction, triggering situation, existing rule/load evidence, root cause,
intervention, and a replay case. Reference existing artifacts. Propose a rule after
two independent recurrences, or a regression check after one costly deterministic
defect; keep taste and one-run settings out of permanent shared instructions.
