"use client";

import { ReactNode } from "react";

export interface SectionHeaderProps {
  index: number;
  title: string;
  action?: ReactNode;
}

export function SectionHeader({ index, title, action }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
        <span className="font-mono text-sm font-normal text-muted">
          {String(index).padStart(2, "0")}
        </span>
        {title}
      </h2>
      {action}
    </div>
  );
}