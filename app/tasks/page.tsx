"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Badge, type BadgeTone } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { DateInput } from "../../components/ui/DateInput";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { SkeletonList } from "../../components/ui/LoadingSkeleton";
import { Modal } from "../../components/ui/Modal";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { useToast } from "../../components/ui/Toast";

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

const PRIORITY_META: Record<Priority, { label: string; tone: BadgeTone; border: string }> = {
  HIGH: { label: "High", tone: "priority-high", border: "border-l-priority-high" },
  MEDIUM: { label: "Medium", tone: "priority-medium", border: "border-l-priority-medium" },
  LOW: { label: "Low", tone: "priority-low", border: "border-l-priority-low" },
};

const PRIORITY_RANK: Record<Priority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

const CATEGORY_PALETTE = ["#2DD4BF", "#8B5CF6", "#F59E0B", "#FB7185", "#38BDF8", "#A3E635"];

const MICRO_LABEL = "mb-1 block font-mono text-[10px] uppercase tracking-[0.15em] text-muted";

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
  const { showToast } = useToast();

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTasks();
  }, [loadTasks]);

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

    return [...filtered].sort((a, b) => {
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
  }, [tasks, searchQuery, statusFilter, priorityFilter, sortBy]);

  const hasActiveFilters =
    searchQuery.trim() !== "" || statusFilter !== "ALL" || priorityFilter !== "ALL";

  function clearFilters() {
    setSearchQuery("");
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
  }

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
      showToast("success", `"${data.task.title}" was created.`);
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
      showToast("success", `"${data.task.title}" was updated.`);
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
      showToast("success", `"${deletedTitle}" was deleted.`);
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
      showToast("success", `"${task.title}" marked ${nextCompleted ? "complete" : "incomplete"}.`);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to update task.");
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-8 sm:py-14 lg:px-10">
      <div className="mx-auto max-w-4xl">
        <header className="mb-10 border-b border-border pb-8">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">System / Tasks</p>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                Tasks
              </h1>
              <p className="mt-2 max-w-md text-sm text-muted sm:text-base">
                Track, prioritize, and close out your work.
              </p>
            </div>
            <Button onClick={openCreateModal}>Create task</Button>
          </div>
        </header>

        {status === "success" && tasks.length > 0 && (
          <Card variant="raised" className="mb-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="lg:col-span-2">
                <label htmlFor="task-search" className={MICRO_LABEL}>
                  Search
                </label>
                <Input
                  id="task-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Title, description, category..."
                />
              </div>
              <div>
                <label htmlFor="status-filter" className={MICRO_LABEL}>
                  Status
                </label>
                <Select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                >
                  <option value="ALL">All statuses</option>
                  <option value="INCOMPLETE">Incomplete</option>
                  <option value="COMPLETED">Completed</option>
                </Select>
              </div>
              <div>
                <label htmlFor="priority-filter" className={MICRO_LABEL}>
                  Priority
                </label>
                <Select
                  id="priority-filter"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
                >
                  <option value="ALL">All priorities</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </Select>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <div className="max-w-[10rem]">
                <label htmlFor="sort-by" className={MICRO_LABEL}>
                  Sort
                </label>
                <Select
                  id="sort-by"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                >
                  <option value="NEWEST">Newest first</option>
                  <option value="OLDEST">Oldest first</option>
                  <option value="DUE_DATE">Due date</option>
                  <option value="PRIORITY">Priority</option>
                </Select>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          </Card>
        )}

        {status === "loading" && <SkeletonList count={4} />}

        {status === "error" && (
          <Card variant="raised" className="border-l-4 border-l-danger">
            <p className="font-semibold text-foreground">Couldn&apos;t load tasks</p>
            <p className="mt-1 text-sm text-muted">{error}</p>
            <Button onClick={loadTasks} className="mt-4">
              Retry
            </Button>
          </Card>
        )}

        {status === "success" && tasks.length === 0 && (
          <EmptyState title="No tasks yet" message="Create your first task to get started." />
        )}

        {status === "success" && tasks.length > 0 && visibleTasks.length === 0 && (
          <EmptyState
            title="No tasks found"
            message="Try a different search term or adjust your filters."
            action={
              hasActiveFilters ? (
                <Button variant="secondary" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        )}

        {status === "success" && visibleTasks.length > 0 && (
          <>
            <div className="mb-4 flex items-center gap-3">
              <span className="font-mono text-sm font-semibold text-accent">01</span>
              <span className="h-px w-8 bg-gradient-to-r from-accent/50 to-transparent" aria-hidden="true" />
              <h2 className="text-xl font-bold tracking-tight text-foreground">Task Queue</h2>
              <span className="ml-auto font-mono text-xs text-muted">
                {visibleTasks.length} / {tasks.length}
              </span>
            </div>

            <ul className="space-y-2">
              {visibleTasks.map((task, index) => {
                const priority = PRIORITY_META[task.priority];
                const isToggling = togglingId === task.id;
                const overdue = isOverdue(task);
                return (
                  <li key={task.id}>
                    <Card
                      variant="raised"
                      hoverable
                      className={`border-l-4 ${priority.border} flex flex-col gap-3 transition-transform duration-150 hover:translate-x-1 sm:flex-row sm:items-start`}
                    >
                      <span className="mt-1 w-6 shrink-0 font-mono text-xs text-muted">
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleToggleComplete(task)}
                        disabled={isToggling}
                        aria-label={task.completed ? "Mark task incomplete" : "Mark task complete"}
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                          task.completed ? "border-success bg-success" : "border-border hover:border-accent"
                        }`}
                      >
                        {task.completed && (
                          <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" aria-hidden="true">
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
                          <p className={`font-semibold text-foreground ${task.completed ? "line-through text-muted" : ""}`}>
                            {task.title}
                          </p>
                          <Badge tone={priority.tone}>{priority.label}</Badge>
                          {task.category && (
                            <span
                              className="rounded px-2 py-0.5 text-xs font-medium text-background"
                              style={{ backgroundColor: categoryColor(task.category) }}
                            >
                              {task.category}
                            </span>
                          )}
                          {overdue && <Badge tone="danger">Overdue</Badge>}
                          {isToggling && <span className="text-xs text-muted">Updating...</span>}
                        </div>

                        {task.description && (
                          <p className={`mt-1 line-clamp-2 text-sm ${task.completed ? "text-muted/70" : "text-muted"}`}>
                            {task.description}
                          </p>
                        )}

                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                          {task.dueDate && (
                            <span className={overdue ? "font-medium text-danger" : "text-muted"}>
                              Due {formatDate(task.dueDate)}
                            </span>
                          )}
                          <span className="font-mono text-muted">{task.completed ? "Completed" : "Open"}</span>
                        </div>
                      </div>

                      <div className="flex shrink-0 gap-2 sm:ml-auto">
                        <Button variant="secondary" size="sm" onClick={() => openEditModal(task)}>
                          Edit
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => openDeleteConfirm(task)}>
                          Delete
                        </Button>
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      <Modal open={isCreateOpen} onClose={closeCreateModal} title="New task" closeDisabled={creating}>
        <form onSubmit={handleCreateSubmit} className="space-y-5">
          <Input
            label="Title"
            required
            name="title"
            value={createForm.title}
            onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
            placeholder="What needs to get done?"
            autoFocus
          />
          <Textarea
            label="Description"
            name="description"
            value={createForm.description}
            onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
            placeholder="Optional details"
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Priority"
              name="priority"
              value={createForm.priority}
              onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value as Priority })}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </Select>
            <DateInput
              label="Due date"
              name="dueDate"
              value={createForm.dueDate}
              onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
            />
          </div>
          <Input
            label="Category"
            name="category"
            value={createForm.category}
            onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
            placeholder="Optional, e.g. Work"
          />
          {createError && <p className="text-sm font-medium text-danger">{createError}</p>}
          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={closeCreateModal} disabled={creating}>
              Cancel
            </Button>
            <Button type="submit" loading={creating} loadingText="Creating...">
              Create task
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editingTask} onClose={closeEditModal} title="Edit task" closeDisabled={saving}>
        <form onSubmit={handleEditSubmit} className="space-y-5">
          <Input
            label="Title"
            required
            name="edit-title"
            value={editForm.title}
            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
            autoFocus
          />
          <Textarea
            label="Description"
            name="edit-description"
            value={editForm.description}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Priority"
              name="edit-priority"
              value={editForm.priority}
              onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as Priority })}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </Select>
            <DateInput
              label="Due date"
              name="edit-dueDate"
              value={editForm.dueDate}
              onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
            />
          </div>
          <Input
            label="Category"
            name="edit-category"
            value={editForm.category}
            onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
          />
          {editError && <p className="text-sm font-medium text-danger">{editError}</p>}
          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={closeEditModal} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} loadingText="Saving...">
              Save changes
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deletingTask}
        onClose={closeDeleteConfirm}
        onConfirm={handleConfirmDelete}
        title="Delete task?"
        itemLabel={deletingTask?.title ?? ""}
        description="This will permanently delete this task. This cannot be undone."
        loading={deleting}
        error={deleteError}
      />
    </main>
  );
}