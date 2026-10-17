export type ArtifactReviewStage = "draft" | "acceptance" | "validation" | "inspection";
export type ArtifactReviewObservation = {
    revision: number;
    errors: string[];
    checks: string[];
    screenshot?: string;
    additionalScreenshots?: string[];
};
export type ArtifactReviewInspection = Omit<ArtifactReviewObservation, "revision">;
type ReviewDecision =
    | { action: "draft"; source: unknown }
    | { action: "invalid"; errors: string[] }
    | { action: "submit"; revision?: number }
    | { action: "unsupported"; message: string };
export type ArtifactReviewEvent = {
    kind: "response" | "validation" | "inspection" | "failed";
    stage: ArtifactReviewStage;
    revision: number;
    elapsedMs: number;
    errors?: string[];
};

/**
 * Supplies one format's private draft and inspection rules.
 * - Parses decisions and prepares source; reports invalid drafts or throws to end a request.
 * - Inspection returns screenshot evidence; checkInspection throws to reject it.
 * - The selected policy determines whether draft or inspection exceptions allow repair.
 * - record appends format-specific diagnostics; it must not throw or publish drafts.
 */
export type ReviewedArtifactAuthoringAdapter<Document> = {
    parseDecision(raw: unknown): ReviewDecision;
    prepareDraft(source: unknown, signal: AbortSignal): Promise<{ document: Document; errors: string[] }>;
    inspect(document: Document, signal: AbortSignal): Promise<ArtifactReviewInspection>;
    checkInspection(inspection: ArtifactReviewInspection): void;
    record(event: ArtifactReviewEvent): void;
    recordToolResult?(input:unknown,output:unknown,elapsedMilliseconds:number):Promise<void>;
};

/**
 * Keeps each format's deadline, repair behavior and failure messages.
 * - fail ends on a draft or inspection exception; repair records it for another decision.
 * - stopAfterInvalidFinalDraft ends immediately after the second invalid source.
 * - Other formats may spend their final response accepting or declining the request.
 */
type ReviewPolicy = {
    workBudgetMs: number;
    draftExceptions: "fail" | "repair";
    stopAfterInvalidFinalDraft: boolean;
    messages: {
        abort(stage: ArtifactReviewStage, parentAborted: boolean): string;
        draftsExhausted(errors?: string[]): string;
        responsesExhausted: string;
        invalidSubmission: string;
        unknownFailure?: (stage: ArtifactReviewStage) => string;
        draftFailure?: string;
    };
};

/**
 * Reviews a private Artifact draft with one repair and at most three model responses.
 * - Replacing a draft invalidates all previous screenshot evidence.
 * - Submission must name the exact inspected revision without blocking errors.
 * - Model, validation and inspection share one cancellable deadline.
 * - Format adapters retain their diagnostics, trace shape and repair rules.
 * - Returns a private accepted document or failure; never publishes or starts a job.
 */
