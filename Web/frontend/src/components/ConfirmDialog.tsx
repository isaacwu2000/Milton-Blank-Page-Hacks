import { useEffect, useId, useRef, type ReactNode } from "react";

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
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    element?.showModal();
    return () => {
      element?.close();
      previousFocus?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="confirm-dialog"
      aria-labelledby={titleId}
      onCancel={onClose}
    >
      <h2 id={titleId}>{title}</h2>
      {children}
    </dialog>
  );
}
