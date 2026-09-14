"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Priority = "LOW" | "MEDIUM" | "HIGH";

type Task = {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  priority: Priority;
  dueDate: string | null;
  category: string | null;
  createdAt: string;
  updatedAt: string;
};

type LoadStatus = "loading" | "success" | "error";
type Toast = { type: "success" | "error"; message: string };
type StatusFilter = "ALL" | "COMPLETED" | "INCOMPLETE";
type PriorityFilter = "ALL" | Priority;
type SortOption = "NEWEST" | "OLDEST" | "DUE_DATE" | "PRIORITY";

type FormState = {
  title: string;
  description: string;
  priority: Priority;
  dueDate: string;
  category: string;
};

type PriorityMetaEntry = { label: string; dot: string; text: string; border: string; badge: string };

const PRIORITY_META: Record<Priority, PriorityMetaEntry> = {
  HIGH: {
    label: "High",
    dot: "bg-priority-high",
    text: "text-priority-high",
    border: "border-l-priority-high",
    badge: "bg-priority-high/15 text-priority-high",
  },
  MEDIUM: {
    label: "Medium",
    dot: "bg-priority-medium",
    text: "text-priority-medium",
    border: "border-l-priority-medium",
    badge: "bg-priority-medium/15 text-priority-medium",
  },
  LOW: {
    label: "Low",
    dot: "bg-priority-low",
    text: "text-priority-low",
    border: "border-l-priority-low",
    badge: "bg-priority-low/15 text-priority-low",
  },
};

const PRIORITY_RANK: Record<Priority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

