"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  title,
  description,
  children,
  busy = false,
}: {
  title: string;
  description: string;
  children: ReactNode;
  busy?: boolean;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-black/40" />
      <DialogPrimitive.Content
        className="fixed left-1/2 top-1/2 z-[101] max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-[#fffdf8] p-6 shadow-xl"
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <div className="mb-5 pr-8">
          <DialogPrimitive.Title className="font-serif text-2xl text-[#1f2d29]">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 text-sm text-[#68746f]">
            {description}
          </DialogPrimitive.Description>
        </div>
        {children}
        <DialogPrimitive.Close asChild>
          <Button
            className="icon-button absolute right-4 top-4"
            disabled={busy}
            aria-label="Close dialog"
          >
            <Icon name="close" />
          </Button>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
