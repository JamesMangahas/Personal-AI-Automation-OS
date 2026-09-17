"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { Badge } from "./ui/Badge";
import { cn } from "../lib/cn";

function DashboardIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
      <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

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

function MenuIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: DashboardIcon },
  { href: "/tasks", label: "Tasks", icon: TasksIcon },
  { href: "/notes", label: "Notes", icon: NotesIcon },
  { href: "/projects", label: "Projects", icon: ProjectsIcon },
  { href: "/jobs", label: "Jobs", icon: JobsIcon },
  { href: "/automations", label: "Automations", icon: AutomationsIcon },
  { href: "/automation-logs", label: "Logs", icon: LogsIcon },
];

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

function isActivePath(pathname: string | null, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || Boolean(pathname?.startsWith(`${href}/`));
}

function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent text-sm font-extrabold text-accent-foreground">
        P
      </span>
      <span className="leading-tight">
        <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-foreground">
          Personal AI
        </span>
        <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
          Automation OS
        </span>
      </span>
    </div>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      <p className="mb-2 px-3 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-muted">
        Modules
      </p>
      {NAV_ITEMS.map((item) => {
        const active = isActivePath(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-2.5 rounded-md border-l-2 px-3 py-2 text-sm transition-colors duration-150",
              FOCUS_RING,
              active
                ? "border-l-accent bg-accent/10 font-semibold text-accent"
                : "border-l-transparent text-muted hover:bg-white/5 hover:text-foreground"
            )}
          >
            <span className={active ? "text-accent" : "text-muted group-hover:text-foreground"}>
              <Icon />
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter() {
  return (
    <div className="border-t border-border px-3 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
        v1.0 &middot; Local environment
      </p>
    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [mobileOpen]);

  const activeItem = NAV_ITEMS.find((item) => isActivePath(pathname, item.href));

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-background">
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-border lg:bg-surface">
        <div className="px-4 py-5">
          <BrandMark />
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2">
          <NavList />
        </div>
        <SidebarFooter />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md text-foreground transition-colors hover:bg-white/5 lg:hidden",
                FOCUS_RING
              )}
            >
              <MenuIcon />
            </button>
            <div className="lg:hidden">
              <BrandMark />
            </div>
            <p className="hidden truncate font-mono text-xs uppercase tracking-[0.18em] text-muted lg:block">
              System / {activeItem?.label ?? "Dashboard"}
            </p>
          </div>
          <Badge tone="neutral" className="hidden sm:inline-flex">
            Local
          </Badge>
        </header>

        <div className="min-w-0 flex-1">{children}</div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
          />
          <div className="relative flex h-full w-72 max-w-[80vw] animate-slide-in-left flex-col border-r border-border bg-surface">
            <div className="flex items-center justify-between px-4 py-5">
              <BrandMark />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation menu"
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-white/5 hover:text-foreground",
                  FOCUS_RING
                )}
              >
                <CloseIcon />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-2">
              <NavList onNavigate={() => setMobileOpen(false)} />
            </div>
            <SidebarFooter />
          </div>
        </div>
      )}
    </div>
  );
}