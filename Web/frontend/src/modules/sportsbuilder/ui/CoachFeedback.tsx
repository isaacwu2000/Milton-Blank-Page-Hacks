import type { CoachFeedback as Feedback } from "../../../../../shared";

/** Separates supported observations, changes to try, and limits of the evidence. */
export function CoachFeedback({ feedback }: { feedback: Feedback }) {
  const sections = [
    {
      heading: "What’s going well",
      points: feedback.doingWell,
      empty: "There is not enough evidence to identify a clear strength yet.",
    },
    {
      heading: "What to improve",
      points: feedback.improve,
      empty: "There is not enough evidence to recommend a specific change yet.",
    },
    { heading: "Evidence limits", points: feedback.limitations, empty: "" },
  ];
  return (
    <div className="coach-feedback">
      {sections.map(({ heading, points, empty }) =>
        points.length || empty ? (
          <section key={heading} aria-label={heading}>
            <h3>{heading}</h3>
            {points.length ? (
              <ul>{points.map((point, i) => <li key={i}>{point}</li>)}</ul>
            ) : (
              <p>{empty}</p>
            )}
          </section>
        ) : null,
      )}
    </div>
  );
}
