"use client";

import { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export type BadgeTone =
  | "priority-high"
  | "priority-medium"
  | "priority-low"
  | "status-planning"
  | "status-active"
  | "status-onhold"
  | "status-completed"
  | "status-archived"
  | "success"
  | "danger"
  | "accent"
  | "neutral";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  "priority-high": "bg-priority-high/15 text-priority-high",
  "priority-medium": "bg-priority-medium/15 text-priority-medium",
  "priority-low": "bg-priority-low/15 text-priority-low",
  "status-planning": "bg-status-planning/15 text-status-planning",
  "status-active": "bg-status-active/15 text-status-active",
  "status-onhold": "bg-status-onhold/15 text-status-onhold",
  "status-completed": "bg-status-completed/15 text-status-completed",
  "status-archived": "bg-status-archived/15 text-status-archived",
  success: "bg-success/15 text-success",
  danger: "bg-danger/15 text-danger",
  accent: "bg-accent/15 text-accent",
  neutral: "bg-white/10 text-muted",
};

export function Badge({ tone = "neutral", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold",
        TONE_CLASSES[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}