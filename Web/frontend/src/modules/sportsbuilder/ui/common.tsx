import { Activity, Film, X } from "lucide-react";
import { IconButton } from "../../../components";
export function Logo() {
  return (
    <span className="brand">
      <span className="brand-mark">
        <Activity size={20} />
      </span>
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
      <Film size={25} strokeWidth={1.4} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
