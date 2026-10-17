import { useState } from "react";
import { ArrowRight, LoaderCircle, X } from "lucide-react";
import { pretty, type Session } from "../../../../../shared";
import { IconButton } from "../../../components";
import { api } from "../services/api";
import { formatDate } from "../runtime/format";
import { ErrorNote } from "./common";
import { SessionPreview } from "./SessionPreview";

/** Opens one recording or deletes it after confirmation; failed deletion retains an editable row. */
export function RecentVideo({
  session,
  onOpen,
  onDeleted,
}: {
  session: Session;
  onOpen: () => void;
  onDeleted: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  async function remove() {
    if (
      deleting ||
      !confirm(`Delete "${session.name}" and its saved analysis?`)
    )
      return;
    setDeleting(true);
    setError("");
    try {
      await api(`/api/sessions/${encodeURIComponent(session.id)}`, {
        method: "DELETE",
      });
      onDeleted(session.id);
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setDeleting(false);
    }
  }
  return (
    <div className="recent-video">
      <div className="recent-video-actions">
        <button
          type="button"
          className="session-row"
          aria-label={`Open ${session.name}`}
          onClick={onOpen}
          disabled={deleting}
        >
          <SessionPreview sessionId={session.id} />
          <span className="session-copy">
            <strong>{session.name}</strong>
            <small>
              {session.duration.toFixed(1)}s · {formatDate(session.createdAt)}
            </small>
          </span>
          {session.status !== "complete" && (
            <span
              className={`small ${session.status === "failed" ? "error-text" : "muted"}`}
            >
              {["queued", "processing"].includes(session.status) && (
                <LoaderCircle
                  className="spin inline"
                  size={12}
                  aria-hidden="true"
                />
              )}{" "}
              {pretty(session.status)}
            </span>
          )}
          <span className="session-arrow" aria-hidden="true">
            <ArrowRight size={17} />
          </span>
        </button>
        <IconButton
          label={`Delete ${session.name}`}
          surface="transparent"
          disabled={deleting}
          aria-busy={deleting}
          onClick={(event) => {
            event.stopPropagation();
            void remove();
          }}
        >
          {deleting ? (
            <LoaderCircle className="spin" size={16} aria-hidden="true" />
          ) : (
            <X size={16} aria-hidden="true" />
          )}
        </IconButton>
      </div>
      {deleting && (
        <p className="small muted" role="status">
          Deleting {session.name}…
        </p>
      )}
      {error && <ErrorNote message={error} onClose={() => setError("")} />}
    </div>
  );
}
