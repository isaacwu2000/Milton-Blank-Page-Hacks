import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

/** Typeset short mathematical labels with accessible MathML; executable HTML commands stay disabled. */
export function Math({
  expression,
  label,
}: {
  expression: string;
  label: string;
}) {
  const markup = useMemo(
    () =>
      katex.renderToString(expression, {
        output: "htmlAndMathml",
        trust: false,
        throwOnError: false,
      }),
    [expression],
  );
  return (
    <span aria-label={label} dangerouslySetInnerHTML={{ __html: markup }} />
  );
}
