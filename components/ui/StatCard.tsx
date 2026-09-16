"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "./Card";

export interface StatCardProps {
  label: string;
  value: number;
  animateDelayMs?: number;
}

function useCountUp(target: number, durationMs = 700) {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue(target);
      return;
    }

    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, durationMs]);

  return value;
}

export function StatCard({ label, value, animateDelayMs }: StatCardProps) {
  const displayValue = useCountUp(value);

  return (
    <Card
      variant="glass"
      hoverable
      animateIn
      animationDelayMs={animateDelayMs}
      className="group relative overflow-hidden"
    >
      <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-100" />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-accent/10 blur-2xl transition-opacity duration-300 group-hover:opacity-100 opacity-0"
      />
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-4xl font-extrabold tracking-tight text-foreground tabular-nums">
        {displayValue}
      </p>
    </Card>
  );
}