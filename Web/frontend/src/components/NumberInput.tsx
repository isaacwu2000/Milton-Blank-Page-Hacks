import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
} from "react";
import { Input } from "./Input";

type NumberInputProps = Omit<
  ComponentPropsWithoutRef<typeof Input>,
  "type" | "inputMode" | "min" | "max" | "step"
> & {
  min?: number;
  max?: number;
  step?: number | "any";
  suffix?: string;
};

function numberError(
  value: string,
  min?: number,
  max?: number,
  step?: number | "any",
) {
  const draft = value.trim();
  if (!draft) return ""; // Native required validation handles an empty required field.
  if (
    !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(draft) ||
    !Number.isFinite(Number(draft))
  )
    return "Enter a valid number.";
  const number = Number(draft);
  if (min !== undefined && number < min)
    return `Enter a number of at least ${min}.`;
  if (max !== undefined && number > max)
    return `Enter a number no greater than ${max}.`;
  if (typeof step === "number" && step > 0) {
    const position = (number - (min ?? 0)) / step;
    if (
      Math.abs(position - Math.round(position)) >
      1e-8 * Math.max(1, Math.abs(position))
    )
      return `Use increments of ${step}.`;
  }
  return "";
}

/** LearnUnlock's grapher NumberCell pattern: recessed Input, decimal keyboard, editable text draft. */
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  function NumberInput(
    {
      min,
      max,
      step = "any",
      suffix,
      value,
      defaultValue,
      onChange,
      onBlur,
      className,
      ...props
    },
    forwardedRef,
  ) {
    const input = useRef<HTMLInputElement>(null);
    const [invalid, setInvalid] = useState(false);
    useImperativeHandle(forwardedRef, () => input.current!, []);
    function validate(element: HTMLInputElement) {
      const error = numberError(element.value, min, max, step);
      element.setCustomValidity(error);
      setInvalid(Boolean(error));
    }
    useEffect(() => {
      if (input.current) validate(input.current);
    }, [value, min, max, step]);
    const control = (
      <Input
        {...props}
        ref={input}
        type="text"
        inputMode="decimal"
        value={value}
        defaultValue={defaultValue}
        aria-invalid={props["aria-invalid"] ?? (invalid || undefined)}
        className={[
          "w-full min-w-0 tabular-nums",
          suffix ? "pr-12" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        onChange={(event) => {
          validate(event.currentTarget);
          onChange?.(event);
        }}
        onBlur={(event) => {
          validate(event.currentTarget);
          onBlur?.(event);
        }}
      />
    );
    return suffix ? (
      <span className="relative block w-full">
        {control}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-(--neutral-dark-500)"
        >
          {suffix}
        </span>
      </span>
    ) : (
      control
    );
  },
);
