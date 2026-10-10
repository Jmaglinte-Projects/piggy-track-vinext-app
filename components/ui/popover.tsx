"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import type { ComponentProps } from "react";

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;

export function PopoverContent({
  className = "",
  align = "start",
  sideOffset = 6,
  ...props
}: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        collisionPadding={12}
        className={`z-[400] max-h-[var(--radix-popover-content-available-height)] max-w-[calc(100vw-24px)] overflow-auto rounded-lg border border-[#cfd2cb] bg-white text-[#1f2d29] shadow-xl outline-none ${className}`}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
