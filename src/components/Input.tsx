import {
    createElement,
    forwardRef,
    type ComponentPropsWithoutRef,
    type HTMLAttributes,
} from "react";

const inputSurfaceClassName = [
    "rounded-xl border-0 bg-(--neutral-light-100) text-(--neutral-dark-150)",
    "shadow-inner outline-none transition-[background-color,box-shadow] duration-150",
    "focus-visible:bg-(--neutral-light-400) focus-visible:outline-none",
    "disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none",
].join(" ");

/** Shared input chrome for structured editors that supply their own editable control. */
export const InputSurface = forwardRef<
    HTMLDivElement,
    HTMLAttributes<HTMLDivElement>
>(function InputSurface({ className, ...props }, ref) {
    return (
        <div
            {...props}
            ref={ref}
            className={[
                inputSurfaceClassName,
                "focus-within:bg-(--neutral-light-400)",
                className,
            ]
                .filter(Boolean)
                .join(" ")}
        />
    );
});

type InputProps = Omit<ComponentPropsWithoutRef<"input">, "type"> & {
    type?: "email" | "password" | "search" | "tel" | "text" | "url";
};

/** Borderless text input with the shared recessed surface and focus treatment. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
    { className, type = "text", ...props },
    ref,
) {
    return (
        <input
            {...props}
            className={[inputSurfaceClassName, "[@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:text-base!", className]
                .filter(Boolean)
                .join(" ")}
            ref={ref}
            type={type}
        />
    );
});

type MultilineInputProps = Omit<
    HTMLAttributes<HTMLElement>,
    "contentEditable"
> & {
    as?: "div" | "ul";
};

/** Content-editable multiline input with the shared input surface and focus treatment. */
export const MultilineInput = forwardRef<HTMLElement, MultilineInputProps>(
    function MultilineInput({ as = "div", className, ...props }, ref) {
        return createElement(as, {
            "aria-multiline": true,
            role: "textbox",
            ...props,
            className: [inputSurfaceClassName, className]
                .filter(Boolean)
                .join(" "),
            contentEditable: true,
            ref,
        });
    },
);
