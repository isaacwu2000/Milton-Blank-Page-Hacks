import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

/** Render trusted presentation formulas with accessible MathML and no embedded HTML commands. */
export function Math({
  expression,
  label,
}: {
  expression: string;
  label?: string;
}) {
  const markup = useMemo(
    () =>
      katex.renderToString(expression, {
        throwOnError: false,
        trust: false,
        strict: "error",
        output: "htmlAndMathml",
      }),
    [expression],
  );
  return (
    <span
      className="math-expression"
      aria-label={label}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
