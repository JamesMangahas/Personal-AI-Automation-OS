"use client";

import { SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/cn";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  required?: boolean;
  error?: string;
}

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, required, error, className, id, children, ...props }, ref) => {
    const selectId = id ?? props.name;
    return (
      <div>
        {label && (
          <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-foreground">
            {label} {required && <span className="text-danger">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors duration-150 focus:border-accent",
            FOCUS_RING,
            error && "border-danger focus:border-danger",
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error && <p className="mt-1 text-xs font-medium text-danger">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";