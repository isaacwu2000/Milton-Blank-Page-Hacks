// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SessionPreview } from "./SessionPreview";
afterEach(cleanup);
describe("private session first-frame preview", () => {
  it("keeps a fixed skeleton until the JPEG loads without fetching full video", () => {
    const { container } = render(<SessionPreview sessionId="clip-id" />);
    const frame = container.firstElementChild!;
    const image = container.querySelector("img")!;
    expect(image.getAttribute("src")).toBe("/api/sessions/clip-id/preview");
    expect(image.getAttribute("loading")).toBe("lazy");
    expect(frame.getAttribute("aria-busy")).toBe("true");
    expect(frame.className).toContain("motion-safe:animate-pulse");
    expect(image.className).toContain("opacity-0");
    fireEvent.load(image);
    expect(frame.getAttribute("aria-busy")).toBe("false");
    expect(image.className).toContain("opacity-100");
    expect(container.querySelector("svg")).toBeNull();
    expect(container.querySelector("video")).toBeNull();
  });
  it("leaves a static film placeholder after errors without retry loops", () => {
    const { container, rerender } = render(
      <SessionPreview sessionId="missing" />,
    );
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).toBeTruthy();
    expect(container.firstElementChild?.getAttribute("aria-busy")).toBe(
      "false",
    );
    expect(container.firstElementChild?.className).not.toContain(
      "animate-pulse",
    );
    rerender(<SessionPreview sessionId="missing" />);
    expect(container.querySelector("img")).toBeNull();
  });
});
