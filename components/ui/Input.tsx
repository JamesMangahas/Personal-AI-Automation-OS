"use client";

import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  required?: boolean;
  error?: string;
}

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, required, error, className, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div>
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-foreground">
            {label} {required && <span className="text-danger">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors duration-150 focus:border-accent",
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

Input.displayName = "Input";