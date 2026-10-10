"use client";

import { useEffect, useRef, type ComponentProps } from "react";
import { DayPicker, type DayButton } from "react-day-picker";
import { Button } from "@/components/ui/button";

// Adapted from shadcn/ui Calendar to the project's existing Button and color tokens.
export function Calendar({
  className = "",
  classNames,
  components,
  ...props
}: ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays
      className={`p-3 ${className}`}
      classNames={{
        months: "relative flex flex-col gap-4",
        month: "flex w-full flex-col gap-3",
        nav: "absolute inset-x-0 top-0 flex justify-between",
        button_previous: "calendar-nav-button",
        button_next: "calendar-nav-button",
        month_caption: "flex h-10 items-center justify-center px-10",
        caption_label: "flex items-center gap-1 text-sm font-medium",
        dropdowns: "flex items-center justify-center gap-1 text-sm",
        dropdown_root:
          "relative rounded-md border border-[#cfd2cb] px-2 py-1 focus-within:ring-2 focus-within:ring-[#315c50]",
        dropdown: "absolute inset-0 w-full cursor-pointer opacity-0",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-10 text-center text-xs font-normal text-[#68746f]",
        week: "mt-1 flex",
        day: "relative size-10 p-0 text-center text-sm",
        today: "rounded-md bg-[#e5ece7] font-semibold",
        outside: "text-[#89918d]",
        disabled: "opacity-40",
        hidden: "invisible",
        ...classNames,
      }}
      components={{ DayButton: CalendarDayButton, ...components }}
      {...props}
    />
  );
}

function CalendarDayButton({
  day,
  modifiers,
  className = "",
  ...props
}: ComponentProps<typeof DayButton>) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);
  return (
    <Button
      ref={ref}
      data-day={day.date.toLocaleDateString("en-CA")}
      data-selected={modifiers.selected}
      className={`calendar-day-button size-10 p-0 font-normal hover:bg-[#e5ece7] data-[selected=true]:bg-[#315c50] data-[selected=true]:text-white ${className}`}
      {...props}
    />
  );
}
