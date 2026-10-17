---
name: explain-code
description: Explain code or changes as an interactive HTML artifact.
---

# Explain Code

Make a rich, interactive explanation of the specified code or code change.

## Explanation discipline

Apply LearnUnlock's Tutor principles to the explanation:

- Determine the single core idea before writing. State it in one simple sentence near the top.
- Teach one concept per paragraph or diagram. Each diagram should clarify one relationship, sequence, or state change.
- Introduce an idea in familiar, concrete language before naming its technical term.
- Use concrete nouns, strong verbs, and toy data. Remove filler, repetition, jargon, weak qualifiers, and background that does not support the core idea.
- Layer the explanation: begin with the simplest useful model, then add current-system detail, future-system detail, and code. Let experienced readers skip the beginner layer.
- Keep each paragraph under 100 words. Prefer a direct sentence, small diagram, or short code block over another paragraph.
- Use at most five unexplained technical terms in any section. Define the terms that the reader must retain.

The output remains a long-form HTML page; do not copy the Tutor prompt's three-paragraph response limit. Apply its simplicity locally so every section is easy to absorb.

It should have these sections:

- Background: Explain the existing system relevant to the code or change. Broadly explore the surrounding code. Include deep background for beginners that experienced readers can skip, followed by narrower background directly relevant to the subject.
- Intuition: Explain the core intuition for the code or change. Focus on the essence rather than every detail. Use concrete examples with toy data and figures or diagrams.
- Code: Give a high-level walkthrough of the relevant code and changes. Group and order the material so it builds understanding.
- Quiz: Write five medium-difficulty multiple-choice questions that require understanding the code or change. When the user selects an answer, show whether it was correct and explain why.

Format:

- Output a single self-contained HTML file which includes CSS and JavaScript. Make the whole thing one long page with section headers and a table of contents. Don't use tabs for the top-level structure. Basic responsive styling so you can view it on a phone is nice too. Put the file in a global place on my computer outside of the code repo, and make sure the filename always starts with today's date in `YYYY-MM-DD-` format, because it helps keep the files time-sorted and out of version control. For example: /tmp/2026-01-12-explanation-<slug>.html
- Please write with the clarity and flow of Martin Kleppmann, making it engaging and written in classic style. Transitions between sections should be smooth.
- Some tips on diagrams. Ideally, you should pick a small number of diagram families that can be reused throughout the explanation to explain various cases. Some useful kinds of diagrams:
  - A very simplified version of the UI that the user sees in the app, to explain UI changes.
  - A system diagram showing data flow or communication between components. Make sure to include example data here!
- Don't use ASCII diagrams. Always use simple HTML designs for your diagrams, HTML lists for lists of things, etc.
  - For code blocks, always use `<pre>` tags. If you use a custom styled div instead, it **must** have
    `white-space: pre-wrap` in its CSS, or the browser will collapse all newlines into a single line.
    Before saving the file, scan each code block in the HTML source and confirm its CSS includes
    `white-space: pre` or `pre-wrap`.
- Use callouts for key concepts or definitions, important edge cases, etc.

Before saving, verify:

- A beginner can understand the first pass without reading the code.
- Every paragraph and figure teaches one idea.
- Number of technical terms is minimized, and all terms are defined in maximally simple language.
