"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";

type ProjectStatus = "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED";
type ProjectPriority = "LOW" | "MEDIUM" | "HIGH";

type Project = {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  category: string | null;
  startDate: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

type LoadStatus = "loading" | "success" | "not_found" | "error";

type FormState = {
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  category: string;
  startDate: string;
  dueDate: string;
};

const STATUS_META: Record<ProjectStatus, { label: string; badge: string }> = {
  PLANNING: { label: "Planning", badge: "bg-status-planning/15 text-status-planning" },
  ACTIVE: { label: "Active", badge: "bg-status-active/15 text-status-active" },
  ON_HOLD: { label: "On hold", badge: "bg-status-onhold/15 text-status-onhold" },
  COMPLETED: { label: "Completed", badge: "bg-status-completed/15 text-status-completed" },
  ARCHIVED: { label: "Archived", badge: "bg-status-archived/15 text-status-archived" },
};

const PRIORITY_META: Record<ProjectPriority, { label: string; badge: string }> = {
  HIGH: { label: "High", badge: "bg-priority-high/15 text-priority-high" },
  MEDIUM: { label: "Medium", badge: "bg-priority-medium/15 text-priority-medium" },
  LOW: { label: "Low", badge: "bg-priority-low/15 text-priority-low" },
};

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

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function toDateInputValue(value: string | null): string {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<FormState | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadProject = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (res.status === 404) {
        setStatus("not_found");
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load project.");
      }
      setProject(data.project as Project);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }, [id]);

  useEffect(() => {
    if (id) loadProject();
  }, [id, loadProject]);

  function openEditModal() {
    if (!project) return;
    setEditForm({
      name: project.name,
      description: project.description ?? "",
      status: project.status,
      priority: project.priority,
      category: project.category ?? "",
      startDate: toDateInputValue(project.startDate),
      dueDate: toDateInputValue(project.dueDate),
    });
    setEditError(null);
    setIsEditOpen(true);
  }

  function closeEditModal() {
    if (saving) return;
    setIsEditOpen(false);
  }

  async function handleEditSubmit(e: FormEvent) {
    e.preventDefault();
    if (!project || !editForm) return;

    const name = editForm.name.trim();
    if (!name) {
      setEditError("Name is required.");
      return;
    }

    const changes: Record<string, string | null> = {};

    if (name !== project.name) changes.name = name;

    const newDescription = editForm.description.trim();
    const oldDescription = project.description ?? "";
    if (newDescription !== oldDescription) {
      changes.description = newDescription === "" ? null : newDescription;
    }

    if (editForm.status !== project.status) changes.status = editForm.status;
    if (editForm.priority !== project.priority) changes.priority = editForm.priority;

    const newCategory = editForm.category.trim();
    const oldCategory = project.category ?? "";
    if (newCategory !== oldCategory) {
      changes.category = newCategory === "" ? null : newCategory;
    }

    const oldStartDate = toDateInputValue(project.startDate);
    if (editForm.startDate !== oldStartDate) {
      changes.startDate = editForm.startDate === "" ? null : editForm.startDate;
    }

    const oldDueDate = toDateInputValue(project.dueDate);
    if (editForm.dueDate !== oldDueDate) {
      changes.dueDate = editForm.dueDate === "" ? null : editForm.dueDate;
    }

    if (Object.keys(changes).length === 0) {
      setIsEditOpen(false);
      return;
    }

    setEditError(null);
    setSaving(true);

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update project.");
      }

      setProject(data.project as Project);
      setIsEditOpen(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update project.");
    } finally {
      setSaving(false);
    }
  }

  function openDeleteConfirm() {
    setDeleteError(null);
    setIsDeleteOpen(true);
  }

  function closeDeleteConfirm() {
    if (deleting) return;
    setIsDeleteOpen(false);
  }

  async function handleConfirmDelete() {
    if (!project || deleting) return;

    setDeleteError(null);
    setDeleting(true);

    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete project.");
      }

      router.push("/projects");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete project.");
      setDeleting(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-4 py-8 sm:px-8 sm:py-10 lg:px-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-3xl">
        <Link
          href="/projects"
          className={`mb-6 inline-flex items-center gap-1 rounded text-sm font-medium text-muted transition-colors hover:text-foreground ${FOCUS_RING}`}
        >
          ← Back to Projects
        </Link>

        {status === "loading" && (
          <div className="mt-4 h-64 animate-pulse rounded-xl border border-white/10 bg-white/[0.03]" />
        )}

        {status === "not_found" && (
          <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
            <p className="font-semibold text-foreground">Project not found</p>
            <p className="mt-1 text-sm text-muted">
              This project may have been deleted, or the link is incorrect.
            </p>
            <Link
              href="/projects"
              className={`mt-4 inline-block rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:opacity-90 ${FOCUS_RING}`}
            >
              Back to Projects
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="mt-4 rounded-xl border border-danger/40 border-l-4 border-l-danger bg-surface p-5">
            <p className="font-semibold text-foreground">Couldn&apos;t load project</p>
            <p className="mt-1 text-sm text-muted">{error}</p>
            <button
              onClick={loadProject}
              className={`mt-4 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:opacity-90 ${FOCUS_RING}`}
            >
              Retry
            </button>
          </div>
        )}

        {status === "success" && project && (
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-6 shadow-lg shadow-black/20 backdrop-blur-md sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <h1 className="min-w-0 break-words text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                {project.name}
              </h1>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={openEditModal}
                  className={`rounded-md border border-white/10 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-white/[0.08] ${FOCUS_RING}`}
                >
                  Edit
                </button>
                <button
                  onClick={openDeleteConfirm}
                  className={`rounded-md border border-danger/40 px-3 py-1.5 text-xs font-semibold text-danger transition-colors hover:bg-danger/10 ${FOCUS_RING}`}
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_META[project.status].badge}`}
              >
                {STATUS_META[project.status].label}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORITY_META[project.priority].badge}`}
              >
                {PRIORITY_META[project.priority].label}
              </span>
              {project.category && (
                <span
                  className="max-w-[10rem] truncate rounded-full px-2 py-0.5 text-xs font-medium text-background"
                  style={{ backgroundColor: categoryColor(project.category) }}
                  title={project.category}
                >
                  {project.category}
                </span>
              )}
            </div>

            {project.description && (
              <p className="mt-5 whitespace-pre-wrap break-words text-sm text-muted">
                {project.description}
              </p>
            )}

            <div className="mt-6 grid grid-cols-1 gap-4 border-t border-white/10 pt-5 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted">Start date</p>
                <p className="mt-0.5 text-foreground">
                  {project.startDate ? formatDate(project.startDate) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted">Due date</p>
                <p className="mt-0.5 text-foreground">
                  {project.dueDate ? formatDate(project.dueDate) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted">Created</p>
                <p className="mt-0.5 text-foreground">{formatDateTime(project.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Last updated</p>
                <p className="mt-0.5 text-foreground">{formatDateTime(project.updatedAt)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {isEditOpen && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Edit project</h2>
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
                  Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className={`w-full rounded-md border border-white/10 bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
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
                  className={`w-full resize-none rounded-md border border-white/10 bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm({ ...editForm, status: e.target.value as ProjectStatus })
                    }
                    className={`w-full rounded-md border border-white/10 bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  >
                    <option value="PLANNING">Planning</option>
                    <option value="ACTIVE">Active</option>
                    <option value="ON_HOLD">On hold</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Priority
                  </label>
                  <select
                    value={editForm.priority}
                    onChange={(e) =>
                      setEditForm({ ...editForm, priority: e.target.value as ProjectPriority })
                    }
                    className={`w-full rounded-md border border-white/10 bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
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
                  className={`w-full rounded-md border border-white/10 bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Start date
                  </label>
                  <input
                    type="date"
                    value={editForm.startDate}
                    onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                    className={`w-full rounded-md border border-white/10 bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Due date
                  </label>
                  <input
                    type="date"
                    value={editForm.dueDate}
                    onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                    className={`w-full rounded-md border border-white/10 bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  />
                </div>
              </div>

              {editError && <p className="text-sm font-medium text-danger">{editError}</p>}

              <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={saving}
                  className={`rounded-md border border-white/10 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
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

      {isDeleteOpen && project && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <h2 className="text-lg font-bold text-foreground">Delete project?</h2>

            <div className="mt-3 rounded-md border border-white/10 bg-background p-3">
              <span className="break-words font-semibold text-foreground">{project.name}</span>
            </div>

            <p className="mt-3 text-sm text-muted">
              This will permanently delete this project. This cannot be undone.
            </p>

            {deleteError && (
              <p className="mt-3 text-sm font-medium text-danger">{deleteError}</p>
            )}

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteConfirm}
                disabled={deleting}
                className={`rounded-md border border-white/10 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className={`rounded-md bg-danger px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
              >
                {deleting ? "Deleting..." : "Delete project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}