const CATEGORY_PALETTE = ["#2DD4BF", "#8B5CF6", "#F59E0B", "#FB7185", "#38BDF8", "#A3E635"];

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function categoryColor(category: string): string {
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CATEGORY_PALETTE[Math.abs(hash) % CATEGORY_PALETTE.length];
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function toDateInputValue(value: string | null): string {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.completed) return false;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return new Date(task.dueDate).getTime() < startOfToday.getTime();
}

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  priority: "MEDIUM",
  dueDate: "",
  category: "",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(EMPTY_FORM);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [toast, setToast] = useState<Toast | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("NEWEST");

  const loadTasks = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load tasks.");
      }
      setTasks(data.tasks as Task[]);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const visibleTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = tasks.filter((task) => {
      if (statusFilter === "COMPLETED" && !task.completed) return false;
      if (statusFilter === "INCOMPLETE" && task.completed) return false;
      if (priorityFilter !== "ALL" && task.priority !== priorityFilter) return false;

      if (query) {
        const haystack = [task.title, task.description ?? "", task.category ?? ""]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "OLDEST":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "DUE_DATE": {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        case "PRIORITY":
          return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        case "NEWEST":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return sorted;
  }, [tasks, searchQuery, statusFilter, priorityFilter, sortBy]);

  function openCreateModal() {
    setCreateForm(EMPTY_FORM);
    setCreateError(null);
    setIsCreateOpen(true);
  }

  function closeCreateModal() {
    if (creating) return;
    setIsCreateOpen(false);
  }

  async function handleCreateSubmit(e: FormEvent) {
    e.preventDefault();

    const title = createForm.title.trim();
    if (!title) {
      setCreateError("Title is required.");
      return;
    }

    setCreateError(null);
    setCreating(true);

    try {
      const body: Record<string, string> = { title, priority: createForm.priority };
      if (createForm.description.trim()) body.description = createForm.description.trim();
      if (createForm.dueDate) body.dueDate = createForm.dueDate;
      if (createForm.category.trim()) body.category = createForm.category.trim();

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create task.");
      }

      setIsCreateOpen(false);
      setCreateForm(EMPTY_FORM);
      setToast({ type: "success", message: `"${data.task.title}" was created.` });
      await loadTasks();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create task.");
    } finally {
      setCreating(false);
    }
  }

  function openEditModal(task: Task) {
    setEditingTask(task);
    setEditForm({
      title: task.title,
      description: task.description ?? "",
      priority: task.priority,
      dueDate: toDateInputValue(task.dueDate),
      category: task.category ?? "",
    });
    setEditError(null);
  }

  function closeEditModal() {
    if (saving) return;
    setEditingTask(null);
  }

  async function handleEditSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editingTask) return;

    const title = editForm.title.trim();
    if (!title) {
      setEditError("Title is required.");
      return;
    }

    const changes: Record<string, string | null> = {};

    if (title !== editingTask.title) {
      changes.title = title;
    }

    const newDescription = editForm.description.trim();
    const oldDescription = editingTask.description ?? "";
    if (newDescription !== oldDescription) {
      changes.description = newDescription === "" ? null : newDescription;
    }

    if (editForm.priority !== editingTask.priority) {
      changes.priority = editForm.priority;
    }

    const oldDueDate = toDateInputValue(editingTask.dueDate);
    if (editForm.dueDate !== oldDueDate) {
      changes.dueDate = editForm.dueDate === "" ? null : editForm.dueDate;
    }

    const newCategory = editForm.category.trim();
    const oldCategory = editingTask.category ?? "";
    if (newCategory !== oldCategory) {
      changes.category = newCategory === "" ? null : newCategory;
    }

    if (Object.keys(changes).length === 0) {
      setEditingTask(null);
      return;
    }

    setEditError(null);
    setSaving(true);

    try {
      const res = await fetch(`/api/tasks/${editingTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update task.");
      }

      setEditingTask(null);
      setToast({ type: "success", message: `"${data.task.title}" was updated.` });
      await loadTasks();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update task.");
    } finally {
      setSaving(false);
    }
  }

  function openDeleteConfirm(task: Task) {
    setDeletingTask(task);
    setDeleteError(null);
  }

  function closeDeleteConfirm() {
    if (deleting) return;
    setDeletingTask(null);
  }

  async function handleConfirmDelete() {
    if (!deletingTask) return;

    setDeleteError(null);
    setDeleting(true);

    try {
      const res = await fetch(`/api/tasks/${deletingTask.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete task.");
      }

      const deletedTitle = deletingTask.title;
      setDeletingTask(null);
      setToast({ type: "success", message: `"${deletedTitle}" was deleted.` });
      await loadTasks();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete task.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleToggleComplete(task: Task) {
    setTogglingId(task.id);

    const nextCompleted = !task.completed;

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: nextCompleted }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update task.");
      }

      setTasks((current) =>
        current.map((t) => (t.id === task.id ? { ...t, completed: nextCompleted } : t))
      );
      setToast({
        type: "success",
        message: `"${task.title}" marked ${nextCompleted ? "complete" : "incomplete"}.`,
      });
    } catch (err) {
      setToast({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to update task.",
      });
    } finally {
      setTogglingId(null);
    }
  }

  const hasActiveFilters =
    searchQuery.trim() !== "" || statusFilter !== "ALL" || priorityFilter !== "ALL";

  function clearFilters() {
    setSearchQuery("");
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-8 sm:py-10 lg:px-10">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 border-b border-border pb-6">
          <p className="font-mono text-xs tracking-wide text-muted">OPS · 01 TASKS</p>
          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                Tasks
              </h1>
              <p className="mt-1 text-sm text-muted">
                {status === "success"
                  ? `${visibleTasks.length} of ${tasks.length} task${
                      tasks.length === 1 ? "" : "s"
                    }`
                  : "Personal AI Automation OS"}
              </p>
            </div>
            <button
              onClick={openCreateModal}
              className={`w-full rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:opacity-90 sm:w-auto ${FOCUS_RING}`}
            >
              Create task
            </button>
          </div>
        </header>

        {status === "success" && tasks.length > 0 && (
          <div className="mb-6 flex flex-col gap-3 rounded-md border border-border bg-surface p-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex-1 sm:min-w-[220px]">
              <label htmlFor="task-search" className="sr-only">
                Search tasks
              </label>
              <input
                id="task-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title, description, category..."
                className={`w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <div>
                <label htmlFor="status-filter" className="sr-only">
                  Filter by status
                </label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className={`rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                >
                  <option value="ALL">All statuses</option>
                  <option value="INCOMPLETE">Incomplete</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              <div>
                <label htmlFor="priority-filter" className="sr-only">
                  Filter by priority
                </label>
                <select
                  id="priority-filter"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
                  className={`rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                >
                  <option value="ALL">All priorities</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>

              <div>
                <label htmlFor="sort-by" className="sr-only">
                  Sort tasks
                </label>
                <select
                  id="sort-by"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className={`rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                >
                  <option value="NEWEST">Newest first</option>
                  <option value="OLDEST">Oldest first</option>
                  <option value="DUE_DATE">Due date</option>
                  <option value="PRIORITY">Priority</option>
                </select>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className={`rounded-md px-2 text-sm font-medium text-accent transition-colors hover:underline ${FOCUS_RING}`}
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        )}

        {toast && (
          <div
            role="status"
            aria-live="polite"
            className={`mb-6 flex items-start justify-between gap-3 rounded-md border-l-4 p-4 text-sm ${
              toast.type === "success"
                ? "border-l-success bg-surface text-foreground"
                : "border-l-danger bg-surface text-foreground"
            }`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              aria-label="Dismiss message"
              className={`shrink-0 text-muted hover:text-foreground ${FOCUS_RING}`}
            >
              ✕
            </button>
          </div>
        )}

        {status === "loading" && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-md border border-border bg-surface"
              />
            ))}
          </div>
        )}

        {status === "error" && (
          <div className="rounded-md border border-danger/40 border-l-4 border-l-danger bg-surface p-5">
            <p className="font-semibold text-foreground">Couldn&apos;t load tasks</p>
            <p className="mt-1 text-sm text-muted">{error}</p>
            <button
              onClick={loadTasks}
              className={`mt-4 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:opacity-90 ${FOCUS_RING}`}
            >
              Retry
            </button>
          </div>
        )}

        {status === "success" && tasks.length === 0 && (
          <div className="rounded-md border border-dashed border-border bg-surface p-10 text-center">
            <p className="font-semibold text-foreground">No tasks yet</p>
            <p className="mt-1 text-sm text-muted">
              Create your first task to get started.
            </p>
          </div>
        )}

        {status === "success" && tasks.length > 0 && visibleTasks.length === 0 && (
          <div className="rounded-md border border-dashed border-border bg-surface p-10 text-center">
            <p className="font-semibold text-foreground">No tasks found</p>
            <p className="mt-1 text-sm text-muted">
              Try a different search term or adjust your filters.
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className={`mt-4 rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface-raised ${FOCUS_RING}`}
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {status === "success" && visibleTasks.length > 0 && (
          <ul className="space-y-2">
            {visibleTasks.map((task, index) => {
              const priority = PRIORITY_META[task.priority];
              const isToggling = togglingId === task.id;
              const overdue = isOverdue(task);
              return (
                <li
                  key={task.id}
                  className={`flex flex-col gap-3 rounded-md border border-l-4 border-border bg-surface p-4 transition-colors hover:bg-surface-raised sm:flex-row sm:items-start sm:gap-4 sm:p-5 ${priority.border}`}
                >
                  <div className="flex flex-1 items-start gap-4">
                    <span className="mt-1 w-6 shrink-0 font-mono text-xs text-muted">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleToggleComplete(task)}
                      disabled={isToggling}
                      aria-label={
                        task.completed ? "Mark task incomplete" : "Mark task complete"
                      }
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors disabled:opacity-50 ${FOCUS_RING} ${
                        task.completed
                          ? "border-success bg-success"
                          : "border-border hover:border-accent"
                      }`}
                    >
                      {task.completed && (
                        <svg
                          viewBox="0 0 16 16"
                          fill="none"
                          className="h-3 w-3"
                          aria-hidden="true"
                        >
                          <path
                            d="M3 8l3.5 3.5L13 5"
                            stroke="#05070A"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className={`font-semibold text-foreground ${
                            task.completed ? "line-through text-muted" : ""
                          }`}
                        >
                          {task.title}
                        </p>

                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${priority.badge}`}
                        >
                          {priority.label}
                        </span>

                        {task.category && (
                          <span
                            className="rounded px-2 py-0.5 text-xs font-medium text-background"
                            style={{ backgroundColor: categoryColor(task.category) }}
                          >
                            {task.category}
                          </span>
                        )}

                        {overdue && (
                          <span className="rounded-full bg-danger/15 px-2 py-0.5 text-xs font-semibold text-danger">
                            Overdue
                          </span>
                        )}

                        {isToggling && (
                          <span className="text-xs text-muted">Updating...</span>
                        )}
                      </div>

                      {task.description && (
                        <p
                          className={`mt-1 line-clamp-2 text-sm ${
                            task.completed ? "text-muted/70" : "text-muted"
                          }`}
                        >
                          {task.description}
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                        {task.dueDate && (
                          <span className={overdue ? "font-medium text-danger" : "text-muted"}>
                            Due {formatDate(task.dueDate)}
                          </span>
                        )}
                        <span className="font-mono text-muted">
                          {task.completed ? "Completed" : "Open"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2 sm:ml-auto">
                    <button
                      onClick={() => openEditModal(task)}
                      className={`rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface-raised ${FOCUS_RING}`}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => openDeleteConfirm(task)}
                      className={`rounded-md border border-danger/40 px-3 py-1.5 text-xs font-semibold text-danger transition-colors hover:bg-danger/10 ${FOCUS_RING}`}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-md border border-border bg-surface-raised p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">New task</h2>
              <button
                onClick={closeCreateModal}
                className={`rounded text-muted transition-colors hover:text-foreground ${FOCUS_RING}`}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Title <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  placeholder="What needs to get done?"
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Description
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, description: e.target.value })
                  }
                  className={`w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  rows={3}
                  placeholder="Optional details"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Priority
                  </label>
                  <select
                    value={createForm.priority}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, priority: e.target.value as Priority })
                    }
                    className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Due date
                  </label>
                  <input
                    type="date"
                    value={createForm.dueDate}
                    onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                    className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Category
                </label>
                <input
                  type="text"
                  value={createForm.category}
                  onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                  className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  placeholder="Optional, e.g. Work"
                />
              </div>

              {createError && (
                <p className="text-sm font-medium text-danger">{createError}</p>
              )}

              <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={creating}
                  className={`rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className={`rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                >
                  {creating ? "Creating..." : "Create task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-md border border-border bg-surface-raised p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Edit task</h2>
              <button
                onClick={closeEditModal}
                className={`rounded text-muted transition-colors hover:text-foreground ${FOCUS_RING}`}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Title <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className={`w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  rows={3}
                  placeholder="Optional details"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Priority
                  </label>
                  <select
                    value={editForm.priority}
                    onChange={(e) =>
                      setEditForm({ ...editForm, priority: e.target.value as Priority })
                    }
                    className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Due date
                  </label>
                  <input
                    type="date"
                    value={editForm.dueDate}
                    onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                    className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Category
                </label>
                <input
                  type="text"
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  placeholder="Optional, e.g. Work"
                />
              </div>

              {editError && <p className="text-sm font-medium text-danger">{editError}</p>}

              <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={saving}
                  className={`rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-md border border-border bg-surface-raised p-6">
            <h2 className="text-lg font-bold text-foreground">Delete task?</h2>

            <div className="mt-3 flex items-center gap-2 rounded-md border border-border bg-background p-3">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                  PRIORITY_META[deletingTask.priority].dot
                }`}
              />
              <span className="min-w-0 truncate font-semibold text-foreground">
                {deletingTask.title}
              </span>
              {deletingTask.category && (
                <span
                  className="ml-auto shrink-0 rounded px-2 py-0.5 text-xs font-medium text-background"
                  style={{ backgroundColor: categoryColor(deletingTask.category) }}
                >
                  {deletingTask.category}
                </span>
              )}
            </div>

            <p className="mt-3 text-sm text-muted">
              This will permanently delete this task. This cannot be undone.
            </p>

            {deleteError && (
              <p className="mt-3 text-sm font-medium text-danger">{deleteError}</p>
            )}

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteConfirm}
                disabled={deleting}
                className={`rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className={`rounded-md bg-danger px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
              >
                {deleting ? "Deleting..." : "Delete task"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}