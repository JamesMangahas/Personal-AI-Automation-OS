"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

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

type LoadStatus = "loading" | "success" | "error";
type Toast = { type: "success" | "error"; message: string };
type StatusFilter = "ALL" | ProjectStatus;
type PriorityFilter = "ALL" | ProjectPriority;
type SortOption = "NEWEST" | "OLDEST" | "NAME_ASC" | "NAME_DESC" | "DUE_DATE";

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

function toDateInputValue(value: string | null): string {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  status: "PLANNING",
  priority: "MEDIUM",
  category: "",
  startDate: "",
  dueDate: "",
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(EMPTY_FORM);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState<Toast | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("NEWEST");

  const loadProjects = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load projects.");
      }
      setProjects(data.projects as Project[]);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    for (const p of projects) {
      if (p.category) set.add(p.category);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [projects]);

  useEffect(() => {
    if (categoryFilter !== "ALL" && !availableCategories.includes(categoryFilter)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCategoryFilter("ALL");
    }
  }, [availableCategories, categoryFilter]);

  const visibleProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = projects.filter((p) => {
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
      if (priorityFilter !== "ALL" && p.priority !== priorityFilter) return false;
      if (categoryFilter !== "ALL" && p.category !== categoryFilter) return false;

      if (query) {
        const haystack = [p.name, p.description ?? "", p.category ?? ""]
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
        case "NAME_ASC":
          return a.name.localeCompare(b.name);
        case "NAME_DESC":
          return b.name.localeCompare(a.name);
        case "DUE_DATE": {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        case "NEWEST":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return sorted;
  }, [projects, searchQuery, statusFilter, priorityFilter, categoryFilter, sortBy]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    statusFilter !== "ALL" ||
    priorityFilter !== "ALL" ||
    categoryFilter !== "ALL";

  function clearFilters() {
    setSearchQuery("");
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
    setCategoryFilter("ALL");
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

    const name = createForm.name.trim();
    if (!name) {
      setCreateError("Name is required.");
      return;
    }

    setCreateError(null);
    setCreating(true);

    try {
      const body: Record<string, string> = {
        name,
        status: createForm.status,
        priority: createForm.priority,
      };
      if (createForm.description.trim()) body.description = createForm.description.trim();
      if (createForm.category.trim()) body.category = createForm.category.trim();
      if (createForm.startDate) body.startDate = createForm.startDate;
      if (createForm.dueDate) body.dueDate = createForm.dueDate;

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create project.");
      }

      setProjects((current) => [data.project as Project, ...current]);
      setIsCreateOpen(false);
      setCreateForm(EMPTY_FORM);
      setToast({ type: "success", message: `"${data.project.name}" was created.` });
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create project.");
    } finally {
      setCreating(false);
    }
  }

  function openEditModal(project: Project) {
    setEditingProject(project);
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
  }

  function closeEditModal() {
    if (saving) return;
    setEditingProject(null);
  }

  async function handleEditSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editingProject) return;

    const name = editForm.name.trim();
    if (!name) {
      setEditError("Name is required.");
      return;
    }

    const changes: Record<string, string | null> = {};

    if (name !== editingProject.name) {
      changes.name = name;
    }

    const newDescription = editForm.description.trim();
    const oldDescription = editingProject.description ?? "";
    if (newDescription !== oldDescription) {
      changes.description = newDescription === "" ? null : newDescription;
    }

    if (editForm.status !== editingProject.status) {
      changes.status = editForm.status;
    }

    if (editForm.priority !== editingProject.priority) {
      changes.priority = editForm.priority;
    }

    const newCategory = editForm.category.trim();
    const oldCategory = editingProject.category ?? "";
    if (newCategory !== oldCategory) {
      changes.category = newCategory === "" ? null : newCategory;
    }

    const oldStartDate = toDateInputValue(editingProject.startDate);
    if (editForm.startDate !== oldStartDate) {
      changes.startDate = editForm.startDate === "" ? null : editForm.startDate;
    }

    const oldDueDate = toDateInputValue(editingProject.dueDate);
    if (editForm.dueDate !== oldDueDate) {
      changes.dueDate = editForm.dueDate === "" ? null : editForm.dueDate;
    }

    if (Object.keys(changes).length === 0) {
      setEditingProject(null);
      return;
    }

    setEditError(null);
    setSaving(true);

    try {
      const res = await fetch(`/api/projects/${editingProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update project.");
      }

      const updated = data.project as Project;
      setProjects((current) => current.map((p) => (p.id === updated.id ? updated : p)));
      setEditingProject(null);
      setToast({ type: "success", message: `"${updated.name}" was updated.` });
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update project.");
    } finally {
      setSaving(false);
    }
  }

  function openDeleteConfirm(project: Project) {
    setDeletingProject(project);
    setDeleteError(null);
  }

  function closeDeleteConfirm() {
    if (deleting) return;
    setDeletingProject(null);
  }

  async function handleConfirmDelete() {
    if (!deletingProject || deleting) return;

    setDeleteError(null);
    setDeleting(true);

    try {
      const res = await fetch(`/api/projects/${deletingProject.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete project.");
      }

      const deletedName = deletingProject.name;
      const deletedId = deletingProject.id;
      setProjects((current) => current.filter((p) => p.id !== deletedId));
      setDeletingProject(null);
      setToast({ type: "success", message: `"${deletedName}" was deleted.` });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete project.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-4 py-8 sm:px-8 sm:py-10 lg:px-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs tracking-wide text-muted">OPS Ã‚Â· 03 PROJECTS</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Projects
            </h1>
            <p className="mt-1 text-sm text-muted">
              {status === "success"
                ? `${visibleProjects.length} of ${projects.length} project${
                    projects.length === 1 ? "" : "s"
                  }`
                : "Personal AI Automation OS"}
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className={`w-full rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:opacity-90 sm:w-auto ${FOCUS_RING}`}
          >
            Create project
          </button>
        </header>

        {status === "success" && projects.length > 0 && (
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-md sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex-1 sm:min-w-[220px]">
              <label htmlFor="project-search" className="sr-only">
                Search projects
              </label>
              <input
                id="project-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, description, category..."
                className={`w-full rounded-md border border-white/10 bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
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
                  className={`rounded-md border border-white/10 bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                >
                  <option value="ALL">All statuses</option>
                  <option value="PLANNING">Planning</option>
                  <option value="ACTIVE">Active</option>
                  <option value="ON_HOLD">On hold</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="ARCHIVED">Archived</option>
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
                  className={`rounded-md border border-white/10 bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                >
                  <option value="ALL">All priorities</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>

              {availableCategories.length > 0 && (
                <div>
                  <label htmlFor="category-filter" className="sr-only">
                    Filter by category
                  </label>
                  <select
                    id="category-filter"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className={`rounded-md border border-white/10 bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  >
                    <option value="ALL">All categories</option>
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="sort-by" className="sr-only">
                  Sort projects
                </label>
                <select
                  id="sort-by"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className={`rounded-md border border-white/10 bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                >
                  <option value="NEWEST">Newest first</option>
                  <option value="OLDEST">Oldest first</option>
                  <option value="NAME_ASC">Name AÃ¢â‚¬â€œZ</option>
                  <option value="NAME_DESC">Name ZÃ¢â‚¬â€œA</option>
                  <option value="DUE_DATE">Due date</option>
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
            className={`mb-6 flex items-start justify-between gap-3 rounded-xl border-l-4 p-4 text-sm ${
              toast.type === "success"
                ? "border-l-success bg-white/[0.04] text-foreground"
                : "border-l-danger bg-white/[0.04] text-foreground"
            }`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              aria-label="Dismiss message"
              className={`shrink-0 text-muted hover:text-foreground ${FOCUS_RING}`}
            >
              Ã¢Å“â€¢
            </button>
          </div>
        )}

        {status === "loading" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-xl border border-white/10 bg-white/[0.03]"
              />
            ))}
          </div>
        )}

        {status === "error" && (
          <div className="rounded-xl border border-danger/40 border-l-4 border-l-danger bg-surface p-5">
            <p className="font-semibold text-foreground">Couldn&apos;t load projects</p>
            <p className="mt-1 text-sm text-muted">{error}</p>
            <button
              onClick={loadProjects}
              className={`mt-4 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:opacity-90 ${FOCUS_RING}`}
            >
              Retry
            </button>
          </div>
        )}

        {status === "success" && projects.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
            <p className="font-semibold text-foreground">No projects yet</p>
            <p className="mt-1 text-sm text-muted">
              Create your first project to get started.
            </p>
          </div>
        )}

        {status === "success" && projects.length > 0 && visibleProjects.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
            <p className="font-semibold text-foreground">No projects found</p>
            <p className="mt-1 text-sm text-muted">
              Try a different search term or adjust your filters.
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className={`mt-4 rounded-md border border-white/10 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-white/[0.06] ${FOCUS_RING}`}
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {status === "success" && visibleProjects.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleProjects.map((project) => {
              const statusMeta = STATUS_META[project.status];
              const priorityMeta = PRIORITY_META[project.priority];
              return (
                <div
                  key={project.id}
                  className="group flex flex-col rounded-xl border border-white/10 bg-white/[0.04] p-5 shadow-lg shadow-black/20 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-xl hover:shadow-black/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="min-w-0 break-words text-lg font-bold leading-snug text-foreground">
                      <Link
                        href={`/projects/${project.id}`}
                        className={`rounded hover:underline ${FOCUS_RING}`}
                      >
                        {project.name}
                      </Link>
                    </h2>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => openEditModal(project)}
                        className={`rounded-md border border-white/10 px-2.5 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-white/[0.08] ${FOCUS_RING}`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => openDeleteConfirm(project)}
                        className={`rounded-md border border-danger/40 px-2.5 py-1 text-xs font-semibold text-danger transition-colors hover:bg-danger/10 ${FOCUS_RING}`}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusMeta.badge}`}
                    >
                      {statusMeta.label}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${priorityMeta.badge}`}
                    >
                      {priorityMeta.label}
                    </span>
                    {project.category && (
                      <span
                        className="max-w-[8rem] truncate rounded-full px-2 py-0.5 text-xs font-medium text-background"
                        style={{ backgroundColor: categoryColor(project.category) }}
                        title={project.category}
                      >
                        {project.category}
                      </span>
                    )}
                  </div>

                  {project.description && (
                    <p className="mt-3 line-clamp-3 break-words text-sm text-muted">
                      {project.description}
                    </p>
                  )}

                  {(project.startDate || project.dueDate) && (
                    <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 border-t border-white/10 pt-3 text-xs text-muted">
                      {project.startDate && <span>Starts {formatDate(project.startDate)}</span>}
                      {project.dueDate && <span>Due {formatDate(project.dueDate)}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">New project</h2>
              <button
                onClick={closeCreateModal}
                className={`rounded text-muted transition-colors hover:text-foreground ${FOCUS_RING}`}
                aria-label="Close"
              >
                Ã¢Å“â€¢
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className={`w-full rounded-md border border-white/10 bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  placeholder="Project name"
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
                  className={`w-full resize-none rounded-md border border-white/10 bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  rows={3}
                  placeholder="What is this project about?"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Status
                  </label>
                  <select
                    value={createForm.status}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, status: e.target.value as ProjectStatus })
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
                    value={createForm.priority}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        priority: e.target.value as ProjectPriority,
                      })
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
                  value={createForm.category}
                  onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                  className={`w-full rounded-md border border-white/10 bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  placeholder="e.g. Product"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Start date
                  </label>
                  <input
                    type="date"
                    value={createForm.startDate}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, startDate: e.target.value })
                    }
                    className={`w-full rounded-md border border-white/10 bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Due date
                  </label>
                  <input
                    type="date"
                    value={createForm.dueDate}
                    onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                    className={`w-full rounded-md border border-white/10 bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  />
                </div>
              </div>

              {createError && (
                <p className="text-sm font-medium text-danger">{createError}</p>
              )}

              <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={creating}
                  className={`rounded-md border border-white/10 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className={`rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                >
                  {creating ? "Creating..." : "Create project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Edit project</h2>
              <button
                onClick={closeEditModal}
                className={`rounded text-muted transition-colors hover:text-foreground ${FOCUS_RING}`}
                aria-label="Close"
              >
                Ã¢Å“â€¢
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
                  placeholder="What is this project about?"
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
                  placeholder="e.g. Product"
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

      {deletingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <h2 className="text-lg font-bold text-foreground">Delete project?</h2>

            <div className="mt-3 rounded-md border border-white/10 bg-background p-3">
              <span className="break-words font-semibold text-foreground">
                {deletingProject.name}
              </span>
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