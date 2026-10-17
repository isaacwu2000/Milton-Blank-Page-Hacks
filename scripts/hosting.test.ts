import { expect, it } from "vitest";
import { deployableSource } from "./hosting";

it("packages the runtime while excluding local credentials, recordings and installed tools", () => {
  for (const path of ["Web/backend/server/app.py", "Web/frontend/src/App.tsx", "Web/shared/types.ts", "deploy/nginx.conf", "scripts/host.ts", ".agents/learnunlock/reviewedArtifactAuthoring.ts", "bun.lock"]) expect(deployableSource(path)).toBe(true);
  for (const path of [".env.local", ".sportsbuilder/credentials.json", "output/athlete.mov", "Web/backend/.venv/bin/python", "Web/frontend/node_modules/key", "Web/frontend/dist/private.txt", "../Web/backend/server/app.py"]) expect(deployableSource(path)).toBe(false);
});
