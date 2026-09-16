"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface NavLinkItemProps {
  href: string;
  label: string;
  icon?: ReactNode;
  isActive: boolean;
}

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

export function NavLinkItem({ href, label, icon, isActive }: NavLinkItemProps) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm transition-colors duration-150",
        FOCUS_RING,
        isActive
          ? "border-accent/30 bg-accent/15 font-semibold text-accent"
          : "border-transparent text-muted hover:border-white/10 hover:bg-white/5 hover:text-foreground"
      )}
    >
      {isActive && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />}
      {icon && (
        <span className={isActive ? "text-accent" : "text-muted group-hover:text-foreground"}>
          {icon}
        </span>
      )}
      <span className="whitespace-nowrap">{label}</span>
    </Link>
  );
}