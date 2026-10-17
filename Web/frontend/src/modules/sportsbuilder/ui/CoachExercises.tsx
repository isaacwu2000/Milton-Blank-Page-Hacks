import { useState } from "react";
import { normalizePracticeStep, type CoachDrill, type Session } from "../../../../../shared";
import { api } from "../services/api";
import { ErrorNote } from "./common";

/** Saves self-reported practice actions without treating checked goals as measured improvement. */
export function CoachExercises({
  drill,
  session,
}: {
  drill: CoachDrill;
  session?: Pick<Session, "id" | "completedDrills">;
}) {
  const [completed, setCompleted] = useState(session?.completedDrills ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const rawSteps = drill.steps ?? [drill.instructions];
  const steps = [...new Set(rawSteps.map(normalizePracticeStep).filter(Boolean))];
  const keys = steps.map((step) => `goal:${JSON.stringify([drill.title, step])}`);
  const aliases = steps.map((step) => rawSteps
    .filter((raw) => normalizePracticeStep(raw) === step)
    .map((raw) => `goal:${JSON.stringify([drill.title, raw])}`));
  const checked = keys.map((key, index) =>
    completed.includes(key) || completed.includes(drill.title) ||
    aliases[index].some((alias) => completed.includes(alias)),
  );
  async function toggle(index: number) {
    if (saving) return;
    // Migrate old whole-drill and glyph-prefixed records only when a goal is edited.
    const owned = new Set([drill.title, ...keys, ...aliases.flat()]);
    const next = [
      ...completed.filter((value) => !owned.has(value)),
      ...keys.filter((_, i) => i === index ? !checked[i] : checked[i]),
    ];
    setSaving(true);
    setError("");
    try {
      if (session) {
        await api(`/api/sessions/${session.id}`, {
          method: "PATCH",
          body: JSON.stringify({ completedDrills: next }),
        });
      }
      setCompleted(next);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="coach-exercises" aria-label="Exercises">
      <h3>Exercises</h3>
      <h4>{drill.title}</h4>
      <p>{drill.instructions}</p>
      <p className="small muted">Check off each action after you practise it.</p>
      <ol>
        {steps.map((step, index) => (
          <li key={`${index}-${step}`}>
            <label>
              <input
                type="checkbox"
                checked={checked[index]}
                disabled={saving}
                onChange={() => {
                  void toggle(index);
                }}
              />
              <span>{step}</span>
            </label>
          </li>
        ))}
      </ol>
      <p className="small muted" role="status">
        {saving
          ? "Saving practice…"
          : `${checked.filter(Boolean).length} of ${keys.length} practice goals completed`}
      </p>
      {error && <ErrorNote message={error} onClose={() => setError("")} />}
    </section>
  );
}
