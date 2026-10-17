import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";

type IconButtonProps = Omit<
    ComponentPropsWithoutRef<"button">,
    "aria-label" | "children"
> & {
    children: ReactNode;
    label: string;
    surface?: "raised" | "transparent";
};

/** Compact icon-only action with shared surface and focus treatments. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton({
    children,
    className,
    label,
    surface = "raised",
    type = "button",
    ...props
}, ref) {
    return (
        <button
            {...props}
            aria-label={label}
            className={[
                "inline-grid size-7 place-items-center rounded-md",
                "text-(--neutral-dark-400)",
                surface === "raised"
                    ? "bg-(--neutral-light-100)"
                    : "bg-transparent hover:bg-(--neutral-light-100)",
                "hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-50",
                "focus-visible:outline-2 focus-visible:outline-offset-2",
                "focus-visible:outline-(--accent-700)",
                className,
            ]
                .filter(Boolean)
                .join(" ")}
            ref={ref}
            type={type}
        >
            {children}
        </button>
    );
});
