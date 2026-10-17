---
name: implement
description: Implement work from a specification or tickets.
---

Implement the work described by the user in the spec or tickets.

Use /tdd where possible, at pre-agreed seams.

Run focused tests and typechecking regularly. At completion, run the smallest
verification plan required by `.agents/context/TESTING.md` for the change and
intended handoff. Do not run both the complete suite and `verify:changed` unless
the user explicitly requested complete verification or you are diagnosing the
selector itself.

Use /code-review when the user requests it or when the change's scope, risk, or
handoff warrants multi-perspective review. Do not make it a blocking step for a
routine small tweak that already has proportionate focused verification.

## Acceptance evidence

State whether the current work is a prototype or an implementation. A prototype
answers the named design question; prototype approval does not establish live-agent
or production acceptance. Keep settled decisions and task-specific testing exceptions.

Before acceptance, list each changed user journey with its tested states, devices,
evidence paths, revision, environment, and unresolved gaps. Read the project's
[design sources](../../../context/DESIGN.md) and component catalog for UI changes.
For teaching artifacts, use
[expanded-learning-experience-review](../../expanded-learning-experience-review/SKILL.md).
For Tutor/specialist changes, include a fresh live case not used to construct the
prototype, through Tutor → specialist → tools → rendered Artifact in the actual app.
Label local live validation separately from production validation; record an unknown
deployed revision honestly. Use mocks for deterministic checks and obtain the task's
required live evidence only within its authorized scope.

Present a short acceptance PDF with representative screenshots embedded beside the
claim they support: actual desktop/mobile viewports, the full Tutor/Artifact layout,
and materially different loading, empty, error/retry, loaded, and persisted states.
Honor an explicitly narrower device/environment scope. Include the claim, device,
actual dimensions, tested revision, and environment in captions. A screenshot of a
standalone artifact proves only that preview; resizing a capture cannot establish
another device's behavior. Choose representative samples instead of repeated pages.
Link complete raw screenshots, traces, JSON, and native chat PDFs separately; keep
full chats out of the short review PDF. Use the task's requested page limit.

Finish only when the scoped evidence matrix is complete or the remaining gap is
explicitly marked blocked/unverified. Report required checks and material limitations.

When changing agent guidance or skills, run `python3 .agents/check_links.py` from
the repository root. Confirm the intended skill version in the actual checkout;
explicitly reread revised procedures in existing sessions before relying on them.

If the user corrected a recurring behavior during this task, close with one proposed
learning record: correction → triggering situation → existing rule/load evidence →
root cause → smallest intervention → replay case/result. Reference the task's existing
artifacts rather than duplicate them. Propose a scoped rule after two independent
recurrences, or a regression check after one costly deterministic defect; do not
silently promote taste or run settings into permanent instructions. Track repeated
correction turns and first-review acceptance over the next ten comparable tasks.
