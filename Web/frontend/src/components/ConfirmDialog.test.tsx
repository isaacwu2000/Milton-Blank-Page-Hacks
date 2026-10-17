// @vitest-environment jsdom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog";
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); this.querySelector<HTMLElement>("button")?.focus(); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});
afterEach(cleanup);
function Warning() {
  const [open, setOpen] = useState(false);
  return <>
    <button onClick={() => setOpen(true)}>Build my tool</button>
    {open && <ConfirmDialog title="Build before finishing the interview?" onClose={() => setOpen(false)}>
      <button autoFocus data-dialog-initial-focus onClick={() => setOpen(false)}>Keep talking</button>
      <button>Build anyway</button>
    </ConfirmDialog>}
  </>;
}
it("closes through the top-right X just like Keep talking and restores focus", () => {
  render(<Warning />);
  const opener = screen.getByRole("button", { name: "Build my tool" });
  opener.focus();
  fireEvent.click(opener);
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Keep talking" }));
  fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.activeElement).toBe(opener);
});
it("keeps Escape dismissal and focus restoration", () => {
  render(<Warning />);
  const opener = screen.getByRole("button", { name: "Build my tool" });
  opener.focus();
  fireEvent.click(opener);
  fireEvent(screen.getByRole("dialog"), new Event("cancel", { bubbles: true, cancelable: true }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.activeElement).toBe(opener);
});
