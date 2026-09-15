"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

function TasksIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
      <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 8.2l1.8 1.8L11 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NotesIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M3 2.5h7l3 3v8a1 1 0 01-1 1H3a1 1 0 01-1-1v-10a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M5.5 7h5M5.5 9.5h5M5.5 12h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function ProjectsIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M2 4.5a1 1 0 011-1h3l1.2 1.5H13a1 1 0 011 1V12a1 1 0 01-1 1H3a1 1 0 01-1-1v-7.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function JobsIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
      <rect x="2" y="5.5" width="12" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.5 5.5V4a1 1 0 011-1h3a1 1 0 011 1v1.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M2 9h12" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function AutomationsIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M8.8 1.5L3 9h4l-.8 5.5L13 7H9l-.2-5.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function LogsIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M3 4h10M3 8h10M3 12h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

const LINKS: { href: string; label: string; icon: () => ReactNode }[] = [
  { href: "/tasks", label: "Tasks", icon: TasksIcon },
  { href: "/notes", label: "Notes", icon: NotesIcon },
  { href: "/projects", label: "Projects", icon: ProjectsIcon },
  { href: "/jobs", label: "Jobs", icon: JobsIcon },
  { href: "/automations", label: "Automations", icon: AutomationsIcon },
  { href: "/automation-logs", label: "Logs", icon: LogsIcon },
];

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-2.5 sm:px-8 lg:px-10">
        <Link
          href="/"
          className={`flex shrink-0 items-center gap-2 rounded ${FOCUS_RING}`}
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-xs font-extrabold text-accent-foreground">
            P
          </span>
          <span className="hidden text-sm font-bold tracking-tight text-foreground sm:inline">
            Personal AI Automation OS
          </span>
        </Link>

        <span className="hidden h-5 w-px shrink-0 bg-border sm:block" aria-hidden="true" />

        <div
          className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {LINKS.map((link) => {
            const isActive = pathname === link.href || pathname?.startsWith(`${link.href}/`);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={`group flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm transition-colors ${FOCUS_RING} ${
                  isActive
                    ? "border-accent/30 bg-accent/15 font-semibold text-accent"
                    : "border-transparent text-muted hover:border-white/10 hover:bg-white/5 hover:text-foreground"
                }`}
              >
                {isActive && (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                )}
                <span
                  className={isActive ? "text-accent" : "text-muted group-hover:text-foreground"}
                >
                  <Icon />
                </span>
                <span className="whitespace-nowrap">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}