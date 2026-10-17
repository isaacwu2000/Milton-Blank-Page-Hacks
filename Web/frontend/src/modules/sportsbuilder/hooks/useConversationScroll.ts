import { useLayoutEffect, useRef } from "react";
import type { Message } from "../../../../../shared";

/**
 * Reveals submitted chat turns and completed responses inside their own scroller.
 * - During a request, stops at the latest message before any older exercise.
 * - Progress-only updates preserve the reader's position in chat history.
 * - Instant scrolling avoids page movement and respects reduced-motion preferences.
 */
export function useConversationScroll(
  messages: readonly Message[],
  busy: boolean,
) {
  const conversationRef = useRef<HTMLDivElement>(null);
  const latestRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const conversation = conversationRef.current;
    if (!conversation) return;
    const latest = latestRef.current;
    conversation.scrollTop =
      busy && latest
        ? Math.max(
            0,
            conversation.scrollTop +
              latest.getBoundingClientRect().bottom -
              conversation.getBoundingClientRect().bottom,
          )
        : conversation.scrollHeight;
  }, [messages, busy]);
  return { conversationRef, latestRef };
}
