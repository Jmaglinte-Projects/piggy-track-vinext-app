"use client";

import * as SelectPrimitive from "@radix-ui/react-select";

export interface SelectOption {
  value: string;
  label?: string;
  disabled?: boolean;
}

interface AppSelectProps {
  options: readonly SelectOption[];
  name?: string;
  id?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  ariaLabel: string;
  triggerClassName?: string;
}

export function AppSelect({
  options,
  name,
  id,
  value,
  defaultValue,
  onValueChange,
  required,
  disabled,
  ariaLabel,
  triggerClassName = "",
}: AppSelectProps) {
  return (
    <SelectPrimitive.Root
      name={name}
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      required={required}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        className={`app-select ${triggerClassName}`}
      >
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon aria-hidden="true" className="app-select-chevron">
          <svg viewBox="0 0 20 20" fill="none">
            <path d="m6 8 4 4 4-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
          </svg>
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={5}
          collisionPadding={12}
          className="app-select-content"
        >
          <SelectPrimitive.ScrollUpButton className="app-select-scroll-button" aria-label="Scroll up">
            <span aria-hidden="true">↑</span>
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="app-select-viewport">
            {options.map((option) => (
              <SelectPrimitive.Item
                className="app-select-item"
                disabled={option.disabled}
                key={option.value}
                value={option.value}
              >
                <SelectPrimitive.ItemIndicator className="app-select-check" aria-hidden="true">
                  <svg viewBox="0 0 20 20" fill="none">
                    <path d="m4 10 4 4 8-9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>{option.label ?? option.value}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="app-select-scroll-button" aria-label="Scroll down">
            <span aria-hidden="true">↓</span>
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export function selectOptions(values: readonly string[]): SelectOption[] {
  return values.map((value) => ({ value }));
}
