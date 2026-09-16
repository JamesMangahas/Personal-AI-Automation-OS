"use client";

import { ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface FilterBarProps {
  children: ReactNode;
  className?: string;
}

export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-3 rounded-md border border-border bg-surface p-3 sm:flex-row sm:flex-wrap sm:items-center",
        className
      )}
    >
      {children}
    </div>
  );
}