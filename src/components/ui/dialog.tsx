"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cn } from "cn";

function Dialog({ ...properties }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...properties} />;
}

function DialogClose({ ...properties }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...properties} />;
}

function DialogContent({ className, children, ...properties }: DialogPrimitive.Popup.Props) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        data-slot="dialog-overlay"
        className="fixed inset-0 z-50 bg-black/20 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs"
      />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "bg-popover text-popover-foreground fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-3rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 flex-col gap-5 rounded-2xl border p-5 shadow-lg transition duration-200 ease-in-out data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
          className,
        )}
        {...properties}
      >
        {children}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

function DialogTitle({ className, ...properties }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("font-heading text-lg font-medium text-foreground", className)}
      {...properties}
    />
  );
}

function DialogDescription({ className, ...properties }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm leading-6", className)}
      {...properties}
    />
  );
}

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle };
