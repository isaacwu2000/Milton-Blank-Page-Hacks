# Repository context contract

Run shared workflows in the receiving repository, with paths resolved from its
root. Relative Markdown links within the shared skill tree resolve from the file
containing the link. Shared skills supply workflow; the repo supplies local facts
and policy. Follow the user's scope and the environment's governing instructions.

Start with the receiving repository's `AGENTS.md` and any applicable nested
instructions. Load only the context relevant to the task:

| Need | LearnUnlock convention | Repository owns |
| --- | --- | --- |
| Product and domain | `.agents/context/PRODUCT.md`, `CONTEXT.md` | Users, vocabulary, architecture, constraints |
| Implementation | `.agents/context/CODING_STANDARDS.md` | Language, package manager, boundaries, conventions |
| Verification | `.agents/context/TESTING.md` | Commands, environments, shared state, live checks |
| Design | Shared Impeccable or a repo-selected design skill, plus repo-owned design sources | Visual identity, components, UI workflow |
| Delivery | `.agents/context/DEPLOY.md` | Targets, deployment procedure, production acceptance |
| Workflow extensions | `.agents/context/WORKFLOW.md` or AGENTS.md pointers | Local skills, task-specific workflow and acceptance specializations |
| Coordination | `.agents/context/ISSUE_TRACKER.md` | Tracker, project, tools, labels, claims, dependencies |

These filenames are conventions, not required empty files. Where a workflow names
one of them, follow the equivalent source identified by the repo, including for historical hardcoded path mentions in these extracted skills. If none exists,
inspect the relevant configuration and ask only for material missing decisions.
A missing deployment document does not imply permission to deploy.

Repository-specific skills extend this router through the repo's `AGENTS.md`;
keep them outside the shared folders. A local policy may specialize a shared
workflow without editing its shared copy. Shared updates should preserve that
separation. The [coding-harness adapter](../../coding-harness/SKILL.md) owns explicit
adoption and updates; its manifest records which skill files it manages.

Use tools actually available in the environment. `/skill-name` means load that
workflow; it does not assume a literal slash command exists. Delegate when the
workflow calls for it and delegation is supported and authorized; otherwise work
sequentially and state any material limit on independence or coverage.
