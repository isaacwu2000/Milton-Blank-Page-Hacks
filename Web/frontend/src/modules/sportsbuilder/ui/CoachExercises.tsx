import { normalizePracticeStep, type CoachDrill } from "../../../../../shared";

/** Presents suggested practice without tracking tasks or changing saved completion history. */
export function CoachExercises({ drill }: { drill: CoachDrill }) {
  const steps = [...new Set((drill.steps ?? []).map(normalizePracticeStep).filter(Boolean))];
  return (
    <section className="coach-exercises" aria-label="Exercises">
      <h3>Exercises</h3>
      <h4>{drill.title}</h4>
      <p>{drill.instructions}</p>
      {steps.length > 0 && (
        <ol>
          {steps.map((step) => <li key={step}>{step}</li>)}
        </ol>
      )}
    </section>
  );
}
