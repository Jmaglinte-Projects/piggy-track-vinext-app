import type { ComponentProps } from "react";

export function Textarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={`flex min-h-20 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#315c50] disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}
