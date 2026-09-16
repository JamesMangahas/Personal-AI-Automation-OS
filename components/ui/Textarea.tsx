"use client";

import { TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/cn";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  required?: boolean;
  error?: string;
}

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, required, error, className, id, rows = 3, ...props }, ref) => {
    const textareaId = id ?? props.name;
    return (
      <div>
        {label && (
          <label htmlFor={textareaId} className="mb-1.5 block text-sm font-medium text-foreground">
            {label} {required && <span className="text-danger">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={cn(
            "w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors duration-150 focus:border-accent",
            FOCUS_RING,
            error && "border-danger focus:border-danger",
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs font-medium text-danger">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";