export async function runReviewedArtifactAuthoring<Document>(
    decide: (observation: ArtifactReviewObservation | null, signal: AbortSignal) => Promise<unknown>,
    adapter: ReviewedArtifactAuthoringAdapter<Document>,
    policy: ReviewPolicy,
    parentSignal?: AbortSignal,
) {
    const started = Date.now();
    const deadline = AbortSignal.timeout(policy.workBudgetMs);
    const signal = parentSignal ? AbortSignal.any([deadline, parentSignal]) : deadline;
    let stage: ArtifactReviewStage = "draft";
    let revision = 0;
    let document: Document | null = null;
    let observation: ArtifactReviewObservation | null = null;
    const record = (kind: ArtifactReviewEvent["kind"], errors?: string[]) => adapter.record({ kind, stage, revision, elapsedMs: Date.now() - started, ...(errors ? { errors } : {}) });
    // Attach cancellation only while work is pending, and release the listener
    // even when a provider ignores the signal and eventually resolves late.
    const bounded = <T>(work: () => Promise<T>) => new Promise<T>((resolve, reject) => {
        const abort = () => {
            signal.removeEventListener("abort", abort);
            reject(new Error(policy.messages.abort(stage, parentSignal?.aborted === true)));
        };
        if (signal.aborted) { abort(); return; }
        signal.addEventListener("abort", abort, { once: true });
        try {
            work().then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
        } catch (error) {
            signal.removeEventListener("abort", abort);
            reject(error);
        }
    });
    let pendingInput:unknown;
    let toolStarted=0;
    const toolResult=async(output:unknown)=>{
        if(pendingInput===undefined)return;
        const input=pendingInput;pendingInput=undefined;
        await adapter.recordToolResult?.(input,output,Date.now()-toolStarted);
    };
    const invalidDraft = async (errors: string[]) => {
        document = null;
        observation = { revision, errors, checks: [] };
        record("validation", errors);
        await toolResult({status:"failed",errors});
        if (revision === 2 && policy.stopAfterInvalidFinalDraft)
            throw new Error(policy.messages.draftsExhausted(errors));
    };
    try {
        for (let response = 0; response < 3; response++) {
            signal.throwIfAborted();
            stage = observation?.screenshot ? "acceptance" : "draft";
            const raw = await bounded(() => decide(observation, signal));
            pendingInput=raw;toolStarted=Date.now();
            record("response");
            stage = "validation";
            const decision = adapter.parseDecision(raw);
            signal.throwIfAborted();
            if (decision.action === "unsupported") {await toolResult({status:"failed",errors:[decision.message]});return { status: "failed" as const, stage, message: decision.message };}
            if (decision.action === "submit") {
                if (!document || !observation?.screenshot || observation.errors.length || decision.revision !== revision)
                    throw new Error(policy.messages.invalidSubmission);
                await toolResult({status:"complete",revision});
                return { status: "accepted" as const, document, revision, observation };
            }
            if (revision === 2) throw new Error(policy.messages.draftsExhausted());
            revision++;
            // A new source owns a fresh revision, even if parsing or validation fails.
            document = null;
            observation = null;
            if (decision.action === "invalid") { await invalidDraft(decision.errors); continue; }
            let prepared: { document: Document; errors: string[] };
            try {
                prepared = await bounded(() => adapter.prepareDraft(decision.source, signal));
            } catch (error) {
                if (policy.draftExceptions === "fail") throw error;
                await invalidDraft([error instanceof Error ? error.message : policy.messages.draftFailure ?? "Artifact validation or browser inspection failed."]);
                continue;
            }
            if (policy.draftExceptions === "fail") signal.throwIfAborted();
            document = prepared.document;
            if (prepared.errors.length) { await invalidDraft(prepared.errors); continue; }
            observation = { revision, errors: [], checks: [] };
            record("validation", []);
            signal.throwIfAborted();
            stage = "inspection";
            try {
                const inspection = await bounded(() => adapter.inspect(prepared.document, signal));
                adapter.checkInspection(inspection);
                if (policy.draftExceptions === "fail") signal.throwIfAborted();
                observation = { revision, ...inspection };
                record("inspection", inspection.errors);
                await toolResult({status:inspection.errors.length ? "failed" : "complete",...observation});
            } catch (error) {
                if (policy.draftExceptions === "fail") throw error;
                stage = "validation";
                await invalidDraft([error instanceof Error ? error.message : policy.messages.draftFailure ?? "Artifact validation or browser inspection failed."]);
            }
        }
        throw new Error(policy.messages.responsesExhausted);
    } catch (error) {
        const message = error instanceof Error ? error.message : policy.messages.unknownFailure?.(stage) ?? `Artifact creation failed during ${stage}.`;
        record("failed", [message]);
        await toolResult({status:"failed",errors:[message]});
        return { status: "failed" as const, stage, message };
    }
}
