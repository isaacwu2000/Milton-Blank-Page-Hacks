/** Adapted from LearnUnlock/Web/src/components/DropdownSelect.tsx; same interaction contract and visual structure. */

import { ChevronDown } from "lucide-react";
import {
    useEffect,
    useId,
    useRef,
    useState,
    type KeyboardEvent,
    type PointerEvent as ReactPointerEvent,
} from "react";

export type DropdownSelectOption<Value extends string> = {
    label: string;
    value: Value;
};

type DropdownSelectProps<Value extends string> = {
    label: string;
    disabled?: boolean;
    menuClassName?: string;
    onChange: (value: Value) => void;
    options: ReadonlyArray<DropdownSelectOption<Value>>;
    triggerClassName?: string;
    value: Value;
};

export function DropdownSelect<Value extends string>({
    label,
    disabled = false,
    menuClassName,
    onChange,
    options,
    triggerClassName,
    value,
}: DropdownSelectProps<Value>) {
    const listboxId = useId();
    const listboxRef = useRef<HTMLDivElement>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
    const [activeIndex, setActiveIndex] = useState(selectedIndex);
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = options[selectedIndex];
    useEffect(() => { if (disabled) setIsOpen(false); }, [disabled]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        function handleOutsidePointerDown(event: PointerEvent) {
            if (!rootRef.current?.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener("pointerdown", handleOutsidePointerDown);
        return () => document.removeEventListener("pointerdown", handleOutsidePointerDown);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const activeOption = document.getElementById(`${listboxId}-option-${activeIndex}`);
        if (activeOption && listboxRef.current?.contains(activeOption)) {
            activeOption.scrollIntoView?.({ block: "nearest" });
        }
    }, [activeIndex, isOpen, listboxId]);

    function optionId(index: number) {
        return `${listboxId}-option-${index}`;
    }

    function open() {
        if (disabled || options.length === 0) {
            return;
        }
        setActiveIndex(selectedIndex);
        setIsOpen(true);
    }

    function select(index: number) {
        const option = options[index];
        if (!option) {
            return;
        }

        onChange(option.value);
        setActiveIndex(index);
        setIsOpen(false);
        triggerRef.current?.focus();
    }

    function moveActive(direction: -1 | 1) {
        setActiveIndex((currentIndex) => {
            const nextIndex = currentIndex + direction;
            if (nextIndex < 0) {
                return options.length - 1;
            }
            if (nextIndex >= options.length) {
                return 0;
            }
            return nextIndex;
        });
    }

    function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
        switch (event.key) {
            case "ArrowDown":
                event.preventDefault();
                if (isOpen) {
                    moveActive(1);
                } else {
                    open();
                }
                break;
            case "ArrowUp":
                event.preventDefault();
                if (isOpen) {
                    moveActive(-1);
                } else {
                    open();
                }
                break;
            case "Home":
                if (isOpen) {
                    event.preventDefault();
                    setActiveIndex(0);
                }
                break;
            case "End":
                if (isOpen) {
                    event.preventDefault();
                    setActiveIndex(options.length - 1);
                }
                break;
            case "Enter":
            case " ":
                event.preventDefault();
                if (isOpen) {
                    select(activeIndex);
                } else {
                    open();
                }
                break;
            case "Escape":
                if (isOpen) {
                    event.preventDefault();
                    setIsOpen(false);
                }
                break;
            case "Tab":
                setIsOpen(false);
                break;
        }
    }

    function handleOptionPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
        event.preventDefault();
    }

    return (
        <div className="relative inline-flex min-w-0 w-full" ref={rootRef}>
            <button
                aria-activedescendant={isOpen ? optionId(activeIndex) : undefined}
                aria-controls={listboxId}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-label={label}
                className={`inline-flex min-h-[44px] w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-lg border-0 bg-(--neutral-light-100) py-1.5 pr-2 pl-2.5 text-[12px] text-(--neutral-dark-150) shadow-(--shadow-md) transition-colors duration-150 hover:bg-(--neutral-light-400) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent-700) disabled:cursor-not-allowed disabled:text-(--neutral-dark-500) aria-expanded:bg-(--neutral-light-400) motion-reduce:transition-none ${triggerClassName ?? ""}`}
                disabled={disabled || options.length === 0}
                onClick={() => isOpen ? setIsOpen(false) : open()}
                onKeyDown={handleKeyDown}
                ref={triggerRef}
                role="combobox"
                type="button"
            >
                <span className="min-w-0 flex-1 truncate text-left">{selectedOption?.label ?? "Select"}</span>
                <ChevronDown
                    aria-hidden="true"
                    className={`shrink-0 transition-transform duration-150 motion-reduce:transition-none ${isOpen ? "rotate-180" : ""}`}
                    size={17}
                />
            </button>

            {isOpen ? (
                <div
                    aria-label={label}
                    className={`absolute top-[calc(100%+8px)] left-1/2 z-50 flex w-full min-w-[max(100%,136px)] -translate-x-1/2 max-h-72 overflow-y-auto flex-col gap-0.5 rounded-xl bg-(--neutral-light-100) p-1.5 shadow-(--shadow-md) ${menuClassName ?? ""}`}
                    id={listboxId}
                    ref={listboxRef}
                    role="listbox"
                >
                    {options.map((option, index) => {
                        const isActive = index === activeIndex;
                        const isSelected = option.value === value;
                        return (
                            <div
                                aria-selected={isSelected}
                                className={`min-h-10 break-words cursor-pointer rounded-lg px-3 py-2.5 text-sm text-(--neutral-dark-200) select-none aria-selected:font-semibold aria-selected:text-(--neutral-dark-150) ${isActive || isSelected ? "bg-(--neutral-light-400)" : ""}`}
                                id={optionId(index)}
                                key={option.value}
                                onClick={() => select(index)}
                                onMouseMove={() => setActiveIndex(index)}
                                onPointerDown={handleOptionPointerDown}
                                role="option"
                            >
                                <span>{option.label}</span>
                            </div>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
}
