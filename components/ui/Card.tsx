"use client";

import { HTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/cn";

type CardVariant = "raised" | "glass";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  hoverable?: boolean;
  animateIn?: boolean;
  animationDelayMs?: number;
}

const VARIANT_CLASSES: Record<CardVariant, string> = {
  raised: "bg-surface border border-border rounded-lg",
  glass:
    "bg-surface-glass border border-surface-glass-border rounded-xl backdrop-blur-md shadow-lg shadow-black/20",
};

const HOVER_CLASSES: Record<CardVariant, string> = {
  raised: "hover:bg-surface-raised hover:border-white/10",
  glass: "hover:border-surface-glass-hover-border hover:shadow-xl hover:shadow-black/30",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = "raised",
      hoverable = false,
      animateIn = false,
      animationDelayMs,
      className,
      style,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "p-4 sm:p-5",
          VARIANT_CLASSES[variant],
          hoverable && "transition-all duration-200 hover:-translate-y-0.5",
          hoverable && HOVER_CLASSES[variant],
          animateIn && "animate-fade-in-up",
          className
        )}
        style={
          animateIn && animationDelayMs
            ? { animationDelay: `${animationDelayMs}ms`, ...style }
            : style
        }
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";