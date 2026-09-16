"use client";

import { ReactNode, useEffect } from "react";
import { cn } from "../../lib/cn";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  closeDisabled?: boolean;
}

const SIZE_CLASSES: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
  closeDisabled = false,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !closeDisabled) onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, closeDisabled, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={cn(
          "max-h-[90vh] w-full overflow-y-auto rounded-xl border border-surface-glass-border bg-surface-glass p-6 shadow-2xl shadow-black/40 backdrop-blur-xl animate-scale-in",
          SIZE_CLASSES[size]
        )}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            disabled={closeDisabled}
            aria-label="Close"
            className={cn(
              "rounded text-muted transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
              FOCUS_RING
            )}
          >
            ✕
          </button>
        </div>
        {children}
        {footer && <div className="mt-5">{footer}</div>}
      </div>
    </div>
  );
}