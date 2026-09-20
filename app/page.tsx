"use client";

import Link from "next/link";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Badge, type BadgeTone } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { SkeletonGrid } from "../components/ui/LoadingSkeleton";
import { Button } from "../components/ui/Button";

type Priority = "LOW" | "MEDIUM" | "HIGH";

type Task = {
  id: string;
  title: string;
  completed: boolean;
  priority: Priority;
  dueDate: string | null;
  createdAt: string;
};

type Note = { id: string; title: string; pinned: boolean; createdAt: string };
type Project = { id: string; name: string; createdAt: string };

type LoadStatus = "loading" | "success" | "error";

type Stats = {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  totalNotes: number;
  pinnedNotes: number;
  totalProjects: number;
  priorityCounts: Record<Priority, number>;
};

type ActivityItem = {
  key: string;
  type: "Task" | "Note" | "Project";
  title: string;
  createdAt: string;
  href: string;
};

const PRIORITY_META: Record<Priority, { label: string; tone: BadgeTone; border: string; bar: string }> = {
  HIGH: { label: "High", tone: "priority-high", border: "border-l-priority-high", bar: "bg-priority-high" },
  MEDIUM: { label: "Medium", tone: "priority-medium", border: "border-l-priority-medium", bar: "bg-priority-medium" },
  LOW: { label: "Low", tone: "priority-low", border: "border-l-priority-low", bar: "bg-priority-low" },
};

const PRIORITY_RANK: Record<Priority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
const PRIORITY_ORDER: Priority[] = ["HIGH", "MEDIUM", "LOW"];

const TYPE_TONE: Record<ActivityItem["type"], BadgeTone> = {
  Task: "accent",
  Note: "status-completed",
  Project: "priority-medium",
};

const TYPE_DOT: Record<ActivityItem["type"], string> = {
  Task: "bg-accent",
  Note: "bg-status-completed",
  Project: "bg-priority-medium",
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.completed) return false;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return new Date(task.dueDate).getTime() < startOfToday.getTime();
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
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, durationMs]);

  return value;
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

function KpiCard({
  label,
  value,
  icon,
  accentClass,
  barClass,
  delayMs,
  href,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  accentClass: string;
  barClass: string;
  delayMs: number;
  href: string;
}) {
  const displayValue = useCountUp(value);
  return (
    <Link
      href={href}
      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card
        variant="raised"
        hoverable
        animateIn
        animationDelayMs={delayMs}
        className="group relative cursor-pointer overflow-hidden pt-4"
      >
        <span className={`absolute inset-x-0 top-0 h-0.5 ${barClass}`} aria-hidden="true" />
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">{label}</p>
          <span className={accentClass}>{icon}</span>
        </div>
        <div className="mt-3 flex items-end justify-between">
          <p className="text-4xl font-extrabold tracking-tight text-foreground tabular-nums">
            {displayValue}
          </p>
          <span
            aria-hidden="true"
            className="text-muted opacity-0 transition-opacity duration-150 group-hover:text-accent group-hover:opacity-100"
          >
            -&gt;
          </span>
        </div>
      </Card>
    </Link>
  );
}

