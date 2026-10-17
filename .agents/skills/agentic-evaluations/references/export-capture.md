# Native app export capture

Use the app session menu, then Export to PDF. Verify the saved PDF has the first and last student/Tutor messages and all intervening messages. Inspect rendered pages and visuals. Preserve the original file bytes. Keep tool/proposal observations in the evidence log when the native export omits them.

Do not confuse a browser capture failure with a Tutor failure. On October 3, 2026 the Codex in-app browser emitted Page.downloadWillBegin for a 681925-byte PDF, then Page.downloadProgress with state canceled. The app had generated its PDF correctly.

When normal download capture fails, first inspect progress and browser download events. Do not repeatedly wait without inspecting the failure. Use a browser with working download support when it can access the synthetic account without changing the user's account session.

For an in-app browser with documented CDP developer access, a temporary capture can preserve the app-generated Blob before it is revoked. Read CDP documentation first. Temporarily intercept the export anchor click only when it has a PDF download name and a blob URL. Retain its href in one visible capture link and defer revocation of that Blob. Then click the app Export to PDF action through the UI. Read the bytes from that visible link's Blob, save the unchanged PDF, and verify it. This captures the app export; it does not rebuild the chat PDF. Never read unrelated blobs or authentication state.

Use try/finally cleanup: restore the original anchor click and URL.revokeObjectURL functions, revoke captured URLs, remove capture links, and remove temporary capture state. Record exact capture start/end times and the method in the detailed run records. Summarize capture failures under Minus / Auxiliary failures in the evaluator PDF; keep repair timings out of findings. This temporary browser instrumentation is an export repair after simulation; do not use it during student simulation or for Tutor scoring. Do not change deployed source for a browser capture problem.

## Script

Run `bun .agents/skills/agentic-evaluations/scripts/native-export-capture.mjs prepare` to get the documented CDP Runtime.evaluate parameters. Send them through the browser CDP capability. Use the actual app Export to PDF action, then run the script with `read`. Save its returned base64 bytes to a PDF; never print those bytes into the chat. Always run `cleanup` through CDP in a finally block. The script emits requests; it does not control a browser or access private Tutor data.

All generated report PDFs use the bundled Lexend fonts. The native app export already renders its text in Lexend. Preserve native PDF bytes rather than retypesetting them.
