---
name: grilling
description: Stress-test a plan, decision, or idea.
---

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled — the questions you can ask _now_ without guessing at answers you have not heard yet. Ask the whole frontier in one round: number each question and give your recommended answer. Then wait for the user's answers before the next round.

Each question uses this format:

```
❓ **Q1** — **<question title>**: <question body, including choices when helpful>

➡️ <recommended answer>
```

Each round reshapes the tree — settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier before the next round. A question whose answer depends on another question still open in this round belongs to a later round.

Finding facts is the agent's job, never the user's. When a frontier question needs a fact from the repository or environment, investigate it rather than asking the user. Do not block the round: only questions downstream of an unresolved investigation wait. The decisions are the user's — put each to them and wait.

The session is done when the frontier is empty: every branch of the design tree has been visited and nothing is silently assumed. Do not act on it until the user confirms the shared understanding.
