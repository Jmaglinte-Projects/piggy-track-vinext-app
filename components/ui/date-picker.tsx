"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Icon } from "@/components/ui/icon";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDateValue, parseDateValue } from "@/presentation/date-picker-utils";

interface DatePickerProps {
  name: string;
  ariaLabel: string;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
  min?: string;
  max?: string;
}

export function DatePicker({
  name,
  ariaLabel,
  defaultValue = "",
  required = false,
  disabled = false,
  min,
  max,
}: DatePickerProps) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const selected = parseDateValue(value);
  const minimum = parseDateValue(min ?? "0001-01-01");
  const maximum = parseDateValue(max ?? "9999-12-31");

  useEffect(() => {
    const invalid =
      value && (!parseDateValue(value) || (min && value < min) || (max && value > max));
    input.current?.setCustomValidity(invalid ? "Choose a date within the allowed range." : "");
  }, [value, min, max]);

  useEffect(() => {
    const form = input.current?.form;
    const reset = () => {
      setValue(defaultValue);
      setError("");
      setOpen(false);
    };
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, [defaultValue]);

  function select(date: Date | undefined) {
    setValue(date ? formatDateValue(date) : "");
    setError("");
    setOpen(false);
  }

  return (
    <div className="relative w-full" data-slot="date-picker">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            disabled={disabled}
            aria-label={`${ariaLabel}: ${value || "Choose a date"}`}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            className="date-picker-trigger min-h-[46px] w-full justify-between border border-[#cfd2cb] bg-white px-3 py-2 text-left text-[13px] font-normal text-[#1f2d29] aria-invalid:border-red-600"
          >
            {selected
              ? selected.toLocaleDateString("en-PH", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : "Choose a date"}
            <Icon name="calendar" className="size-4 shrink-0 text-[#68746f]" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent aria-label={ariaLabel}>
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected}
            onSelect={select}
            required={required}
            autoFocus
            captionLayout="dropdown-months"
            startMonth={minimum}
            endMonth={maximum}
            disabled={[
              ...(minimum ? [{ before: minimum }] : []),
              ...(maximum ? [{ after: maximum }] : []),
            ]}
          />
          {!required && value && (
            <div className="border-t border-[#cfd2cb] p-2">
              <Button
                type="button"
                className="min-h-10 w-full text-[#315c50]"
                onClick={() => select(undefined)}
              >
                Clear date
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
      {/* A real validation control preserves native form validation and FormData. */}
      <input
        ref={input}
        name={name}
        type="text"
        value={value}
        onChange={() => {}}
        tabIndex={-1}
        aria-hidden="true"
        required={required}
        disabled={disabled}
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          opacity: 0,
          padding: 0,
          border: 0,
          pointerEvents: "none",
        }}
        onInvalid={(event) => {
          event.preventDefault();
          setError(value ? "Choose a date within the allowed range." : "Choose a date.");
          setOpen(true);
        }}
      />
      {error && (
        <span id={errorId} role="alert" className="mt-1 block text-xs text-red-700">
          {error}
        </span>
      )}
    </div>
  );
}