function SectionHeader({
  index,
  title,
  action,
}: {
  index: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm font-semibold text-accent">{index}</span>
        <span className="h-px w-8 bg-gradient-to-r from-accent/50 to-transparent" aria-hidden="true" />
        <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export default function Home() {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  const loadStats = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const [tasksRes, notesRes, projectsRes] = await Promise.all([
        fetch("/api/tasks"),
        fetch("/api/notes"),
        fetch("/api/projects"),
      ]);

      const [tasksData, notesData, projectsData] = await Promise.all([
        tasksRes.json(),
        notesRes.json(),
        projectsRes.json(),
      ]);

      if (!tasksRes.ok || !tasksData.success) {
        throw new Error(tasksData.error || "Failed to load tasks.");
      }
      if (!notesRes.ok || !notesData.success) {
        throw new Error(notesData.error || "Failed to load notes.");
      }
      if (!projectsRes.ok || !projectsData.success) {
        throw new Error(projectsData.error || "Failed to load projects.");
      }

      const tasks = tasksData.tasks as Task[];
      const notes = notesData.notes as Note[];
      const projects = projectsData.projects as Project[];

      const priorityCounts: Record<Priority, number> = { LOW: 0, MEDIUM: 0, HIGH: 0 };
      for (const t of tasks) priorityCounts[t.priority] += 1;

      setStats({
        totalTasks: tasks.length,
        completedTasks: tasks.filter((t) => t.completed).length,
        pendingTasks: tasks.filter((t) => !t.completed).length,
        totalNotes: notes.length,
        pinnedNotes: notes.filter((n) => n.pinned).length,
        totalProjects: projects.length,
        priorityCounts,
      });

      const pending = tasks.filter((t) => !t.completed);
      const sortedUpcoming = [...pending].sort((a, b) => {
        const aOverdue = isOverdue(a);
        const bOverdue = isOverdue(b);
        if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (a.dueDate && !b.dueDate) return -1;
        if (!a.dueDate && b.dueDate) return 1;
        return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      });
      setUpcomingTasks(sortedUpcoming.slice(0, 5));

      const activity: ActivityItem[] = [
        ...tasks.map((t) => ({
          key: `task-${t.id}`,
          type: "Task" as const,
          title: t.title,
          createdAt: t.createdAt,
          href: "/tasks",
        })),
        ...notes.map((n) => ({
          key: `note-${n.id}`,
          type: "Note" as const,
          title: n.title,
          createdAt: n.createdAt,
          href: "/notes",
        })),
        ...projects.map((p) => ({
          key: `project-${p.id}`,
          type: "Project" as const,
          title: p.name,
          createdAt: p.createdAt,
          href: `/projects/${p.id}`,
        })),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setRecentActivity(activity.slice(0, 6));

      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStats();
  }, [loadStats]);

  const quickActions = [
    { label: "Create Task", description: "Add a new task", href: "/tasks", icon: <TasksIcon /> },
    { label: "Create Note", description: "Capture an idea", href: "/notes", icon: <NotesIcon /> },
    { label: "Create Project", description: "Start something new", href: "/projects", icon: <ProjectsIcon /> },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-4 py-10 sm:px-8 sm:py-14 lg:px-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-52 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl animate-glow-pulse"
      />

      <div className="relative mx-auto max-w-6xl">
        <div className="relative mb-12 overflow-hidden border-b border-border pb-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
              maskImage: "linear-gradient(to bottom, black, transparent)",
              WebkitMaskImage: "linear-gradient(to bottom, black, transparent)",
            }}
          />

          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="animate-fade-in-up">
              <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
                <span>OPS / 00</span>
                <span className="h-3 w-px bg-border" aria-hidden="true" />
                <span>Personal Command Center</span>
              </div>
              <h1 className="mt-4 text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                Dashboard
              </h1>
              <p className="mt-4 max-w-md text-base text-muted sm:text-lg">
                Your personal command center at a glance.
              </p>
            </div>

            <div
              className="hidden w-64 shrink-0 animate-fade-in-up rounded-md border border-border bg-surface/60 p-4 lg:block"
              style={{ animationDelay: "120ms" }}
            >
              {[
                { label: "System", value: "Personal OS" },
                { label: "Modules", value: "07" },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between border-b border-border/60 py-2 font-mono text-xs last:border-0"
                >
                  <span className="uppercase tracking-[0.15em] text-muted">{row.label}</span>
                  <span className="text-foreground">{row.value}</span>
                </div>
              ))}
              <div className="flex items-center justify-between py-2 font-mono text-xs">
                <span className="uppercase tracking-[0.15em] text-muted">Sync</span>
                <span className="flex items-center gap-1.5 text-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-status-completed animate-pulse-soft" />
                  Ready
                </span>
              </div>
            </div>
          </div>
        </div>

        {status === "loading" && <SkeletonGrid count={6} />}

        {status === "error" && (
          <Card variant="raised" className="border-l-4 border-l-danger">
            <p className="font-semibold text-foreground">Couldn&apos;t load dashboard</p>
            <p className="mt-1 text-sm text-muted">{error}</p>
            <Button onClick={loadStats} className="mt-4">
              Retry
            </Button>
          </Card>
        )}

        {status === "success" && stats && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <KpiCard label="Total Tasks" value={stats.totalTasks} icon={<TasksIcon />} accentClass="text-accent" barClass="bg-accent" delayMs={0} href="/tasks" />
              <KpiCard label="Completed Tasks" value={stats.completedTasks} icon={<TasksIcon />} accentClass="text-status-completed" barClass="bg-status-completed" delayMs={50} href="/tasks" />
              <KpiCard label="Pending Tasks" value={stats.pendingTasks} icon={<TasksIcon />} accentClass="text-priority-medium" barClass="bg-priority-medium" delayMs={100} href="/tasks" />
              <KpiCard label="Total Notes" value={stats.totalNotes} icon={<NotesIcon />} accentClass="text-accent" barClass="bg-accent" delayMs={150} href="/notes" />
              <KpiCard label="Pinned Notes" value={stats.pinnedNotes} icon={<NotesIcon />} accentClass="text-status-completed" barClass="bg-status-completed" delayMs={200} href="/notes" />
              <KpiCard label="Total Projects" value={stats.totalProjects} icon={<ProjectsIcon />} accentClass="text-priority-medium" barClass="bg-priority-medium" delayMs={250} href="/projects" />
            </div>

            <section className="mt-14 animate-fade-in-up" style={{ animationDelay: "160ms" }}>
              <SectionHeader index="01" title="Quick Actions" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {quickActions.map((action) => (
                  <Link key={action.label} href={action.href} className="block">
                    <Card variant="raised" hoverable className="group relative flex items-center gap-3 overflow-hidden pt-4">
                      <span className="absolute inset-x-0 top-0 h-0.5 bg-accent/60 transition-opacity duration-150 group-hover:bg-accent" />
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent transition-transform duration-150 group-hover:translate-x-0.5">
                        {action.icon}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {action.label}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {action.description}
                        </span>
                      </span>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>

            <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-3">
              <section className="animate-fade-in-up lg:col-span-2" style={{ animationDelay: "220ms" }}>
                <SectionHeader
                  index="02"
                  title="Upcoming Tasks"
                  action={
                    <Link
                      href="/tasks"
                      className="text-sm font-medium text-accent transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
                    >
                      View all tasks -&gt;
                    </Link>
                  }
                />

                {upcomingTasks.length === 0 ? (
                  <EmptyState title="Nothing pending" message="All caught up - no incomplete tasks right now." />
                ) : (
                  <ul className="space-y-2">
                    {upcomingTasks.map((task, index) => {
                      const priority = PRIORITY_META[task.priority];
                      const overdue = isOverdue(task);
                      return (
                        <li key={task.id} className="animate-fade-in-up" style={{ animationDelay: `${260 + index * 40}ms` }}>
                          <Link href="/tasks" className="block">
                            <Card
                              variant="raised"
                              hoverable
                              className={`border-l-4 ${priority.border} flex items-center gap-3 transition-transform duration-150 hover:translate-x-1`}
                            >
                              <span className="shrink-0 font-mono text-xs text-muted">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-base font-semibold text-foreground">{task.title}</p>
                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                  <Badge tone={priority.tone}>{priority.label}</Badge>
                                  {task.dueDate && (
                                    <span className={`text-xs ${overdue ? "font-medium text-danger" : "text-muted"}`}>
                                      Due {formatDate(task.dueDate)}
                                    </span>
                                  )}
                                  {overdue && <Badge tone="danger">Overdue</Badge>}
                                </div>
                              </div>
                              <span className="shrink-0 text-muted">-&gt;</span>
                            </Card>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section className="animate-fade-in-up" style={{ animationDelay: "280ms" }}>
                <SectionHeader index="03" title="Recent Activity" />

                {recentActivity.length === 0 ? (
                  <EmptyState title="No activity yet" message="Create a task, note, or project to see it here." />
                ) : (
                  <div className="relative">
                    <span className="absolute left-[7px] top-2 bottom-2 w-px bg-border" aria-hidden="true" />
                    <ul className="space-y-3">
                      {recentActivity.map((item, index) => (
                        <li
                          key={item.key}
                          className="relative animate-fade-in-up pl-6"
                          style={{ animationDelay: `${320 + index * 35}ms` }}
                        >
                          <span
                            className={`absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-background ${TYPE_DOT[item.type]}`}
                            aria-hidden="true"
                          />
                          <Link href={item.href} className="block">
                            <Card variant="raised" hoverable className="py-2.5">
                              <div className="flex items-center gap-2">
                                <Badge tone={TYPE_TONE[item.type]}>{item.type}</Badge>
                                <span className="min-w-0 truncate text-sm font-medium text-foreground">
                                  {item.title}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-muted">{formatDateTime(item.createdAt)}</p>
                            </Card>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            </div>

            <section className="mt-14 animate-fade-in-up" style={{ animationDelay: "360ms" }}>
              <SectionHeader index="04" title="Analytics" />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card variant="raised">
                  <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">Task Status</p>
                  <p className="mt-1 text-sm text-foreground">Completed vs Pending</p>
                  <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-surface-raised">
                    {stats.totalTasks === 0 ? (
                      <div className="h-full w-full bg-border" />
                    ) : (
                      <>
                        <div
                          className="h-full bg-status-completed"
                          style={{ width: `${(stats.completedTasks / stats.totalTasks) * 100}%` }}
                        />
                        <div
                          className="h-full bg-priority-medium"
                          style={{ width: `${(stats.pendingTasks / stats.totalTasks) * 100}%` }}
                        />
                      </>
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted">
                      <span className="h-2 w-2 rounded-full bg-status-completed" />
                      Completed
                    </span>
                    <span className="font-semibold text-foreground">{stats.completedTasks}</span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted">
                      <span className="h-2 w-2 rounded-full bg-priority-medium" />
                      Pending
                    </span>
                    <span className="font-semibold text-foreground">{stats.pendingTasks}</span>
                  </div>
                </Card>

                <Card variant="raised">
                  <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">Task Priority</p>
                  <p className="mt-1 text-sm text-foreground">Low / Medium / High</p>
                  <div className="mt-4 space-y-3">
                    {PRIORITY_ORDER.map((p) => {
                      const meta = PRIORITY_META[p];
                      const count = stats.priorityCounts[p];
                      const pct = stats.totalTasks === 0 ? 0 : (count / stats.totalTasks) * 100;
                      return (
                        <div key={p}>
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="text-muted">{meta.label}</span>
                            <span className="font-semibold text-foreground">{count}</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-surface-raised">
                            <div className={`h-full ${meta.bar}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}