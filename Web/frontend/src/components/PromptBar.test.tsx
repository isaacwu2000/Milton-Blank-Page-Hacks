// @vitest-environment jsdom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PromptBar } from "./PromptBar";
afterEach(cleanup);
function Draft({
  send,
  disabled = false,
}: {
  send: (value: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  return (
    <PromptBar
      value={value}
      onChange={setValue}
      onSend={() => {
        send(value);
        setValue("");
      }}
      label="Prompt"
      sendLabel="Send prompt"
      placeholder="Tell me…"
      disabled={disabled}
    />
  );
}
describe("LearnUnlock prompt bar", () => {
  it("disables blank submission and sends a nonblank draft once through the form", () => {
    const send = vi.fn();
    render(<Draft send={send} />);
    const input = screen.getByRole("textbox");
    const button = screen.getByRole("button", {
      name: "Send prompt",
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.change(input, { target: { value: "   " } });
    expect(button.disabled).toBe(true);
    fireEvent.change(input, { target: { value: "Build a jump coach" } });
    fireEvent.click(button);
    expect(send).toHaveBeenCalledExactlyOnceWith("Build a jump coach");
    expect((input as HTMLTextAreaElement).value).toBe("");
    expect(button.disabled).toBe(true);
  });
  it("keeps Shift+Enter and IME confirmation in the editor, then sends with Enter", () => {
    const send = vi.fn();
    render(<Draft send={send} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Coach me" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    fireEvent.compositionStart(input);
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.compositionEnd(input);
    fireEvent.keyDown(input, { key: "Enter", keyCode: 229 });
    expect(send).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(send).toHaveBeenCalledExactlyOnceWith("Coach me");
  });
  it("locks the editor and send action while a response is pending", () => {
    const send = vi.fn();
    render(<Draft send={send} disabled />);
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).disabled).toBe(
      true,
    );
    expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(
      true,
    );
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    expect(send).not.toHaveBeenCalled();
  });
  it("resizes bounded multiline drafts and shrinks after clearing", () => {
    const send = vi.fn();
    render(<Draft send={send} />);
    const input = screen.getByRole("textbox") as HTMLTextAreaElement;
    Object.defineProperty(input, "scrollHeight", {
      configurable: true,
      value: 450,
    });
    fireEvent.change(input, { target: { value: "Long draft\n".repeat(40) } });
    expect(input.style.height).toBe("200px");
    Object.defineProperty(input, "scrollHeight", {
      configurable: true,
      value: 20,
    });
    fireEvent.change(input, { target: { value: "" } });
    expect(input.style.height).toBe("64px");
  });
});
