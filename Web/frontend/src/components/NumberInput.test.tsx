// @vitest-environment jsdom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { NumberInput } from "./NumberInput";
afterEach(cleanup);
function Field({ step = "any" }: { step?: number | "any" }) {
  const [value, setValue] = useState("");
  return (
    <label htmlFor="height">
      Height
      <NumberInput
        id="height"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        required
        min={30}
        max={300}
        step={step}
        suffix="cm"
      />
    </label>
  );
}
describe("custom numeric input", () => {
  it("keeps empty and partial decimal drafts editable and accepts a valid decimal", () => {
    render(<Field />);
    const input = screen.getByRole("textbox", {
      name: "Height",
    }) as HTMLInputElement;
    expect(input.type).toBe("text");
    expect(input.inputMode).toBe("decimal");
    expect(input.checkValidity()).toBe(false);
    fireEvent.change(input, { target: { value: "." } });
    expect(input.value).toBe(".");
    expect(input.checkValidity()).toBe(false);
    fireEvent.change(input, { target: { value: "178.5" } });
    expect(input.checkValidity()).toBe(true);
    fireEvent.change(input, { target: { value: "" } });
    expect(input.value).toBe("");
    expect(input.checkValidity()).toBe(false);
  });
  it("rejects out-of-range values and malformed pasted text without coercing the draft", () => {
    render(<Field />);
    const input = screen.getByRole("textbox", {
      name: "Height",
    }) as HTMLInputElement;
    for (const draft of ["29.9", "300.1", "178cm", "0xB2", "Infinity"]) {
      fireEvent.paste(input, { clipboardData: { getData: () => draft } });
      fireEvent.input(input, { target: { value: draft } });
      expect(input.value).toBe(draft);
      expect(input.checkValidity()).toBe(false);
      expect(input.getAttribute("aria-invalid")).toBe("true");
    }
    fireEvent.paste(input, { clipboardData: { getData: () => " 178.25 " } });
    fireEvent.input(input, { target: { value: " 178.25 " } });
    expect(input.checkValidity()).toBe(true);
  });
  it("enforces optional step increments with decimal tolerance", () => {
    render(<Field step={0.1} />);
    const input = screen.getByRole("textbox", {
      name: "Height",
    }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "178.3" } });
    expect(input.checkValidity()).toBe(true);
    fireEvent.change(input, { target: { value: "178.35" } });
    expect(input.checkValidity()).toBe(false);
  });
});
