---
name: development
description: Route software-development work to the smallest applicable repository skill. Use when selecting a workflow for discovery, planning, implementation, testing, diagnosis, review, research, issue management, architecture, prototyping, merge conflicts, handoffs, or skill authoring.
---

# Development

Select the smallest skill that fully covers the request. Read that skill's `SKILL.md` completely before acting, then follow it as the active workflow. Combine skills only when the work genuinely spans distinct workflows.

Child skills are explicit-only to keep their metadata out of baseline context. Route through the file links below rather than depending on implicit child invocation.

## Core flow

For an idea that needs to become shipped work, use only the unsettled portion of this flow:

`grilling → to-spec → to-tickets → implement`

- Start with [grilling](grilling/SKILL.md) when the idea or decision needs pressure-testing.
- Use [to-spec](to-spec/SKILL.md) to synthesize an already-settled discussion into a specification.
- Use [to-tickets](to-tickets/SKILL.md) when the work needs ordered, independently executable tickets.
- Use [implement](implement/SKILL.md) for a specification or ticket. It applies [TDD](tdd/SKILL.md) and finishes with [code review](code-review/SKILL.md).

Skip phases whose outputs already exist. Keep discovery through ticket creation in one context when practical; start each implementation ticket with fresh context.

## Route by intent

| Intent | Skill |
| --- | --- |
| Stress-test an idea or decision | [grilling](grilling/SKILL.md) |
| Convert the current discussion into a specification | [to-spec](to-spec/SKILL.md) |
| Split a plan into ordered tickets | [to-tickets](to-tickets/SKILL.md) |
| Implement a specification or ticket | [implement](implement/SKILL.md) |
| Build or fix behavior test-first | [tdd](tdd/SKILL.md) |
| Diagnose a hard bug, regression, flake, or performance problem | [diagnosing-bugs](diagnosing-bugs/SKILL.md) |
| Review a diff against standards and its specification | [code-review](code-review/SKILL.md) |
| Explain code or a diff as an interactive HTML artifact | [explain-code](explain-code/SKILL.md) |
| Design a deep module or interface boundary | [codebase-design](codebase-design/SKILL.md) |
| Survey the codebase for architecture improvements | [improve-codebase-architecture](improve-codebase-architecture/SKILL.md) |
| Prototype one uncertain design decision | [prototype](prototype/SKILL.md) |
| Research primary sources and preserve findings | [research](research/SKILL.md) |
| Resolve an active merge or rebase conflict | [resolving-merge-conflicts](resolving-merge-conflicts/SKILL.md) |
| Manage GitHub issues | [manage-issues](manage-issues/SKILL.md) |
| Triage incoming issues or external pull requests | [triage](triage/SKILL.md) |
| Map a large, uncertain, multi-session effort | [wayfinder](wayfinder/SKILL.md) |
| Preserve context for a fresh session | [handoff](handoff/SKILL.md) |
| Re-explain a message that did not land | [wait-what](wait-what/SKILL.md) |
| Review an integrated Tutor teaching artifact | [expanded-learning-experience-review](../expanded-learning-experience-review/SKILL.md) |
| Run approved student simulations | [agentic-evaluations](../agentic-evaluations/SKILL.md) (manual invocation and case approval required) |
| Create or edit a skill or other agent-facing instruction | [writing-for-agents](../writing-for-agents/SKILL.md) |

Use `wayfinder → to-spec → to-tickets → implement` when an effort is too large or uncertain to specify directly. Use `triage → implement` for raw incoming work; tickets created by `to-tickets` are already implementation-ready.

## Apply the route

1. Read the selected child skill completely and load only the referenced material required for the task.
2. State which child skill is active and why.
3. Follow its workflow until completion or until the request materially changes.
4. Route again when the task changes. If no child skill fits, proceed normally instead of forcing one.
