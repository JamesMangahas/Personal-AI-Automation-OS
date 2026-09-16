"use client";

import Link from "next/link";
import { ReactNode, useCallback, useEffect, useState } from "react";
import { Badge, type BadgeTone } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { SkeletonGrid } from "../components/ui/LoadingSkeleton";
import { StatCard } from "../components/ui/StatCard";
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
};

type ActivityItem = {
  key: string;
  type: "Task" | "Note" | "Project";
  title: string;
  createdAt: string;
  href: string;
};

const PRIORITY_META: Record<Priority, { label: string; tone: BadgeTone; border: string }> = {
  HIGH: { label: "High", tone: "priority-high", border: "border-l-priority-high" },
  MEDIUM: { label: "Medium", tone: "priority-medium", border: "border-l-priority-medium" },
  LOW: { label: "Low", tone: "priority-low", border: "border-l-priority-low" },
};

const PRIORITY_RANK: Record<Priority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

const TYPE_TONE: Record<ActivityItem["type"], BadgeTone> = {
  Task: "accent",
  Note: "status-completed",
  Project: "priority-medium",
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

function TasksIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-5 w-5" aria-hidden="true">
      <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 8.2l1.8 1.8L11 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NotesIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="M3 2.5h7l3 3v8a1 1 0 01-1 1H3a1 1 0 01-1-1v-10a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M5.5 7h5M5.5 9.5h5M5.5 12h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function ProjectsIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="M2 4.5a1 1 0 011-1h3l1.2 1.5H13a1 1 0 011 1V12a1 1 0 01-1 1H3a1 1 0 01-1-1v-7.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
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

      setStats({
        totalTasks: tasks.length,
        completedTasks: tasks.filter((t) => t.completed).length,
        pendingTasks: tasks.filter((t) => !t.completed).length,
        totalNotes: notes.length,
        pinnedNotes: notes.filter((n) => n.pinned).length,
        totalProjects: projects.length,
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

      setRecentActivity(activity.slice(0, 8));

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

  const cards = stats
    ? [
        { label: "Total tasks", value: stats.totalTasks },
        { label: "Completed tasks", value: stats.completedTasks },
        { label: "Pending tasks", value: stats.pendingTasks },
        { label: "Total notes", value: stats.totalNotes },
        { label: "Pinned notes", value: stats.pinnedNotes },
        { label: "Total projects", value: stats.totalProjects },
      ]
    : [];

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
        <header className="mb-10 border-b border-border pb-7">
          <p className="font-mono text-xs font-medium tracking-[0.2em] text-accent">
            OPS · 00 DASHBOARD
          </p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Dashboard
          </h1>
          <p className="mt-3 max-w-xl text-base text-muted">
            Your personal command center at a glance.
          </p>
        </header>

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
              {cards.map((card, index) => (
                <StatCard
                  key={card.label}
                  label={card.label}
                  value={card.value}
                  animateDelayMs={index * 60}
                />
              ))}
            </div>

            <section className="mt-12 animate-fade-in-up" style={{ animationDelay: "140ms" }}>
              <SectionHeader index="01" title="Quick Actions" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {quickActions.map((action) => (
                  <Link key={action.label} href={action.href} className="block">
                    <Card
                      variant="raised"
                      hoverable
                      className="group flex items-center gap-3 border-l-2 border-l-transparent transition-colors duration-150 hover:border-l-accent"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent transition-transform duration-150 group-hover:scale-105">
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

            <section className="mt-12 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
              <SectionHeader
                index="02"
                title="Upcoming Tasks"
                action={
                  <Link
                    href="/tasks"
                    className="text-sm font-medium text-accent transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
                  >
                    View all tasks →
                  </Link>
                }
              />

              {upcomingTasks.length === 0 ? (
                <EmptyState
                  title="Nothing pending"
                  message="All caught up — no incomplete tasks right now."
                />
              ) : (
                <ul className="space-y-2">
                  {upcomingTasks.map((task, index) => {
                    const priority = PRIORITY_META[task.priority];
                    const overdue = isOverdue(task);
                    return (
                      <li
                        key={task.id}
                        className="animate-fade-in-up"
                        style={{ animationDelay: `${240 + index * 40}ms` }}
                      >
                        <Link href="/tasks" className="block">
                          <Card
                            variant="raised"
                            hoverable
                            className={`border-l-4 ${priority.border} flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between`}
                          >
                            <span className="min-w-0 break-words text-base font-semibold text-foreground">
                              {task.title}
                            </span>
                            <span className="flex shrink-0 flex-wrap items-center gap-2">
                              <Badge tone={priority.tone}>{priority.label}</Badge>
                              {task.dueDate && (
                                <span
                                  className={`text-xs ${overdue ? "font-medium text-danger" : "text-muted"}`}
                                >
                                  Due {formatDate(task.dueDate)}
                                </span>
                              )}
                              {overdue && <Badge tone="danger">Overdue</Badge>}
                            </span>
                          </Card>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="mt-12 animate-fade-in-up" style={{ animationDelay: "260ms" }}>
              <SectionHeader index="03" title="Recent Activity" />

              {recentActivity.length === 0 ? (
                <EmptyState
                  title="No activity yet"
                  message="Create a task, note, or project to see it here."
                />
              ) : (
                <ul className="space-y-1.5">
                  {recentActivity.map((item, index) => (
                    <li
                      key={item.key}
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${300 + index * 30}ms` }}
                    >
                      <Link href={item.href} className="block">
                        <Card
                          variant="raised"
                          hoverable
                          className="flex items-center justify-between gap-3 py-3"
                        >
                          <span className="flex min-w-0 items-center gap-2.5">
                            <Badge tone={TYPE_TONE[item.type]}>{item.type}</Badge>
                            <span className="min-w-0 truncate text-sm font-medium text-foreground">
                              {item.title}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs text-muted">
                            {formatDateTime(item.createdAt)}
                          </span>
                        </Card>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}