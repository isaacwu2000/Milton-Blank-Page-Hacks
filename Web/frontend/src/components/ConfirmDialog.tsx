import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { IconButton } from "./IconButton";

/** Native modal supplies focus trapping, Escape dismissal and background inertness. */
export function ConfirmDialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const previousFocus = useRef(document.activeElement as HTMLElement | null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    element?.querySelector<HTMLElement>("[data-dialog-initial-focus]")?.focus();
    return () => {
      element?.close();
      previousFocus.current?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="confirm-dialog"
      aria-labelledby={titleId}
      onCancel={onClose}
    >
      <div className="confirm-dialog-heading">
        <h2 id={titleId}>{title}</h2>
        <IconButton label="Close dialog" surface="transparent" onClick={onClose}>
          <X size={18} aria-hidden="true" />
        </IconButton>
      </div>
      {children}
    </dialog>
  );
}
