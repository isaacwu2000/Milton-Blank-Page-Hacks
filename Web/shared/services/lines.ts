/**
 * Decodes bounded UTF-8 lines across arbitrary network chunks.
 * - Preserves split characters and a final line without a newline.
 * - Cancels the reader on parser failure or early consumer exit.
 */
export async function* readLines(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let pending = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      pending += done
        ? decoder.decode()
        : decoder.decode(value, { stream: true });
      let index: number;
      while ((index = pending.indexOf("\n")) >= 0) {
        if (index > 128_000) throw Error("A response line exceeded its limit.");
        yield pending.slice(0, index).replace(/\r$/, "");
        pending = pending.slice(index + 1);
      }
      if (pending.length > 128_000)
        throw Error("A response line exceeded its limit.");
      if (done) break;
    }
    if (pending.trim()) yield pending;
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
