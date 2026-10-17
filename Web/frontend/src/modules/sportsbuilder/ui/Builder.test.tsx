// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Builder } from "./Builder";
import { api, post } from "../services/api";
import { streamBuilder } from "../services/builderStream";
import { sampleTool } from "../../../../../shared";
vi.mock("../services/api", () => ({ api: vi.fn(), post: vi.fn() }));
vi.mock("../services/builderStream", () => ({ streamBuilder: vi.fn() }));
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
const answer = (value: string) => {
  fireEvent.change(
    screen.getByRole("textbox", { name: "Answer the builder" }),
    { target: { value } },
  );
  fireEvent.click(screen.getByRole("button", { name: "Send answer" }));
};
it("keeps the starter interactive, then enables explicit saving without a screenshot job", async () => {
  vi.mocked(streamBuilder).mockImplementation(async (_turn, emit) => {
    emit({
      type: "complete",
      reply: "Try this coach",
      ready: false,
      preview: sampleTool,
      id: "validated",
      revision: 1,
    });
  });
  const onBuilt = vi.fn();
  render(<Builder onClose={vi.fn()} onBuilt={onBuilt} />);
  expect(screen.getByRole("region", { name: "Coach preview" })).toBeTruthy();
  answer("Build a coach");
  await screen.findByRole("heading", { name: sampleTool.name });
  expect(post).not.toHaveBeenCalled();
  expect(onBuilt).not.toHaveBeenCalled();
  vi.mocked(post).mockResolvedValueOnce({ ...sampleTool, id: "saved" });
  fireEvent.click(screen.getByRole("button", { name: "Save coach" }));
  await waitFor(() =>
    expect(post).toHaveBeenCalledWith("/agent/jobs/validated/save", {}),
  );
  expect(onBuilt).toHaveBeenCalledOnce();
});
it("preserves a saved preview after failed repair and retries the request", async () => {
  vi.mocked(streamBuilder)
    .mockRejectedValueOnce(Error("The update still has an invalid unit."))
    .mockImplementationOnce(async (_turn, emit) =>
      emit({
        type: "complete",
        reply: "Updated",
        ready: false,
        preview: { ...sampleTool, name: "Gentler coach" },
        id: "fixed",
        revision: 2,
      }),
    );
  render(
    <Builder initialTool={sampleTool} onClose={vi.fn()} onBuilt={vi.fn()} />,
  );
  answer("Make it gentler");
  await screen.findByText("The update still has an invalid unit.");
  expect(screen.getByRole("heading", { name: sampleTool.name })).toBeTruthy();
  expect(
    (
      screen.getByRole("textbox", {
        name: "Answer the builder",
      }) as HTMLTextAreaElement
    ).value,
  ).toBe("Make it gentler");
  fireEvent.click(screen.getByRole("button", { name: "Retry update" }));
  await screen.findByRole("heading", { name: "Gentler coach" });
  expect(
    screen.getByRole("button", { name: "Save coach" }).hasAttribute("disabled"),
  ).toBe(false);
  expect(streamBuilder).toHaveBeenCalledTimes(2);
  expect(
    vi
      .mocked(streamBuilder)
      .mock.calls[1][0].messages.filter((m) => m.role === "user"),
  ).toHaveLength(1);
});
it("keeps a typed follow-up when the active request fails", async () => {
  let fail!: (error: Error) => void;
  vi.mocked(streamBuilder).mockReturnValue(
    new Promise((_resolve, reject) => {
      fail = reject;
    }),
  );
  render(<Builder onClose={vi.fn()} onBuilt={vi.fn()} />);
  answer("Build a lunge coach");
  const input = screen.getByRole("textbox", {
    name: "Answer the builder",
  }) as HTMLTextAreaElement;
  fireEvent.change(input, { target: { value: "Also use a side camera" } });
  await act(async () => fail(Error("Connection interrupted")));
  expect(input.value).toBe("Also use a side camera");
  expect(screen.getByRole("button", { name: "Retry update" })).toBeTruthy();
});
it("warns before building early and includes the unsent idea", async () => {
  vi.mocked(streamBuilder).mockReturnValue(new Promise(() => {}));
  render(<Builder onClose={vi.fn()} onBuilt={vi.fn()} />);
  fireEvent.change(
    screen.getByRole("textbox", { name: "Answer the builder" }),
    { target: { value: "A beginner tennis coach" } },
  );
  fireEvent.click(screen.getByRole("button", { name: "Build my tool" }));
  expect(streamBuilder).not.toHaveBeenCalled();
  expect(
    screen.getByRole("dialog", {
      name: "Build before finishing the interview?",
    }),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Build anyway" }));
  await waitFor(() =>
    expect(streamBuilder).toHaveBeenCalledWith(
      expect.objectContaining({
        force: true,
        messages: expect.arrayContaining([
          { role: "user", content: "A beginner tennis coach" },
        ]),
      }),
      expect.any(Function),
      expect.any(AbortSignal),
    ),
  );
});
it("lets the user keep talking without starting an early build", () => {
  render(<Builder onClose={vi.fn()} onBuilt={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Build my tool" }));
  fireEvent.click(screen.getByRole("button", { name: "Keep talking" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(streamBuilder).not.toHaveBeenCalled();
});
it("uploads an optional reference through the composer", async () => {
  vi.mocked(api).mockResolvedValue({ id: "reference" });
  vi.mocked(post).mockResolvedValue({});
  render(<Builder onClose={vi.fn()} onBuilt={vi.fn()} />);
  const input = screen.getByLabelText(
    "Upload optional good form reference",
  ) as HTMLInputElement;
  const picker = vi.spyOn(input, "click");
  fireEvent.click(
    screen.getByRole("button", { name: "Add a good-form video" }),
  );
  expect(picker).toHaveBeenCalledOnce();
  fireEvent.change(input, {
    target: {
      files: [
        new File(["video"], "good-form.mov", { type: "video/quicktime" }),
      ],
    },
  });
  await screen.findByText("good-form.mov");
  expect(api).toHaveBeenCalledWith(
    "/api/upload",
    expect.objectContaining({ method: "POST", body: expect.any(FormData) }),
  );
  expect(post).toHaveBeenCalledWith("/api/sessions/reference/analyze", {});
});
it("shows automatic repair activity while keeping the previous coach usable", async () => {
  vi.mocked(streamBuilder).mockImplementation((_turn, emit) => {
    emit({ type: "status", message: "Fixing a configuration issue…" });
    return new Promise(() => {});
  });
  render(
    <Builder initialTool={sampleTool} onClose={vi.fn()} onBuilt={vi.fn()} />,
  );
  answer("Change the metrics");
  expect(
    screen.getAllByText(/Fixing a configuration issue/).length,
  ).toBeGreaterThan(0);
  expect(screen.getByRole("heading", { name: sampleTool.name })).toBeTruthy();
  expect(
    screen
      .getByRole("textbox", { name: "Answer the builder" })
      .hasAttribute("disabled"),
  ).toBe(false);
});
it("reveals streamed replies inside the conversation scroller", async () => {
  vi.mocked(streamBuilder).mockImplementation(async (_turn, emit) =>
    emit({
      type: "complete",
      reply: "Who is this coach for?",
      ready: false,
      revision: 0,
    }),
  );
  const view = render(<Builder onClose={vi.fn()} onBuilt={vi.fn()} />);
  const conversation = view.container.querySelector(
    ".conversation",
  ) as HTMLDivElement;
  Object.defineProperty(conversation, "scrollHeight", { value: 900 });
  answer("Help me build a sit-up coach");
  await screen.findByText("Who is this coach for?");
  expect(conversation.scrollTop).toBe(900);
});
it("preserves an unsent follow-up when retrying an earlier failed request", async () => {
  vi.mocked(streamBuilder)
    .mockRejectedValueOnce(Error("Try again"))
    .mockImplementationOnce(async (_turn, emit) =>
      emit({ type: "complete", reply: "Updated", ready: false, revision: 0 }),
    );
  render(<Builder onClose={vi.fn()} onBuilt={vi.fn()} />);
  answer("Build a coach");
  await screen.findByText("Try again");
  const input = screen.getByRole("textbox", {
    name: "Answer the builder",
  }) as HTMLTextAreaElement;
  fireEvent.change(input, { target: { value: "Also use a side camera" } });
  fireEvent.click(screen.getByRole("button", { name: "Retry update" }));
  await screen.findByText("Updated");
  expect(input.value).toBe("Also use a side camera");
});


it("keeps the removed header X absent and the modal X equivalent to Keep talking", () => {
  render(<Builder onBuilt={vi.fn()} />);
  expect(screen.queryByRole("button", { name: "Close tool builder" })).toBeNull();
  const build = screen.getByRole("button", { name: "Build my tool" });
  build.focus();
  fireEvent.click(build);
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Keep talking" }));
  fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.activeElement).toBe(build);
  expect(streamBuilder).not.toHaveBeenCalled();
});
