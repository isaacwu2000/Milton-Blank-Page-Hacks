# Pedagogy quality

Evaluate whether the complete Tutor session helps this learner construct, test, and extend
an accurate knowledge model. Review chat, Artifact references, whiteboard states,
manipulation, feedback, and follow-up as one learning experience. Do not reward a strong
chat explanation for compensating for a misleading artifact, or a polished artifact for
replacing the reasoning that belongs in chat.

## Contents

1. [Scoring method](#scoring-method)
2. [Cognitive load and instructional focus](#1-cognitive-load-and-instructional-focus)
3. [Exploration and guidance strategy](#2-exploration-and-guidance-strategy)
4. [Learner calibration and adaptation](#3-learner-calibration-and-adaptation)
5. [Intellectual demand and higher-order thinking](#4-intellectual-demand-and-higher-order-thinking)
6. [Explanation and knowledge construction](#5-explanation-and-knowledge-construction)
7. [Understanding checks and feedback](#6-understanding-checks-and-feedback)
8. [Direction, pacing, and progression](#7-direction-pacing-and-progression)
9. [Appropriate representation and medium](#8-appropriate-representation-and-medium)
10. [Visual knowledge-model clarity](#9-visual-knowledge-model-clarity)
11. [Interaction and exploration gain](#10-interaction-and-exploration-gain)
12. [Artifact–chat instructional integration](#11-artifactchat-instructional-integration)
13. [Artifact-family execution](#12-artifact-family-execution)

## Scoring method

Score each applicable Likert dimension from `1` to `5` using the complete rubric. Assign
the highest level whose description is substantially satisfied. A prominent lower-level
defect caps the score even when isolated details resemble a higher level.

Calculate points using the shared [scoring rules](scoring.md).

- `1` represents teaching that actively obstructs or misdirects learning.
- `3` represents competent teaching appropriate to the learner and task.
- `5` represents exemplary teaching: unusually economical, adaptive, and generative.
- Use `N/A` only when a dimension genuinely does not apply.
- Use `Unknown` when the session contains insufficient evidence. Do not convert `Unknown`
  to a neutral score.

The binaries name concrete requirements that can be checked directly. Record every failed
binary and use the associated Likert rubric to judge the dimension as a whole. Avoid
double-counting: for example, one redundant paragraph can inform cognitive load and
artifact–chat integration, but it remains one underlying defect.

Judge against the learner evidence available inside the current session. Durable learner
memory is not implemented yet, so do not penalize the Tutor for lacking longitudinal
knowledge. Keep longitudinal direction and continuity in this evaluation for later use;
mark them `N/A` until the product exposes the required evidence.

## 1. Cognitive load and instructional focus

Evaluate whether the Tutor directs limited attention toward the mental work that builds
the intended knowledge model. Manage intrinsic load by sequencing and representation;
minimize extraneous load from prose, interface, notation, gaze switching, and irrelevant
choices; maximize germane load by making the learner compare, predict, manipulate,
explain, or connect the relationship that matters.

Visible simplicity is not the same as conceptual emptiness. A technically sophisticated
artifact may be the simplest teaching surface. Removing the labels, transitions, or
comparison that make the mechanism intelligible is not successful reduction.

### Binary checks

- The Tutor turn has one clear instructional focus. If the learner asks about several
  concepts, it begins with the most foundational one and makes the intended progression
  clear.
- The response introduces no more than five potentially unfamiliar terms, and every term
  needed immediately is introduced in language the learner can understand.
- Every sentence contributes meaning, precision, structure, operating guidance, or a
  necessary qualification; no filler, ceremonial praise, redundant recap, or irrelevant
  background remains.
- The response uses at most one learner question at a time.
- The representation contains the minimum information needed to infer the target
  relationship; it is neither overloaded nor stripped of its teaching mechanism.
- Controls, labels, legends, animation, decorative detail, and visible prose earn their
  attention by helping the current inference.
- A broad exploratory state presents a simpler gist; a focused state may reveal more
  relevant detail without retaining irrelevant overview complexity.
- Progressive disclosure introduces meaningful specificity while preserving the context
  needed to understand each reveal.
- Related labels, values, definitions, and controls remain near or visibly connected to
  their referents, avoiding avoidable mental matching.
- After initial operating instructions, the learner can remain with the artifact long
  enough to understand its message without repeatedly searching chat.
- Multiple representations appear together only when direct comparison is the lesson;
  otherwise the Tutor establishes one before introducing another.

### Likert rubric: cognitive-load management

#### 1 — Obstructive

The experience overwhelms or starves the learner. It introduces many concepts or unknown
terms at once, buries the point in prose or controls, requires repeated chat–artifact gaze
switching, or removes information essential to the intended inference. Most learner effort
goes toward decoding the presentation rather than understanding the subject.

#### 2 — Weak

A teachable idea is present, but avoidable load competes with it. The Tutor may sequence
roughly, yet includes repeated explanations, detached labels, excessive choices, unclear
progressive disclosure, or several representations before one is secure. Simplification
looks cosmetic rather than based on the learner's mental task.

#### 3 — Competent

The response maintains a clear focus, uses understandable language, and gives the learner
a manageable amount to process. The artifact and chat generally divide work sensibly.
Some phrasing, interface detail, or representational translation could be removed or
recomposed, but the learner's main effort still advances the target knowledge model.

#### 4 — Strong

The experience carefully budgets attention. Intrinsic complexity is sequenced into useful
phases, extraneous text and interface work are quiet, and the remaining effort is directed
toward comparison, prediction, manipulation, or explanation. Overview and focus states
change density intelligently, and progressive disclosure adds depth without disorientation.

#### 5 — Exemplary

The lesson feels simple because every representational and verbal decision exposes the
right mental operation at the right moment. The learner encounters no avoidable decoding,
navigation, memory, or terminology burden. Yet the model retains all detail necessary for
real insight. Technical complexity disappears behind an exceptionally economical path
from attention to intuition to understanding.

## 2. Exploration and guidance strategy

Evaluate whether the experience chooses an appropriate balance of free exploration,
guided stages, and overview. None is inherently superior. The subject, learner, and
instructional objective determine the right structure.

Free exploration can build orientation, curiosity, and a felt sense of a broad spatial or
thematic system. A solar-system model, for example, may invite open movement because the
experience of scale and space is part of both the teaching and the art. Guided stages are
often stronger for dependent professional procedures, proofs, transformations, and focused
mechanisms. A coding workflow may first show the complete production flow, then focus one
step at a time while preserving the learner's place in the whole.

### Binary checks

- The chosen exploration structure matches the learning objective rather than a generic
  interface pattern.
- The learner can identify an initial action or point of attention without reading a
  permanent instruction panel.
- Free exploration has discoverable relationships and a likely educational takeaway; it
  is not activity without purpose.
- Guided stages preserve enough whole-system context that the learner knows where the
  current step belongs.
- A hybrid experience makes the transition among overview, exploration, and focus clear
  and reversible when returning to context matters.
- The learner controls pace when inspecting intermediate states, spatial relationships,
  or transformations benefits understanding.
- Guidance does not reduce the learner to repeatedly pressing “Next” without predicting,
  comparing, manipulating, or reasoning.
- Exploration does not expose so many objects, controls, or details that the learner must
  design the lesson unaided.
- The experience permits subject-appropriate beauty, atmosphere, and curiosity when they
  reinforce attention and memory without obscuring the knowledge model.

### Likert rubric: exploration and guidance

#### 1 — Fundamentally mismatched

The interaction structure works against the subject or learner. An open world provides no
discoverable lesson, a rigid stepper hides the system it is meant to explain, or the
learner is forced through controls without meaningful thought. Orientation and agency are
both lost.

#### 2 — Weak

The mode is plausible but under-designed. Free exploration offers interesting movement
with an uncertain takeaway, guided stages fragment the whole, or a hybrid shifts state
without preserving context. The learner can proceed, but must supply too much direction
or receives too little agency.

#### 3 — Competent

The balance of exploration and guidance fits the broad objective. The learner can orient,
act meaningfully, and understand where focused material belongs. The structure may remain
conventional or miss opportunities for richer discovery, clearer overview, or more useful
learner control.

#### 4 — Strong

The experience uses exploration, guidance, or a hybrid deliberately for this subject.
Freedom exposes relationships worth discovering; stages clarify real dependencies; and
overview, focus, pace, and return preserve orientation. The learner receives enough
direction to learn and enough agency to form their own intuition.

#### 5 — Exemplary

The interaction structure feels inseparable from the subject. Exploration creates a
memorable sense of the field, guided attention arrives exactly when complexity requires
it, and transitions between whole and detail deepen rather than interrupt understanding.
The learner's curiosity and the instructional path reinforce one another without excess
controls or visible pedagogical machinery.

## 3. Learner calibration and adaptation

Evaluate whether the Tutor uses evidence from the learner's language, questions,
solutions, errors, omissions, and response behavior to choose the next representation,
abstraction level, and amount of support. Adaptation changes the teaching move; merely
restating the same explanation with more words is not adaptation.

When evidence is sparse, begin with a novice-legible model and diagnose efficiently. Do
not invent a learner profile. A casual question deserves conversational depth; a technical
question, demonstrated method, or sophisticated objection is evidence that greater depth
may be appropriate.

### Binary checks

- The assumed level is supported by evidence in the current session or is explicitly a
  cautious starting assumption.
- Difficulty, abstraction, vocabulary, explanation length, and artifact density match the
  learner's demonstrated readiness.
- The Tutor responds to the learner's actual reasoning, including the specific correct
  idea, error, gap, or misconception, rather than giving a stock answer.
- When understanding is uncertain, the Tutor uses one efficient diagnostic or a
  novice-legible starting model rather than front-loading every possible prerequisite.
- After demonstrated understanding, the Tutor reduces scaffolding or increases the
  relational, transfer, proof, evaluation, or synthesis demand.
- After a struggle or non-answer, the Tutor lowers the response burden and changes the
  representation: a concrete example, smaller case, visual relation, partial step, or
  simpler setting.
- If struggle continues, the Tutor identifies the narrow missing prerequisite and helps
  restore it before returning to the main idea.
- The Tutor does not interpret silence or a non-answer as proof of one specific
  misconception; it offers a useful way back into the reasoning.
- The Tutor states errors directly and humanly, without sycophancy, humiliation, robotic
  reassurance, or praise unrelated to the learner's reasoning.
- Adaptation preserves forward motion rather than trapping the learner indefinitely at a
  remedial level.

### Likert rubric: adaptive calibration

#### 1 — Mismatched

The Tutor teaches to an invented or plainly wrong learner level. It ignores demonstrated
knowledge or difficulty, responds generically to reasoning, repeats failed explanations,
or jumps to an unsupported misconception. The learner is either overwhelmed, patronized,
or left without an entry point.

#### 2 — Weak

The Tutor notices broad signals but adapts crudely. It may make the task merely easier or
harder, add more explanation without changing representation, overreact to one answer, or
keep advanced and struggling learners on nearly the same path. Support and challenge are
only loosely connected to evidence.

#### 3 — Competent

The level is reasonable for the session evidence. The Tutor gives simpler examples when
the learner struggles and greater challenge after success. Feedback addresses the main
reasoning, though diagnosis may remain broad, transitions may lag one turn, or scaffolding
may not be withdrawn as precisely as it could be.

#### 4 — Strong

The Tutor reads learner evidence accurately and changes representation, granularity,
vocabulary, and challenge in response. It distinguishes a missing prerequisite from a
local slip, supports re-entry after non-answers, removes scaffolding after mastery, and
keeps the learner moving without making adaptation feel like a test protocol.

#### 5 — Exemplary

Every instructional move feels fitted to the learner's present edge of understanding.
The Tutor diagnoses with minimal interruption, chooses the smallest effective scaffold,
and turns learner reasoning into the next explanation or challenge. Support disappears as
soon as it has done its work; challenge rises without abruptness; and even recovery from
confusion strengthens the learner's agency and model of the subject.

## 4. Intellectual demand and higher-order thinking

Evaluate whether challenge develops the learner's knowledge rather than merely increasing
surface difficulty. Higher-order work includes transferring a principle to a genuinely
novel setting, analyzing relationships and assumptions, deriving or proving from first
principles, comparing knowledge models, making evidence-based judgments, and synthesizing
or researching new ideas.

Novelty must be relevant and tractable. An Olympiad-style problem is valuable when it
requires an illuminating conceptual leap appropriate to the learner; obscure tricks,
larger numbers, and arbitrary complication do not count as higher-order thinking.

### Binary checks

- Challenge follows evidence that the learner is ready for it.
- The task demands the intended kind of thought rather than recall disguised by difficult
  wording or routine work with larger inputs.
- A novel application preserves the concept's essential structure while changing enough
  surface features to require transfer.
- Analysis prompts the learner to identify relationships, assumptions, causes,
  invariants, evidence, or limits.
- Proof or derivation prompts are feasible from established knowledge and do not depend
  on an unexplained trick.
- Subjective evaluation names or makes inferable the criteria and evidence needed for a
  reasoned judgment.
- Synthesis or research asks for a defensible new model, connection, question, or
  investigation rather than ungrounded creativity.
- Advanced challenge deepens the topic rather than abandoning it for a disconnected hard
  problem.
- The Tutor supplies enough orientation for productive struggle without performing the
  core intellectual work in advance.

### Likert rubric: intellectual demand

#### 1 — Hollow or inappropriate

The task is trivial for the learner, impossibly advanced without scaffolding, or difficult
only through obscurity and volume. It rewards recall, guessing, or trick recognition while
claiming to promote analysis or synthesis.

#### 2 — Weak

The Tutor attempts challenge, but it is generic or poorly calibrated. A “real-world
example” changes only names, an analysis question has an obvious one-line answer, or a
proof request lacks the prerequisites needed for productive reasoning.

#### 3 — Competent

The learner receives an appropriate application, relational question, proof step,
comparison, or evaluation. The task requires genuine thought and fits established
knowledge, though novelty, criteria, or conceptual payoff may be conventional.

#### 4 — Strong

Challenge targets the learner's next intellectual frontier. The task requires meaningful
transfer, first-principles reasoning, model comparison, evidence-based evaluation, or
synthesis while preserving a clear relationship to the lesson. Scaffolding supports the
entry point but leaves the central insight to the learner.

#### 5 — Exemplary

The Tutor creates a strikingly apt challenge that reorganizes the learner's understanding.
Its novelty exposes deep structure rather than a trick; multiple ideas must be related
without creating needless load; and the learner is positioned to derive, judge, or create
something they could not have produced through routine practice. The task has the elegance
of an excellent research question, proof problem, or conceptual experiment.

## 5. Explanation and knowledge construction

Evaluate whether explanations help the learner build a usable model: what the idea means,
why it works, how its parts connect, and how someone could think of the important step.
Conciseness should compress wording, not omit the causal, logical, or relational bridge
the learner needs.

### Binary checks

- The Tutor determines one exact explanatory point and maintains it throughout the turn.
- Terminology follows a plain-language introduction or connects to language the learner
  has already demonstrated.
- Important non-trivial steps receive intuition or justification; routine steps do not
  receive distracting commentary.
- The explanation answers “How could I think of that?” when a leap, strategy, or model
  choice would otherwise appear magical.
- New information connects to relevant established knowledge and invites the learner to
  make that connection when productive.
- Concrete examples, analogies, or simplified cases preserve the relevant structure and
  do not introduce a misleading mapping.
- The correct model leads. Misconceptions appear only when the learner shows one or when
  an almost-universal misconception must be displaced to establish the correct model.
- Formal reasoning, qualifications, and limitations extend the intuition at the right
  time rather than interrupting it or repairing a false visual.
- The explanation uses direct, natural language and does not hide reasoning behind jargon,
  vague abstraction, or unsupported authority.
- If the learner asks for a complete solution, the Tutor gives it while keeping the
  reasoning legible.

### Likert rubric: explanatory knowledge construction

#### 1 — Incoherent

The explanation states conclusions without usable reasoning, relies on undefined terms,
skips decisive steps, or uses an analogy or simplification that produces a false model.
The learner could repeat words but not reconstruct the idea.

#### 2 — Weak

The explanation is mostly correct but procedural or fragmented. It may give an example
without exposing the relationship, explain every step at the same weight, introduce
terminology before intuition, or leave the central leap as “obvious.”

#### 3 — Competent

The Tutor explains the main idea clearly, justifies important steps, and uses an example
or connection suited to the learner. The resulting model is usable, though the origin of
the strategy, relation between parts, or bridge from intuition to rigor may remain
ordinary or slightly incomplete.

#### 4 — Strong

The explanation reveals why the idea is natural. It selects one productive representation,
connects it to prior knowledge, gives intuition for non-trivial moves, and adds rigor or
qualification without breaking the learner's mental thread. The learner can plausibly
reconstruct and use the reasoning elsewhere.

#### 5 — Exemplary

The explanation changes how the learner sees the subject with exceptional economy. Each
sentence exposes structure, motivates the next move, or connects intuition to formal
reasoning. The learner gains both the idea and a transferable way to think of it; no term,
example, or intermediate step could be removed or replaced without weakening that model.

## 6. Understanding checks and feedback

Evaluate whether the Tutor gathers useful evidence of understanding without turning the
session into an interrogation. Every meaningful introduction of new material should
eventually produce evidence that the learner can use it, explain it, predict with it, or
connect it. This evidence need not come from a question in every turn: later advanced work
may test prerequisites while extending the lesson.

### Binary checks

- The Tutor asks a question only when an answer will inform learning or advance the
  learner's reasoning.
- An educational response ends with exactly one targeted, open-ended application question
  when doing so advances learning; it asks no question when direct explanation or the
  learner's requested solution is the better next move.
- The Tutor never substitutes “Does that make sense?” or self-reported confidence for
  evidence of understanding.
- The question tests the concept at the learner's current level rather than a peripheral
  fact, wording trick, or unintroduced extension.
- A question that assumes an artifact experiment is preceded by a clear instruction to
  perform that experiment.
- The Tutor does not claim to know which artifact state the learner selected or reached
  unless the learner reports it.
- Feedback identifies the reasoning that succeeded or failed and supplies the smallest
  useful correction, explanation, or next prompt.
- Praise, when present, names a real feature of the learner's reasoning and does not
  replace feedback.
- Once the learner demonstrates the concept, the Tutor advances rather than testing a
  long tail of edge cases.
- A more advanced task tests prerequisites naturally when it can do so without obscuring
  its new purpose.

### Likert rubric: understanding checks and feedback

#### 1 — Counterproductive

Questions are absent when misunderstanding remains central, unrelated to the teaching,
stacked several at once, or used after every sentence as ritual. Feedback is generic,
incorrectly assumes artifact behavior, reveals no diagnosis, or rewards the learner
regardless of reasoning.

#### 2 — Weak

The Tutor checks recall or asks a broadly relevant question, but the result provides
little evidence of the target understanding. Feedback labels answers right or wrong
without isolating why, or repeated checks slow the lesson after the concept is already
secure.

#### 3 — Competent

The Tutor uses one appropriately leveled application or explanation prompt when useful
and responds to the main reasoning. The check gives credible evidence of understanding,
though it may be conventional, slightly over-scaffolded, or less diagnostic than it could
be.

#### 4 — Strong

The check is economical and revealing: a prediction, transfer, explanation, comparison,
or next step exposes the learner's model rather than their memory alone. Feedback pinpoints
the operative idea, gives only the support needed, and converts the answer into the next
instructional move without extending assessment unnecessarily.

#### 5 — Exemplary

Assessment is nearly invisible from teaching. One carefully chosen task simultaneously
consolidates the new idea, reveals the learner's reasoning, and opens the next layer.
Feedback makes the consequence of that reasoning immediately clear and preserves learner
ownership. The Tutor knows exactly when to probe, when to explain, and when mastery is
sufficient to move on.

## 7. Direction, pacing, and progression

Evaluate whether the Tutor acts as a teacher with a coherent path rather than waiting for
the learner to design the curriculum. Direction means selecting and communicating the
next useful move, maintaining momentum, returning from prerequisite repair, and closing
or extending a line of inquiry at the right time. It does not mean rushing, forcing
questions, or ignoring the learner's explicit request.

Current reviews judge direction across the available session. Future learner memory
should add longitudinal continuity: resuming established goals, recalling mastered
prerequisites, spacing useful retrieval, and avoiding unnecessary reteaching. Until that
system exists, mark those longitudinal checks `N/A` rather than inferring them.

### Binary checks

- The Tutor identifies the most foundational unresolved concept and begins there when the
  request spans several ideas.
- It communicates the immediate path when a topic has several layers, without dumping a
  full syllabus into the response.
- It selects the next useful concept, representation, experiment, or problem rather than
  routinely asking the learner what they want to do next.
- It moves through topics briskly enough to preserve momentum while giving the learner
  time to process and demonstrate central understanding.
- Once understanding is demonstrated, it advances, increases depth, connects ideas, or
  closes the topic instead of repeating variants and edge cases.
- After a detour to repair a prerequisite, it explicitly or naturally returns to the main
  learning path.
- The Tutor uses learner questions and interests as evidence for direction without
  surrendering all instructional responsibility.
- It follows explicit user instructions, including a request for a complete solution,
  even when a different pedagogical path would otherwise be preferred.
- A suggested experiment, next step, or future topic is concrete enough for the learner
  to act on and relevant to the current objective.
- The session does not end in a generic offer such as “What would you like to explore
  next?” when a clear instructional move is available.
- Future: direction uses durable learner goals and mastery evidence accurately and avoids
  reteaching already established knowledge. Mark `N/A` until supported.

### Likert rubric: direction and progression

#### 1 — Aimless or coercive

The Tutor either waits for the learner to construct the path, pushes through material
without regard for understanding, or traps the session in repetitive questioning. The
learner cannot tell what the current destination is or why the next move follows.

#### 2 — Weak

A rough sequence exists, but pacing and transitions are inconsistent. The Tutor may linger
on solved material, abandon the main topic after remediation, list many possible next
steps instead of choosing one, or advance based on schedule rather than learner evidence.

#### 3 — Competent

The Tutor establishes a sensible next step, maintains reasonable momentum, and advances
after central understanding. The path is coherent within the current session, though
transitions, closure, or the balance between learner interest and instructional judgment
may remain generic.

#### 4 — Strong

The Tutor provides confident, proportionate direction. Each move follows from the learning
goal and learner evidence; foundational gaps are repaired without losing the main thread;
and mastery leads promptly to greater depth, transfer, or a well-judged close. The learner
feels momentum without pressure.

#### 5 — Exemplary

The session has the rhythm of an excellent human tutor. Direction is visible enough to
create purpose and quiet enough to preserve curiosity. The Tutor continuously selects the
highest-leverage next move, integrates detours into the larger path, recognizes when a
concept is secure, and leaves the learner both accomplished and clearly oriented toward
what comes next.

## 8. Appropriate representation and medium

Apply this dimension whether or not the Tutor created an artifact. Evaluate the decision
to use prose, calculation, code, Mermaid, an interactive artifact, or another available
medium against the relationship the learner needs to understand. Route by learning
objective, not topic name.

### Binary checks

- The chosen medium teaches the current concept more directly than the reasonable
  alternatives available to the Tutor.
- An artifact is used when interaction, spatial structure, chronology, scale, simulation,
  transformation, or visual proof materially improves understanding.
- The Tutor stays with concise prose, calculation, code, or a simple diagram when an
  artifact would add interface work without new intuition.
- The representation type matches the target relationship: spatial form, duration,
  invariant, quantitative comparison, mechanism, sequence, or geography.
- The artifact is not selected merely because the topic is visual, historical,
  mathematical, or scientific.
- A code artifact is not used as a substitute for rich observational detail when the
  learner principally needs to inspect appearance rather than manipulate a model.
- The chosen scope can communicate one complete instructional point within the current
  turn and real half-pane.

### Likert rubric: representation and medium choice

#### 1 — Wrong medium

The representation obstructs the objective. Interface or visual complexity replaces a
clear verbal explanation, static prose attempts to convey a relationship that requires
spatial or interactive perception, or the artifact type implies the wrong structure.

#### 2 — Weak

The medium can express the idea but does so inefficiently. A simpler option would teach as
well with less load, or a richer available representation would reveal an important
relationship the chosen format leaves abstract.

#### 3 — Competent

The medium fits the objective and communicates the central idea without serious overhead.
Another option might be slightly clearer, more direct, or more engaging, but the choice is
instructionally sound.

#### 4 — Strong

The representation is specifically suited to the relationship. It turns an otherwise
verbal, abstract, or fragmented idea into a direct act of perception or reasoning while
avoiding capabilities the lesson does not need.

#### 5 — Exemplary

The medium choice is revelatory. Form and objective are so well matched that the learner
can understand something difficult through an unusually direct experience, with less
explanation and no unnecessary interaction. A reasonable alternative would materially
weaken the lesson.

## 9. Visual knowledge-model clarity

Apply this dimension when a visual representation is present. Evaluate whether the visual
mechanism itself communicates the intended entities, relationships, states, and change.
This is pedagogical legibility, not cosmetic polish. Truthfulness remains a separate block
requirement.

### Binary checks

- The reviewer can state the visual's central relationship after a brief initial
  inspection.
- The largest, most central, and highest-contrast elements correspond to the most important
  parts of the knowledge model.
- Labels, dimensions, values, definitions, and qualifications appear beside or visibly
  connected to their referents.
- Visual encoding distinguishes meaningful identity, category, state, magnitude,
  uncertainty, or selection without arbitrary decoration.
- Motion reveals continuity, causality, rearrangement, focus, or state change rather than
  merely making the surface feel active.
- The visual shows the mechanism or relationship instead of surrounding it with boxes,
  headings, prose, or controls that merely name it.
- The initial state establishes enough context to interpret later focus or progressive
  disclosure.
- Unknown terms needed for interpretation receive a plain-language label, micro-definition,
  or accessible information disclosure inside the artifact.
- Multiple representations remain explicitly connected when translation among them is
  part of the lesson.
- The visual remains understandable after removing any explanatory prose that simply
  repeats what the representation already makes evident.

### Likert rubric: visual knowledge-model clarity

#### 1 — Opaque

The learner cannot reliably determine what the visual represents or which relationship
matters. Hierarchy, encoding, labels, motion, or layout communicates an accidental or
conflicting model, and explanatory prose must perform nearly all of the teaching.

#### 2 — Weak

The subject is recognizable, but the relationship requires avoidable decoding. Important
labels are detached, visual hierarchy follows layout convenience, motion lacks a clear
meaning, or the display names concepts without exposing how they relate.

#### 3 — Competent

The central entities and relationship are visually legible. Labels, hierarchy, encoding,
and state changes generally support the model. The learner gains useful intuition, though
some translation, prose, or conventional explanation remains necessary.

#### 4 — Strong

The representation makes the target relationship immediately perceptible. Visual
hierarchy tracks conceptual hierarchy; labels and changes remain attached to meaning; and
the learner can inspect the model without decoding an interface around it.

#### 5 — Exemplary

The visual is itself an exceptionally clear act of explanation. Composition, scale,
encoding, proximity, motion, and progressive detail expose the knowledge model with such
precision that a difficult relationship becomes intuitive at a glance and richer under
inspection. Nothing merely labels an idea that could instead be shown.

## 10. Interaction and exploration gain

Apply this dimension to interactive artifacts. Evaluate what the learner can newly
understand by acting. For each interaction, compare the learner's possible inference
before and after the action. Navigation may support learning, but it is meaningful
manipulation only when viewpoint or scale reveals a real part of the knowledge model.

### Binary checks

- The artifact contains at least one meaningful manipulation that exposes a comparison,
  invariant, transformation, causal response, scale, duration, or hidden structure.
- Every control changes the knowledge model or provides necessary precision,
  accessibility, comparison, reset, or navigation.
- Manipulation produces immediate conceptual feedback in the visual, not merely different
  prose or decoration.
- The mapping between learner action and conceptual change is understandable and
  appropriately direct.
- The learner can predict, compare, test, or discover something rather than only reveal a
  predetermined text answer.
- Parameter bounds and available states cover the meaningful conceptual range without
  introducing irrelevant combinations.
- Focus reveals relevant depth and offers a quiet, reversible return when broader context
  remains useful.
- Intermediate states can be paused, scrubbed, or otherwise inspected when they carry the
  explanation.
- Repeated experimentation preserves a stable reference, reset, or before-and-after basis
  when comparison matters.
- Exploration has a discoverable educational takeaway without requiring the Tutor to know
  which local state the learner reached.

### Likert rubric: interaction and exploration gain

#### 1 — Activity without learning

Interaction is decorative, redundant, or conceptually inert. Controls change appearance
or prose without exposing a relationship, navigation substitutes for manipulation, or
the learner can complete the interaction without thinking about the subject.

#### 2 — Weak

An educational variable changes, but the gain is small or unclear. Feedback is delayed or
indirect, controls dominate the model, the useful range is narrow, or the artifact reveals
facts rather than enabling prediction, comparison, or discovery.

#### 3 — Competent

Manipulation exposes a relevant relationship and gives immediate, understandable feedback.
The learner can experiment meaningfully, though the action may be conventional, somewhat
over-controlled, or less revealing than the model permits.

#### 4 — Strong

Interaction produces a distinct learning gain unavailable from passive viewing. The
learner can test predictions, inspect continuity, compare states, or discover an invariant
through a small set of direct, well-bounded actions. Feedback keeps attention on the
subject rather than the controls.

#### 5 — Exemplary

Manipulation becomes a compact conceptual experiment. Each action reveals deep structure
with immediate and elegant feedback; exploration supports both intuitive discovery and
deliberate testing; and the learner leaves with an insight they could not have gained as
directly from text, a static image, or a pre-scripted animation.

## 11. Artifact–chat instructional integration

Apply this dimension when an artifact is present. Evaluate whether adjacent chat, artifact
reference, whiteboard experience, and later Tutor reasoning divide instructional work
according to their strengths.

### Binary checks

- The learning contract is explicit to the reviewer: after minimum framing and
  manipulation **X**, the learner can perceive **Y** and is prepared to infer or
  understand **Z** in chat.
- Chat gives the minimum framing and any operating instruction that would otherwise
  clutter the whiteboard.
- After reading initial instructions, the learner can remain with the artifact while it
  communicates rather than repeatedly searching chat.
- The artifact explains its mechanism through visual form, proximity, labels, motion,
  and feedback rather than a paragraph narrating the obvious.
- Full rigor, extended interpretation, historical or scientific qualification, and
  learner questions remain in chat unless a short label or qualification must stay beside
  its visual referent.
- Chat and artifact complement rather than duplicate one another; neither merely captions
  or restates the other.
- Chat allows time to digest the model before extending its general relationship.
- Chat never claims to observe local interaction state unless the learner reports it.
- A question that assumes an experiment is preceded by an instruction to perform it.
- Each substantial artifact appears in a separate Tutor message when combining artifacts
  would crowd instructions or blur distinct learning contracts.

### Likert rubric: artifact–chat integration

#### 1 — Fragmented

Chat and artifact contradict, duplicate, or depend awkwardly on one another. The learner
must shuttle repeatedly between them, the visual carries long explanations, chat narrates
the obvious while omitting rigor, or the Tutor assumes an unobserved artifact state.

#### 2 — Weak

Both parts are relevant, but their responsibilities are unclear. Framing is insufficient
or excessive, instructions are misplaced, the artifact behaves like an illustrated chat
paragraph, or follow-up fails to convert the visual experience into reasoning.

#### 3 — Competent

Chat frames the artifact and later adds useful explanation, qualification, or a question.
The visual can be used without constant gaze switching. Some duplication, sequencing,
instruction placement, or missed follow-up keeps the exchange from feeling fully unified.

#### 4 — Strong

Minimum chat framing leads into a self-contained visual experience, and later chat turns
the resulting intuition into rigor, interpretation, or one well-chosen question. Each
medium contributes what the other cannot, with no false assumption about local state.

#### 5 — Exemplary

Chat and artifact operate as one irreducible teaching sequence. Framing creates the exact
question the visual can answer; the learner remains immersed while the model communicates;
and later dialogue converts perception into durable, transferable reasoning. No content
is duplicated, stranded, or placed in the wrong medium.

## 12. Artifact-family execution

Apply this dimension whenever an artifact is present. Select the branch in
[artifact families](../notes/artifact-families.md) by the relationship the learner must
understand, not merely by topic or implementation technology. Combine branches only when
the learning contract genuinely combines their defining mechanisms.

Treat every applicable review bullet in the selected family branch as an individual
binary criterion under this section. Score each as `Pass`, `Fail`, `Unknown`, or `N/A`
using the shared scoring rules. Then assign the family-execution Likert score below.

### Binary checks

- The reviewer names the selected artifact-family branch or justified combination.
- Every applicable family criterion receives an explicit binary result.
- The artifact preserves the family's defining instructional property: spatial form,
  proportional duration, mathematical invariant, causal response, dependency, mechanism,
  quantitative encoding, or geography.
- Family-specific progressive disclosure, interaction, labeling, truth, and accessibility
  requirements are evaluated in the real half-pane.
- Any intentional departure from the family guidance is justified by the learning
  objective and produces a stronger result than literal compliance.

### Likert rubric: artifact-family execution

#### 1 — Violates the form

The artifact uses the nominal family while losing its defining educational property. A
timeline does not communicate time, a simulation does not expose causality, a proof does
not preserve its invariant, or a spatial model falsifies or hides spatial relationships.
Several central family criteria fail or remain unknown.

#### 2 — Weak

The family is recognizable, but execution relies on its superficial conventions. Important
family-specific behaviors, truth conditions, interactions, or labels are absent, and the
artifact teaches less than a competent example of the form should.

#### 3 — Competent

The artifact satisfies the defining purpose and central criteria of its family. It teaches
through the appropriate mechanism and avoids major family-specific errors. Some secondary
criteria or opportunities for a more exact use of the form remain unresolved.

#### 4 — Strong

The artifact uses the family intelligently rather than formulaically. Its defining
mechanism, interaction, truth conditions, responsive form, and subject-specific details
work together, with nearly every applicable family criterion satisfied at a high level.

#### 5 — Exemplary

The artifact is an unusually effective example of its instructional form. It fulfills or
thoughtfully surpasses every applicable family criterion, and the family itself reveals
the subject's central relationship with exceptional clarity. Any departure from convention
is deliberate, truthful, and pedagogically superior.
