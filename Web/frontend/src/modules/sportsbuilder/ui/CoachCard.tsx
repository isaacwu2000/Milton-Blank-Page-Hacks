import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { EllipsisVertical, Pencil, Target, Trash2 } from "lucide-react";
import { type SavedTool } from "../../../../../shared";
import { ConfirmDialog, IconButton, Input } from "../../../components";
import { api } from "../services/api";
import { ErrorNote } from "./common";

/** Opens a saved coach or changes its library name/visibility without editing its metrics. */
export function CoachCard({ tool, onOpen, onRenamed, onDeleted }: {
  tool: SavedTool;
  onOpen: () => void;
  onRenamed: (tool: SavedTool) => void;
  onDeleted: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const [action, setAction] = useState<"rename" | "delete" | null>(null);
  const [name, setName] = useState(tool.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const nameId = useId();
  useEffect(() => {
    if (!menu) return;
    menuRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setMenu(false);
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [menu]);
  function choose(next: "rename" | "delete") {
    trigger.current?.focus();
    setMenu(false);
    setError("");
    setName(tool.name);
    setAction(next);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !action || (action === "rename" && !name.trim())) return;
    setBusy(true);
    setError("");
    try {
      const path = `/api/tools/${encodeURIComponent(tool.id)}`;
      if (action === "rename") {
        const saved = await api<SavedTool>(path, { method: "PATCH", body: JSON.stringify({ name: name.trim() }) });
        onRenamed(saved);
      } else {
        await api(path, { method: "DELETE" });
        onDeleted();
      }
      setAction(null);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not update this coach. Try again.");
    } finally {
      setBusy(false);
    }
  }
  return <div className="coach-card" ref={root}>
    <button type="button" className="tool-summary" onClick={onOpen} aria-label={`Open ${tool.name}`}>
      <span className="tool-symbol" aria-hidden="true"><Target size={19} /></span>
      <span className="tool-summary-copy">
        <span className="tool-summary-name">{tool.name}</span>
        <span className="tool-summary-meta">{tool.sport} · {tool.metrics.length} metrics</span>
      </span>
    </button>
    <IconButton ref={trigger} label={`Options for ${tool.name}`} surface="transparent" className="coach-card-options"
      aria-haspopup="menu" aria-expanded={menu} aria-controls={menu ? menuId : undefined}
      onClick={() => setMenu(!menu)} onKeyDown={event => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setMenu(true); }
      }}><EllipsisVertical size={18} aria-hidden="true" /></IconButton>
    {menu && <div ref={menuRef} id={menuId} role="menu" aria-label={`Actions for ${tool.name}`} className="coach-card-menu"
      onKeyDown={event => {
        const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);
        const index = items.indexOf(document.activeElement as HTMLButtonElement);
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
          event.preventDefault();
          const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
          items[next]?.focus();
        } else if (event.key === "Escape") { event.preventDefault(); setMenu(false); trigger.current?.focus(); }
        else if (event.key === "Tab") setMenu(false);
      }}>
      <button type="button" role="menuitem" onClick={() => choose("rename")}><Pencil size={16} aria-hidden="true" />Rename</button>
      <button type="button" role="menuitem" className="destructive-action" onClick={() => choose("delete")}><Trash2 size={16} aria-hidden="true" />Delete</button>
    </div>}
    {action && <ConfirmDialog title={action === "rename" ? "Rename coach" : "Delete coach?"} onClose={() => { if (!busy) setAction(null); }}>
      <form className="coach-card-form" onSubmit={submit}>
        {action === "rename" ? <label htmlFor={nameId}>Coach name<Input id={nameId} autoFocus value={name} required maxLength={120} disabled={busy} onChange={event => setName(event.target.value)} /></label>
          : <p>Remove “{tool.name}” from your coaches? Past video sessions will stay available.</p>}
        {error && <ErrorNote message={error} />}
        <div className="coach-card-form-actions">
          <button className="button secondary" type="button" autoFocus={action === "delete"} disabled={busy} onClick={() => setAction(null)}>Cancel</button>
          <button className={action === "delete" ? "button destructive-button" : "button"} disabled={busy || (action === "rename" && !name.trim())}>
            {busy ? "Saving…" : action === "rename" ? "Save name" : "Delete coach"}
          </button>
        </div>
      </form>
    </ConfirmDialog>}
  </div>;
}
