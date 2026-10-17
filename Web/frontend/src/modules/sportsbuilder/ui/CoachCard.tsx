import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  EllipsisVertical,
  LoaderCircle,
  Pencil,
  Target,
  Trash2,
} from "lucide-react";
import type { SavedTool } from "../../../../../shared";
import { IconButton, Input } from "../../../components";
import { api } from "../services/api";
import { ErrorNote } from "./common";
import "./CoachCard.css";

/** Library actions update metadata while keeping the coach's video associations. */
export function CoachCard({
  tool,
  disabled,
  onUpdated,
  onRefine,
}: {
  tool: SavedTool;
  disabled?: boolean;
  onUpdated: (tool: SavedTool) => void;
  onRefine?: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(tool.name);
  const [busy, setBusy] = useState<"rename" | "delete" | null>(null);
  const [error, setError] = useState("");
  const root = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const renameForm = useRef<HTMLFormElement>(null);
  const openingIndex = useRef(0);
  const restoreFocus = useRef(false);
  const menuId = useId(),
    nameId = useId();
  useLayoutEffect(() => {
    if (!menu) return;
    function positionMenu() {
      const anchor = trigger.current?.getBoundingClientRect();
      const popup = menuRef.current?.getBoundingClientRect();
      if (!anchor || !popup) return;
      const gutter = 8,
        gap = 4;
      const below = anchor.bottom + gap;
      const preferredTop =
        below + popup.height <= window.innerHeight - gutter
          ? below
          : anchor.top - popup.height - gap;
      setMenuPosition({
        top: Math.max(
          gutter,
          Math.min(preferredTop, window.innerHeight - popup.height - gutter),
        ),
        left: Math.max(
          gutter,
          Math.min(
            anchor.right - popup.width,
            window.innerWidth - popup.width - gutter,
          ),
        ),
      });
    }
    positionMenu();
    window.addEventListener("resize", positionMenu);
    window.addEventListener("scroll", positionMenu, true);
    return () => {
      window.removeEventListener("resize", positionMenu);
      window.removeEventListener("scroll", positionMenu, true);
    };
  }, [menu]);
  useEffect(() => {
    if (!menu) return;
    menuRef.current
      ?.querySelectorAll<HTMLButtonElement>("button")
      [openingIndex.current]?.focus();
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setMenu(false);
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [menu]);
  useLayoutEffect(() => {
    if (renaming) {
      input.current?.focus();
      input.current?.select();
      if (!busy) renameForm.current?.scrollIntoView?.({ block: "nearest" });
    } else if (!busy && restoreFocus.current) {
      trigger.current?.focus();
      restoreFocus.current = false;
    }
  }, [renaming, busy]);
  function cancelRename() {
    restoreFocus.current = true;
    setRenaming(false);
    setError("");
  }
  async function update(action: "rename" | "delete") {
    if (busy || disabled) return;
    if (action === "rename" && (!name.trim() || name.trim().length > 120))
      return;
    setBusy(action);
    setMenu(false);
    setError("");
    try {
      const saved = await api<SavedTool>(
        `/api/tools/${encodeURIComponent(tool.id)}`,
        action === "rename"
          ? { method: "PATCH", body: JSON.stringify({ name: name.trim() }) }
          : { method: "DELETE" },
      );
      onUpdated(saved);
      restoreFocus.current = true;
      setRenaming(false);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not update this coach. Try again.",
      );
    } finally {
      if (action === "delete") restoreFocus.current = true;
      setBusy(null);
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    void update("rename");
  }
  return (
    <article
      className="tool-summary coach-card"
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setMenu(false);
      }}
    >
      <div className="tool-symbol" aria-hidden="true">
        <Target size={19} />
      </div>
      <div className="coach-card-copy">
        <h3>{tool.name}</h3>
        <p>
          {tool.sport} · {tool.metrics.length} metrics
        </p>
        {onRefine && !renaming && (
          <button type="button" className="text-button" disabled={!!busy || disabled} onClick={onRefine}>
            Refine coach
          </button>
        )}
        {renaming && (
          <form
            ref={renameForm}
            className="coach-card-rename"
            aria-label={`Rename ${tool.name}`}
            onSubmit={submit}
            onKeyDown={(event) => {
              if (event.key === "Escape" && !busy) {
                event.preventDefault();
                cancelRename();
              }
            }}
          >
            <label htmlFor={nameId}>Coach name</label>
            <Input
              ref={input}
              id={nameId}
              value={name}
              required
              maxLength={120}
              disabled={!!busy || disabled}
              onChange={(event) => setName(event.target.value)}
            />
            <div className="coach-card-rename-actions">
              <button
                className="button secondary"
                type="button"
                disabled={!!busy}
                onClick={cancelRename}
              >
                Cancel
              </button>
              <button
                className="button"
                disabled={!!busy || disabled || !name.trim()}
              >
                {busy === "rename" ? "Saving…" : "Save name"}
              </button>
            </div>
          </form>
        )}
        {busy && (
          <p role="status">
            {busy === "rename" ? "Saving coach name…" : "Deleting coach…"}
          </p>
        )}
        {error && <ErrorNote message={error} onClose={() => setError("")} />}
      </div>
      <IconButton
        ref={trigger}
        label={`Options for ${tool.name}`}
        surface="transparent"
        className="coach-card-options"
        disabled={!!busy || disabled}
        aria-busy={!!busy}
        aria-haspopup="menu"
        aria-expanded={menu}
        aria-controls={menu ? menuId : undefined}
        onClick={() => {
          openingIndex.current = 0;
          setMenu(!menu);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openingIndex.current = event.key === "ArrowUp" ? 1 : 0;
            setMenu(true);
          }
        }}
      >
        {busy ? (
          <LoaderCircle size={18} className="spin" aria-hidden="true" />
        ) : (
          <EllipsisVertical size={18} aria-hidden="true" />
        )}
      </IconButton>
      {menu && (
        <div
          id={menuId}
          ref={menuRef}
          role="menu"
          aria-label={`Actions for ${tool.name}`}
          className="coach-card-menu"
          style={menuPosition}
          onKeyDown={(event) => {
            const items = Array.from(
              menuRef.current?.querySelectorAll<HTMLButtonElement>("button") ??
                [],
            );
            const index = items.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
              event.preventDefault();
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? items.length - 1
                    : (index +
                        (event.key === "ArrowDown" ? 1 : -1) +
                        items.length) %
                      items.length;
              items[next]?.focus();
            } else if (event.key === "Escape") {
              event.preventDefault();
              setMenu(false);
              trigger.current?.focus();
            }
          }}
        >
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => {
              setMenu(false);
              setName(tool.name);
              setError("");
              setRenaming(true);
            }}
          >
            <Pencil size={16} aria-hidden="true" />
            Rename
          </button>
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            className="coach-card-delete"
            onClick={() => void update("delete")}
          >
            <Trash2 size={16} aria-hidden="true" />
            Delete
          </button>
        </div>
      )}
    </article>
  );
}
