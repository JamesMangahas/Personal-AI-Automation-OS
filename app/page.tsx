"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

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

const PRIORITY_META: Record<Priority, { label: string; badge: string }> = {
  HIGH: { label: "High", badge: "bg-priority-high/15 text-priority-high" },
  MEDIUM: { label: "Medium", badge: "bg-priority-medium/15 text-priority-medium" },
  LOW: { label: "Low", badge: "bg-priority-low/15 text-priority-low" },
};

const PRIORITY_RANK: Record<Priority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

const TYPE_BADGE: Record<ActivityItem["type"], string> = {
  Task: "bg-accent/15 text-accent",
  Note: "bg-status-completed/15 text-status-completed",
  Project: "bg-priority-medium/15 text-priority-medium",
};

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

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
    { label: "Create Task", href: "/tasks" },
    { label: "Create Note", href: "/notes" },
    { label: "Create Project", href: "/projects" },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-4 py-8 sm:px-8 sm:py-10 lg:px-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl">
        <header className="mb-8 border-b border-border pb-6">
          <p className="font-mono text-xs tracking-wide text-muted">OPS · 00 DASHBOARD</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted">
            Your personal command center at a glance.
          </p>
        </header>

        {status === "loading" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-xl border border-white/10 bg-white/[0.03]"
              />
            ))}
          </div>
        )}

        {status === "error" && (
          <div className="rounded-xl border border-danger/40 border-l-4 border-l-danger bg-surface p-5">
            <p className="font-semibold text-foreground">Couldn&apos;t load dashboard</p>
            <p className="mt-1 text-sm text-muted">{error}</p>
            <button
              onClick={loadStats}
              className={`mt-4 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:opacity-90 ${FOCUS_RING}`}
            >
              Retry
            </button>
          </div>
        )}

        {status === "success" && stats && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-xl border border-white/10 bg-white/[0.04] p-5 shadow-lg shadow-black/20 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20"
                >
                  <p className="text-sm text-muted">{card.label}</p>
                  <p className="mt-2 text-3xl font-extrabold tracking-tight text-foreground">
                    {card.value}
                  </p>
                </div>
              ))}
            </div>

            <section className="mt-8">
              <h2 className="mb-4 text-xl font-bold text-foreground">Quick Actions</h2>
              <div className="flex flex-wrap gap-3">
                {quickActions.map((action) => (
                  <Link
                    key={action.label}
                    href={action.href}
                    className={`rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:opacity-90 ${FOCUS_RING}`}
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
            </section>

            <section className="mt-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">Upcoming Tasks</h2>
                <Link
                  href="/tasks"
                  className={`rounded text-sm font-medium text-accent transition-colors hover:underline ${FOCUS_RING}`}
                >
                  View all tasks →
                </Link>
              </div>

              {upcomingTasks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
                  <p className="font-semibold text-foreground">Nothing pending</p>
                  <p className="mt-1 text-sm text-muted">
                    All caught up — no incomplete tasks right now.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {upcomingTasks.map((task) => {
                    const priority = PRIORITY_META[task.priority];
                    const overdue = isOverdue(task);
                    return (
                      <li key={task.id}>
                        <Link
                          href="/tasks"
                          className={`flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-4 shadow-lg shadow-black/20 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 sm:flex-row sm:items-center sm:justify-between ${FOCUS_RING}`}
                        >
                          <span className="min-w-0 break-words font-medium text-foreground">
                            {task.title}
                          </span>
                          <span className="flex flex-wrap items-center gap-2 text-xs">
                            <span
                              className={`rounded-full px-2 py-0.5 font-semibold ${priority.badge}`}
                            >
                              {priority.label}
                            </span>
                            {task.dueDate && (
                              <span
                                className={
                                  overdue ? "font-medium text-danger" : "text-muted"
                                }
                              >
                                Due {formatDate(task.dueDate)}
                              </span>
                            )}
                            {overdue && (
                              <span className="rounded-full bg-danger/15 px-2 py-0.5 font-semibold text-danger">
                                Overdue
                              </span>
                            )}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="mt-8">
              <h2 className="mb-4 text-xl font-bold text-foreground">Recent Activity</h2>

              {recentActivity.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
                  <p className="font-semibold text-foreground">No activity yet</p>
                  <p className="mt-1 text-sm text-muted">
                    Create a task, note, or project to see it here.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {recentActivity.map((item) => (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        className={`flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-4 shadow-lg shadow-black/20 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 sm:flex-row sm:items-center sm:justify-between ${FOCUS_RING}`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_BADGE[item.type]}`}
                          >
                            {item.type}
                          </span>
                          <span className="min-w-0 break-words font-medium text-foreground">
                            {item.title}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs text-muted">
                          {formatDateTime(item.createdAt)}
                        </span>
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