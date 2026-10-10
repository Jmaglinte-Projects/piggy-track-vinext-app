import type { ComponentProps } from "react";

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      className={`flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#315c50] disabled:opacity-50 aria-invalid:border-red-600 ${className}`}
      {...props}
    />
  );
}
