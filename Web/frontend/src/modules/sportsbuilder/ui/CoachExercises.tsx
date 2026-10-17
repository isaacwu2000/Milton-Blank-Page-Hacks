import { useState } from "react";
import type { CoachDrill, Session } from "../../../../../shared";
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
  const steps = drill.steps ?? [drill.instructions];
  const keys = steps.map((step) => `goal:${JSON.stringify([drill.title, step])}`);
  const checked = keys.map(
    (key) => completed.includes(key) || completed.includes(drill.title),
  );
  async function toggle(index: number) {
    if (saving) return;
    // Expand a previous whole-drill completion into its individual goals before an edit.
    const previous = completed.includes(drill.title)
      ? [...completed.filter((value) => value !== drill.title), ...keys]
      : completed;
    const next = checked[index]
      ? previous.filter((value) => value !== keys[index])
      : [...previous, keys[index]];
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
