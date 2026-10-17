import { describe, expect, it } from "vitest";
import { runReviewedArtifactAuthoring, type ReviewedArtifactAuthoringAdapter } from "../../../.agents/learnunlock/reviewedArtifactAuthoring";

const policy = { workBudgetMs: 1000, draftExceptions: "repair" as const, stopAfterInvalidFinalDraft: true, messages: { abort: () => "Review canceled", draftsExhausted: () => "No more drafts", responsesExhausted: "No decision", invalidSubmission: "Only the exact inspected revision can be accepted" } };
function adapter(): ReviewedArtifactAuthoringAdapter<{ name: string }> {
  return {
    parseDecision: (raw: any) => raw,
    prepareDraft: async (source: any) => ({ document: source, errors: source.name ? [] : ["Name required"] }),
    inspect: async (document) => ({ errors: [], checks: ["Browser inspected"], screenshot: `data:image/png;base64,fixture-${document.name}` }),
    checkInspection: (inspection) => { if (!inspection.screenshot) throw Error("Pixels required"); },
    record: () => {},
  };
}
describe("copied review harness acceptance boundary", () => {
  it("accepts only after returning screenshot evidence for that exact draft", async () => {
    const seen: unknown[] = [];
    const result = await runReviewedArtifactAuthoring(async (observation) => {
      seen.push(observation);
      return observation ? { action: "submit", revision: observation.revision } : { action: "draft", source: { name: "Reach" } };
    }, adapter(), policy);
    expect(result.status).toBe("accepted");
    expect(seen[1]).toMatchObject({ revision: 1, screenshot: "data:image/png;base64,fixture-Reach", errors: [] });
    if (result.status === "accepted") expect(result.document).toEqual({ name: "Reach" });
  });

  it("rejects stale screenshot acceptance after a replacement draft", async () => {
    const decisions = [{ action: "draft", source: { name: "First" } }, { action: "draft", source: { name: "Replacement" } }, { action: "submit", revision: 1 }];
    const inspections: unknown[] = [];
    const result = await runReviewedArtifactAuthoring(async (observation) => { inspections.push(observation); return decisions.shift(); }, adapter(), policy);
    expect(inspections[2]).toMatchObject({ revision: 2, screenshot: "data:image/png;base64,fixture-Replacement" });
    expect(result).toMatchObject({ status: "failed", message: policy.messages.invalidSubmission });
    expect("document" in result).toBe(false);
  });

  it("cannot accept an invalid draft with no inspection evidence", async () => {
    let round = 0;
    const result = await runReviewedArtifactAuthoring(async () => ++round === 1 ? { action: "draft", source: { name: "" } } : { action: "submit", revision: 1 }, adapter(), policy);
    expect(result).toMatchObject({ status: "failed", message: policy.messages.invalidSubmission });
  });
});
