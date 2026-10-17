import { Film, LoaderCircle, X } from "lucide-react";
import { IconButton } from "../../../components";
export function Logo() {
  return (
    <span className="brand">
      <img
        className="brand-mark"
        src="/sportsbuilder.svg"
        alt=""
        aria-hidden="true"
      />
      SportsBuilder
    </span>
  );
}
export function ErrorNote({
  message,
  onClose,
}: {
  message: string;
  onClose?: () => void;
}) {
  return (
    <div role="alert" className="error-note">
      <span>{message}</span>
      {onClose && (
        <IconButton
          label="Dismiss error"
          surface="transparent"
          onClick={onClose}
        >
          <X size={15} />
        </IconButton>
      )}
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <Film size={25} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

/** Announces an ongoing action without inventing a percentage or completion time. */
export function LoadingStatus({ children }: { children: React.ReactNode }) {
  return <span className="loading-status small muted" role="status">
    <LoaderCircle className="spin" size={14} aria-hidden="true" />
    {children}
  </span>;
}
