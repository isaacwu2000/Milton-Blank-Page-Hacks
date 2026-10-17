// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import type { Message } from "../../../../../shared";
import { useConversationScroll } from "./useConversationScroll";

afterEach(cleanup);
function Conversation({
  messages,
  busy,
}: {
  messages: Message[];
  busy: boolean;
}) {
  const { conversationRef, latestRef } = useConversationScroll(messages, busy);
  return (
    <div ref={conversationRef} data-testid="conversation">
      {messages.map((message, i) => (
        <p key={i}>{message.content}</p>
      ))}
      <div ref={latestRef} data-testid="latest" />
      <section>Existing practice exercise</section>
    </div>
  );
}
const welcome: Message[] = [
  { role: "assistant", content: "Ask about your form." },
];
it("reveals the latest submitted question without jumping past it to an older exercise", () => {
  const view = render(<Conversation messages={welcome} busy={false} />);
  const conversation = screen.getByTestId("conversation");
  const latest = screen.getByTestId("latest");
  Object.defineProperty(conversation, "scrollHeight", { value: 1200 });
  conversation.getBoundingClientRect = () => ({ bottom: 400 }) as DOMRect;
  latest.getBoundingClientRect = () => ({ bottom: 1000 }) as DOMRect;
  view.rerender(
    <Conversation
      messages={[...welcome, { role: "user", content: "Review my form." }]}
      busy
    />,
  );
  expect(conversation.scrollTop).toBe(600);
});
it("keeps a reader's position during progress-only renders and reveals a completed response", () => {
  const pending: Message[] = [
    ...welcome,
    { role: "user", content: "Review my form." },
  ];
  const view = render(<Conversation messages={pending} busy />);
  const conversation = screen.getByTestId("conversation");
  Object.defineProperty(conversation, "scrollHeight", { value: 1200 });
  conversation.scrollTop = 125;
  view.rerender(<Conversation messages={pending} busy />);
  expect(conversation.scrollTop).toBe(125);
  view.rerender(
    <Conversation
      messages={[
        ...pending,
        { role: "assistant", content: "At 1.2 seconds, your knee bends." },
      ]}
      busy={false}
    />,
  );
  expect(conversation.scrollTop).toBe(1200);
});
