// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Builder } from "./Builder";
import { api, post } from "../services/api";
vi.mock("../services/api", () => ({ api: vi.fn(), post: vi.fn() }));
vi.mock("../hooks/useAgentJob", () => ({ useAgentJob: vi.fn() }));
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
it("warns before an early build and includes an unsent idea when continuing", async () => {
  vi.mocked(post).mockResolvedValue({ id: "job" });
  render(<Builder onBuilt={vi.fn()} />);
  fireEvent.change(
    screen.getByRole("textbox", { name: "Answer the builder" }),
    { target: { value: "A beginner tennis coach" } },
  );
  fireEvent.click(screen.getByRole("button", { name: "Build my tool" }));
  expect(post).not.toHaveBeenCalled();
  expect(
    screen.getByRole("dialog", {
      name: "Build before finishing the interview?",
    }),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Build anyway" }));
  await waitFor(() =>
    expect(post).toHaveBeenCalledWith(
      "/agent/build",
      expect.objectContaining({
        brief: undefined,
        messages: expect.arrayContaining([
          { role: "user", content: "A beginner tennis coach" },
        ]),
      }),
    ),
  );
  expect(
    screen
      .getByRole("button", { name: /Building your tool/ })
      .hasAttribute("disabled"),
  ).toBe(true);
});
it("lets the user keep interviewing without starting a build", () => {
  render(<Builder onBuilt={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Build my tool" }));
  fireEvent.click(screen.getByRole("button", { name: "Keep talking" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(post).not.toHaveBeenCalled();
});

it("uploads an optional reference through the composer plus action", async () => {
  vi.mocked(api).mockResolvedValue({ id: "reference" });
  vi.mocked(post).mockResolvedValue({});
  render(<Builder onBuilt={vi.fn()} />);
  const input = screen.getByLabelText(
    "Upload optional good form reference",
  ) as HTMLInputElement;
  const openPicker = vi.spyOn(input, "click");
  fireEvent.click(
    screen.getByRole("button", { name: "Add a good-form video" }),
  );
  expect(openPicker).toHaveBeenCalledOnce();
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
it("keeps an early-build failure recoverable", async () => {
  vi.mocked(post).mockRejectedValue(Error("Please retry the build."));
  render(<Builder onBuilt={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Build my tool" }));
  fireEvent.click(screen.getByRole("button", { name: "Build anyway" }));
  await screen.findByText("Please retry the build.");
  expect(
    screen
      .getByRole("button", { name: "Build my tool" })
      .hasAttribute("disabled"),
  ).toBe(false);
});

it("restores a rejected interview draft and retries without duplicate user turns", async () => {
  vi.mocked(post)
    .mockRejectedValueOnce(Error("The AI returned an incomplete response. Please retry your message."))
    .mockResolvedValueOnce({ reply: "Who is it for?", ready: false });
  render(<Builder onBuilt={vi.fn()} />);
  const input = screen.getByRole("textbox", { name: "Answer the builder" }) as HTMLTextAreaElement;
  const idea = "Build a coaching tool which analyzes my squash serve from the forehand side.";
  fireEvent.change(input, { target: { value: idea } });
  fireEvent.click(screen.getByRole("button", { name: "Send answer" }));
  await screen.findByText(/The AI returned an incomplete response/);
  expect(input.value).toBe(idea);
  fireEvent.click(screen.getByRole("button", { name: "Send answer" }));
  await screen.findByText("Who is it for?");
  expect(screen.getAllByText(idea)).toHaveLength(1);
  expect(vi.mocked(post).mock.calls[1][1]).toEqual({ messages: expect.arrayContaining([{ role: "user", content: idea }]) });
  expect((vi.mocked(post).mock.calls[1][1] as { messages: unknown[] }).messages).toHaveLength(2);
});

it("shows concise activity while preparing the next interview question", async () => {
  vi.mocked(post).mockReturnValue(new Promise(() => {}));
  render(<Builder onBuilt={vi.fn()} />);
  fireEvent.change(screen.getByRole("textbox", { name: "Answer the builder" }), {
    target: { value: "Help me build one for situps" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send answer" }));
  expect(screen.getByRole("status").textContent).toContain("Preparing your next question");
});

it("reveals the newest interview reply inside the chat scroller", async () => {
  vi.mocked(post).mockResolvedValue({ reply: "Who is the sit-up coach for?", ready: false });
  const view = render(<Builder onBuilt={vi.fn()} />);
  const conversation = view.container.querySelector(".conversation") as HTMLDivElement;
  Object.defineProperty(conversation, "scrollHeight", { value: 900 });
  fireEvent.change(screen.getByRole("textbox", { name: "Answer the builder" }), {
    target: { value: "Help me build one for situps" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send answer" }));
  await screen.findByText("Who is the sit-up coach for?");
  expect(conversation.scrollTop).toBe(900);
});
