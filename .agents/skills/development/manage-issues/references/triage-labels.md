# Triage Labels

Map the canonical Matt Pocock triage states directly to these GitHub labels:

| Canonical state | GitHub label | Meaning |
| --- | --- | --- |
| `needs-triage` | `needs-triage` | A maintainer still needs to evaluate the issue. |
| `needs-info` | `needs-info` | Progress is waiting on information from the reporter. |
| `ready-for-agent` | `ready-for-agent` | The issue is fully specified and safe for an autonomous coding agent to claim. |
| `ready-for-human` | `ready-for-human` | The issue is understood but requires human judgment, access, or implementation. |
| `wontfix` | `wontfix` | Maintainers deliberately decided not to implement the issue. |

Keep exactly one triage-state label on a triaged issue. Also keep one category label: `bug` or `enhancement`.

Newly imported or unassessed work starts at `needs-triage`. Assign later states from a completed triage outcome rather than the issue title alone.

Change state by removing the previous state label and applying the new one. Reserve `wontfix` for a deliberate decision not to implement; keep low-priority work in an active state.
