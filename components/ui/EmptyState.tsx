"use client";

import { ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface EmptyStateProps {
  title: string;
  message?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function EmptyState({ title, message, action, icon, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-border bg-surface p-10 text-center",
        className
      )}
    >
      {icon && <div className="mx-auto mb-3 flex justify-center text-muted">{icon}</div>}
      <p className="font-semibold text-foreground">{title}</p>
      {message && <p className="mt-1 text-sm text-muted">{message}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}