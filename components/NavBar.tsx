"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/tasks", label: "Tasks" },
  { href: "/notes", label: "Notes" },
  { href: "/projects", label: "Projects" },
  { href: "/jobs", label: "Jobs" },
  { href: "/automations", label: "Automations" },
  { href: "/automation-logs", label: "Logs" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-4xl items-center gap-6 overflow-x-auto px-4 py-3 sm:px-8 lg:px-10 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span className="shrink-0 text-sm font-bold tracking-tight text-foreground">
          Personal AI Automation OS
        </span>
        <div className="flex shrink-0 gap-4 text-sm font-medium">
          {LINKS.map((link) => {
            const isActive = pathname === link.href || pathname?.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative shrink-0 pb-1 transition-colors ${
                  isActive ? "text-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute -bottom-[13px] left-0 right-0 h-0.5 bg-accent" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}