# GitHub Issue Tracker

Issues for this repository live in GitHub Issues. Resolve the repository from `git remote -v`; inside the clone, `gh` normally resolves it automatically. Keep the operation on that resolved repository.

## Core operations

- List: `gh issue list --state all --limit 100 --json number,title,body,state,labels,url`
- Read: `gh issue view <number> --comments`
- Create: `gh issue create --title "<title>" --body-file <path> --label "<label>"`
- Edit: `gh issue edit <number> --title "<title>" --body-file <path>`
- Comment: `gh issue comment <number> --body-file <path>`
- Label: `gh issue edit <number> --add-label "<label>"` or `--remove-label "<label>"`
- Close: `gh issue close <number> --comment "<reason>"`
- Reopen: `gh issue reopen <number>`

Inspect existing labels with `gh label list`. Create missing required labels with `gh label create`. Preserve unrelated labels.

Use temporary files under `/tmp` for multiline bodies and remove them after the command completes. Publish only sanitized content: exclude secrets, tokens, private logs, and identifiable student data.

## Pull requests

The normal triage queue contains issues. Handle an explicitly named pull request with the matching `gh pr` commands.

GitHub shares one number space across issues and pull requests. If a bare number is ambiguous, try `gh issue view <number>` and `gh pr view <number>` to identify its type.

## Relationships

Prefer GitHub sub-issues and native issue dependencies when a workflow needs parent-child or blocking relationships. If the repository does not support them, record `Part of #<number>` and `Blocked by: #<number>` in issue bodies.

For a native dependency, obtain the blocker's numeric database ID with `gh api repos/<owner>/<repo>/issues/<number> --jq .id`; this is not the visible issue number or GraphQL node ID.

## Wayfinding operations

- **Map:** Create one issue labeled `wayfinder:map`. Its body contains Notes, Decisions so far, and Fog.
- **Child ticket:** Link each ticket to the map as a GitHub sub-issue. When sub-issues are unavailable, add the child to a task list in the map and put `Part of #<map>` in the child body.
- **Ticket type:** Apply one `wayfinder:<type>` label: `research`, `prototype`, `grilling`, or `task`.
- **Blocking:** Add a native dependency with `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-database-id>`. When native dependencies are unavailable, put `Blocked by: #<number>` in the child body.
- **Frontier:** List the map's open children, preserve map order, and exclude assigned issues and issues with open blockers. The first remaining child is the frontier.
- **Claim:** Run `gh issue edit <number> --add-assignee @me` before starting work.
- **Resolve:** Comment with the answer, close the child, and append a brief linked decision to the map's Decisions-so-far section.
