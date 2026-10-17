# OpenRouter review connection fix

Revision `e581e6d` fixes a reproduced failure in the shared provider used by
“Review my form”. The configured key had matching U+201C/U+201D curly quotes
around it. Bun rejected that non-ASCII Authorization header before sending the
request, but the adapter reported “OpenRouter could not be reached”. The key
itself worked when the formatting quotes were removed.

The adapter now removes paired exterior formatting quotes, rejects remaining
invalid key characters without echoing the key, and distinguishes HTTP key,
credit, permission, rate-limit, and availability errors. TimeoutError is handled
as a timeout, with a per-request deadline inside the whole coaching-job deadline.
There is no automatic provider switch or generation retry.

Verification: the exact misleading-error symptom failed before the patch and
passed afterward. All 28 agent Vitest tests and TypeScript checks passed. A fresh
OpenRouter call succeeded with the same saved key. A full real-video review of
IMG_0508.MOV completed through the actual coach API using all 175 sampled frames,
returning a reply and drill. Private evidence remains in ignored
`output/openrouter-coach-request.json` and `output/openrouter-coach-result.json`.
The temporary test agent used port 3002; normal app services were not interrupted.
This verifies the local copy of the shared key/configuration, not inspection of
the other person's machine. They must update and restart their app to load the fix.
