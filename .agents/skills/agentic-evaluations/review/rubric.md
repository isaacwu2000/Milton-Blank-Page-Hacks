# Reviewer rubric, version 2

Load after student simulation is finished. Judge visible behavior, not assumed intent. Every result needs turn/screenshot/UI references. Only confirmed observations count. Subtle facts the reviewer cannot reliably establish are unable to verify, not automatically correct. Typos, laziness, or a confidently incorrect student are scenario behavior, not product defects.

## Result rules

Binary: one eligible check, 1/1 pass or 0/1 fail. Rate: x/y observed successful events from a written opportunity ledger. Non-applicable: the triggering event never occurred. Unable to verify: applicable but evidence is missing, ambiguous, or inaccessible. Attach the reason for exclusions. Interrupted or blocked cases remain visible but are excluded from primary rates. Keep complete first attempts separate from retries.

Required binary checks roll up to one case/category result. An observed failure makes the category fail. Otherwise any unknown required check prevents a confirmed pass. A category with only rate checks has no binary category score; show its event counts separately. Subject summaries use one case outcome across required binary checks. Training and held-out outcomes remain separate. These provisional scores are reviewer judgments, not demonstrated student learning gains.

## Visuals (highest priority)

- `visual-created` (binary): At the case's specified visual opportunity, the Tutor publishes the appropriate real graph/diagram/interactive Artifact and makes it accessible. A promised graph, prose pretending to be a graph, or a failed generation is failure. Use the case-specific requirement; not every message needs a visual.
- `visual-correct` (binary): Visible axes, labels, givens, objects, and relationships support the lesson. Check obvious sign errors, incorrect intersections, wrong angle relationships, misleading ranges, and contradictions with the Tutor's explanation. Mark unverified mathematical subtleties unknown. Geometry must actually depict the stated givens; appearance alone cannot establish a theorem.
- `visual-interaction` (binary): Exercise each meaningful primary control type present, including a changed state and return/reset when available. The observed response matches its label and lesson. Dead controls or unchanged state where change is required fail. Static visuals with no requested interaction are not applicable.
- `tool-route` (binary): Check visible tool labels/details against the case's expected graph/geometry method. Correct synthetic 2D geometry route must be visibly distinguishable from ordinary coordinate plotting to confirm this check. A graph with no visible mode evidence is unable to verify. Never inspect hidden logs or source to fill the gap.

## Diagnosis and learning level

- `diagnosis` (binary): Before substantial teaching or independent practice, the Tutor elicits or uses specific student work that distinguishes the scripted misconception from a missing prerequisite. Merely asking 'do you understand?' does not pass. A brief relevant explanation before a diagnostic is allowed. A learner's explicit claim of a familiar prerequisite can support provisional initial level 1; it does not prove higher capability.
- `practice-level` (binary): After diagnosis, the next independent exercise falls within the case's stated prerequisite/difficulty envelope, addresses the actual gap, and has enough givens to be solvable. Unexplained advanced notation, excessive jumps, or repeatedly trivial work after demonstrated competence fail.
- `struggle-response` (rate): Eligible events are explicit confusion, incorrect reasoning, repeated failure, or idk. Success means the next Tutor response addresses the specific gap with a useful hint, simpler example, relevant prerequisite review, or a diagnostic that resolves which support is needed. Repeating the same explanation, praising a wrong answer, giving another equally difficult problem, or skipping the gap fails. One careless slip need not trigger a full prerequisite lesson.
- `independent-check` (binary): After explaining or repairing the central misconception, the Tutor gives the student an opportunity to apply it independently to a different example before claiming mastery. Merely having the student echo a definition or finish heavily scaffolded steps does not pass.
- `content-correct` (binary): Visible worked steps, feedback, and claims contain no obvious mathematical/scientific errors or contradictions. Check whether the Tutor falsely endorses the student's scripted error. Any clearly consequential false claim fails; unresolved subtle correctness becomes unknown. Do not invent a reference solution or inspect private sources.

## Exam preparation

Create/update actions are proposals until student confirmation; preserve this distinction.

- `plan-initial` (binary): For the sustained exam goal, the Tutor offers a plan with correct subject/scope/deadline and concepts. Initial level 1 can use an explicit learner claim such as 'I can plot', with a visible rationale. Do not require a diagnostic for every claimed familiar prerequisite. Higher initial levels need evidence appropriate to the claimed capability. The student can review/edit the proposal; saved state matches the accepted fields.
- `prep-proposals` (rate): Count eligible events: changed exam scope/deadline; material diagnosis/practice/review requiring a last-studied change; sufficiently repeated independent demonstrations supporting mastery change; capability gaps/repeated failures supporting correction; completed or obsolete next steps. Count one logical required change once while it remains outstanding. A same-day same-value last-studied date requires no redundant proposal. Ordinary questions/greetings and correct work that does not meet mastery thresholds are not opportunities. Success means the appropriate correct proposal appears by the next natural study break, with evidence-supported values. Level 1 means remembering or reproducing a familiar pattern. Two distinct successful examples can support level 1, including assisted reproduction when the student supplies a meaningful answer. Do not impose higher-level independence or novelty requirements on level 1. Levels 2–6 normally need three varied substantially independent demonstrations (two with explicit time/coverage constraints); one multipart exercise in one context counts once. Fully supplied answers do not establish student capability.
- `prep-saved` (rate): Denominator is correct proposals the student accepted. Success means inspection of the saved plan shows the accepted state; a card alone is insufficient. Incorrect student-approved proposals are counted under incorrect proposals, not successful persistence opportunities.
- `proposal-validity` (rate): Denominator is all observed proposed changes. Success means each is necessary, correct, consistent with scope/deadline, and grounded in evidence appropriate to the proposed level, including permitted self-report for initial level 1. Record the incorrect/unnecessary count (y-x) and examples. This captures over-updating as well as missed updates.
- `continuity` (binary): Multi-session only. A new Study Session retrieves the same plan, preserves confirmed state, and uses prior demonstrated understanding and remaining gaps without treating a return as automatic mastery. Inspect actual saved state and both sessions. Same-day testing cannot verify elapsed-day semantics or spaced retention.

## Concision

- `concise` (rate): Denominator is Tutor messages with captured complete prose where the student did not explicitly request a longer answer. Success is at most 600 whitespace-delimited words of visible prose, excluding tool UI and Artifact contents. Report counts and the worst overrun. Shortness alone is not teaching quality. Never impose this limit on chat exports.

## Evidence and findings

Every case has the 15 common checks above plus `case-focus` from its reviewer case file. Rates require a per-event ledger (turn, eligibility, expected outcome, actual outcome, success). Native math/visual screenshots supplement full text. Record exact visible tool observations. Lack of visibility is unknown, not failure. Capture gaps and bot-control/approval errors belong in operational notes. The short report names concrete issues, preserves successful behaviors, and distinguishes one-off observations from recurrence across independent cases.

## Calibration decisions

User clarification on October 3, 2026: initial level 1 can use learner self-report; a later level-1 increase can use two examples with lower independence demands. Apply these evaluation criteria even where the local Tutor prompt uses a stricter blanket threshold. Record a prompt/criterion mismatch separately; do not treat it as a Tutor failure under these criteria. This is a rubric revision, not a new production run.
