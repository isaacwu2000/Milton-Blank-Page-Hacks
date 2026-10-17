# LearnUnlock provenance
Copied before SportsBuilder implementation, from the user's locally authorized LearnUnlock checkout.
- `.agents/learnunlock/reviewedArtifactAuthoring.ts`: unchanged, self-contained production review state machine; SportsBuilder imports it directly for validation, screenshot inspection, bounded repair, and exact-draft acceptance.
- `solSpecialistChat.ts`: original provider reference. Adapted in `agent/model.ts` to the requested local OAuth proxy / production OpenRouter parity; no Jev or LearnUnlock recording/database dependencies.
- `AGENTS.md`: original guidance reference; app-specific auth/deployment instructions do not apply to SportsBuilder.
- `src/components/Input.tsx` and `IconButton.tsx`: copied reusable components.
- `.agents/skills`: copied full skill directories. Context is adapted for this product.
- Font copied with its SIL OFL license.
These are user-authorized local sources, not a declaration of a new public license for LearnUnlock code.
