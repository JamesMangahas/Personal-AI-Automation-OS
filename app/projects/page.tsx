"use client";

import Link from "next/link";
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

const STATUS_META: Record<ProjectStatus, { label: string; tone: BadgeTone; bar: string }> = {
  PLANNING: { label: "Planning", tone: "status-planning", bar: "bg-status-planning" },
  ACTIVE: { label: "Active", tone: "status-active", bar: "bg-status-active" },
  ON_HOLD: { label: "On Hold", tone: "status-onhold", bar: "bg-status-onhold" },
  COMPLETED: { label: "Completed", tone: "status-completed", bar: "bg-status-completed" },
  ARCHIVED: { label: "Archived", tone: "status-archived", bar: "bg-status-archived" },
};

const PRIORITY_META: Record<ProjectPriority, { label: string; tone: BadgeTone }> = {
  HIGH: { label: "High", tone: "priority-high" },
  MEDIUM: { label: "Medium", tone: "priority-medium" },
  LOW: { label: "Low", tone: "priority-low" },
};

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

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  status: "PLANNING",
  priority: "MEDIUM",
  category: "",
  startDate: "",
  dueDate: "",
};

function toFormState(project: Project): FormState {
  return {
    name: project.name,
    description: project.description ?? "",
    status: project.status,
    priority: project.priority,
    category: project.category ?? "",
    startDate: toDateInputValue(project.startDate),
    dueDate: toDateInputValue(project.dueDate),
  };
}

export default function ProjectsPage() {
  const { showToast } = useToast();

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
        const haystack = [p.name, p.description ?? "", p.category ?? ""].join(" ").toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });

    return [...filtered].sort((a, b) => {
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
  }, [projects, searchQuery, statusFilter, priorityFilter, categoryFilter, sortBy]);

  const hasActiveFilters =
    searchQuery.trim() !== "" || statusFilter !== "ALL" || priorityFilter !== "ALL" || categoryFilter !== "ALL";

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
      const body: Record<string, string> = { name, status: createForm.status, priority: createForm.priority };
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
      showToast("success", `"${data.project.name}" was created.`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create project.");
    } finally {
      setCreating(false);
    }
  }

  function openEditModal(project: Project) {
    setEditingProject(project);
    setEditForm(toFormState(project));
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

    if (name !== editingProject.name) changes.name = name;

    const newDescription = editForm.description.trim();
    const oldDescription = editingProject.description ?? "";
    if (newDescription !== oldDescription) {
      changes.description = newDescription === "" ? null : newDescription;
    }

    if (editForm.status !== editingProject.status) changes.status = editForm.status;
    if (editForm.priority !== editingProject.priority) changes.priority = editForm.priority;

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
      showToast("success", `"${updated.name}" was updated.`);
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
      const res = await fetch(`/api/projects/${deletingProject.id}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete project.");
      }

      const deletedId = deletingProject.id;
      const name = deletingProject.name;
      setProjects((current) => current.filter((p) => p.id !== deletedId));
      setDeletingProject(null);
      showToast("success", `"${name}" was deleted.`);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete project.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-8 sm:py-14 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 border-b border-border pb-8">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">System / Projects</p>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                Projects
              </h1>
              <p className="mt-2 max-w-md text-sm text-muted sm:text-base">
                Track scope, status, and priority across your work.
              </p>
            </div>
            <Button onClick={openCreateModal}>Create project</Button>
          </div>
        </header>

        {status === "success" && projects.length > 0 && (
          <Card variant="raised" className="mb-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="lg:col-span-2">
                <label htmlFor="project-search" className={MICRO_LABEL}>
                  Search
                </label>
                <Input
                  id="project-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Name, description, category..."
                />
              </div>
              <div>
                <label htmlFor="status-filter" className={MICRO_LABEL}>
                  Status
                </label>
                <Select id="status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
                  <option value="ALL">All statuses</option>
                  <option value="PLANNING">Planning</option>
                  <option value="ACTIVE">Active</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="ARCHIVED">Archived</option>
                </Select>
              </div>
              <div>
                <label htmlFor="priority-filter" className={MICRO_LABEL}>
                  Priority
                </label>
                <Select id="priority-filter" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}>
                  <option value="ALL">All priorities</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </Select>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-wrap gap-4">
                {availableCategories.length > 0 && (
                  <div className="max-w-[10rem]">
                    <label htmlFor="category-filter" className={MICRO_LABEL}>
                      Category
                    </label>
                    <Select id="category-filter" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                      <option value="ALL">All categories</option>
                      {availableCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
                <div className="max-w-[10rem]">
                  <label htmlFor="sort-by" className={MICRO_LABEL}>
                    Sort
                  </label>
                  <Select id="sort-by" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)}>
                    <option value="NEWEST">Newest first</option>
                    <option value="OLDEST">Oldest first</option>
                    <option value="NAME_ASC">Name A-Z</option>
                    <option value="NAME_DESC">Name Z-A</option>
                    <option value="DUE_DATE">Due date</option>
                  </Select>
                </div>
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
            <p className="font-semibold text-foreground">Couldn&apos;t load projects</p>
            <p className="mt-1 text-sm text-muted">{error}</p>
            <Button onClick={loadProjects} className="mt-4">
              Retry
            </Button>
          </Card>
        )}

        {status === "success" && projects.length === 0 && (
          <EmptyState title="No projects yet" message="Create your first project to get started." />
        )}

        {status === "success" && projects.length > 0 && visibleProjects.length === 0 && (
          <EmptyState
            title="No projects found"
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

        {status === "success" && visibleProjects.length > 0 && (
          <>
            <div className="mb-4 flex items-center gap-3">
              <span className="font-mono text-sm font-semibold text-accent">01</span>
              <span className="h-px w-8 bg-gradient-to-r from-accent/50 to-transparent" aria-hidden="true" />
              <h2 className="text-xl font-bold tracking-tight text-foreground">Project Operations</h2>
              <span className="ml-auto font-mono text-xs text-muted">
                {visibleProjects.length} / {projects.length}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {visibleProjects.map((project) => {
                const statusMeta = STATUS_META[project.status];
                const priorityMeta = PRIORITY_META[project.priority];
                return (
                  <Card
                    key={project.id}
                    variant="raised"
                    hoverable
                    className="relative flex flex-col gap-3 overflow-hidden pt-4 transition-transform duration-150 hover:-translate-y-0.5"
                  >
                    <span className={`absolute inset-x-0 top-0 h-0.5 ${statusMeta.bar}`} aria-hidden="true" />

                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/projects/${project.id}`}
                        className="min-w-0 break-words text-lg font-bold leading-snug text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
                      >
                        {project.name}
                      </Link>
                      <div className="flex shrink-0 gap-2">
                        <Button variant="secondary" size="sm" onClick={() => openEditModal(project)}>
                          Edit
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => openDeleteConfirm(project)}>
                          Delete
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                      <Badge tone={priorityMeta.tone}>{priorityMeta.label}</Badge>
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
                      <p className="line-clamp-2 break-words text-sm text-muted">{project.description}</p>
                    )}

                    {(project.startDate || project.dueDate) && (
                      <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-border pt-3 font-mono text-xs text-muted">
                        {project.startDate && <span>Start {formatDate(project.startDate)}</span>}
                        {project.dueDate && <span>Due {formatDate(project.dueDate)}</span>}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>

      <Modal open={isCreateOpen} onClose={closeCreateModal} title="New project" closeDisabled={creating}>
        <form onSubmit={handleCreateSubmit} className="space-y-5">
          <Input
            label="Name"
            required
            name="name"
            value={createForm.name}
            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
            placeholder="Project name"
            autoFocus
          />
          <Textarea
            label="Description"
            name="description"
            value={createForm.description}
            onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
            placeholder="What is this project about?"
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Status"
              name="status"
              value={createForm.status}
              onChange={(e) => setCreateForm({ ...createForm, status: e.target.value as ProjectStatus })}
            >
              <option value="PLANNING">Planning</option>
              <option value="ACTIVE">Active</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="COMPLETED">Completed</option>
              <option value="ARCHIVED">Archived</option>
            </Select>
            <Select
              label="Priority"
              name="priority"
              value={createForm.priority}
              onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value as ProjectPriority })}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </Select>
          </div>
          <Input
            label="Category"
            name="category"
            value={createForm.category}
            onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
            placeholder="e.g. Product"
          />
          <div className="grid grid-cols-2 gap-4">
            <DateInput
              label="Start date"
              name="startDate"
              value={createForm.startDate}
              onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
            />
            <DateInput
              label="Due date"
              name="dueDate"
              value={createForm.dueDate}
              onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
            />
          </div>
          {createError && <p className="text-sm font-medium text-danger">{createError}</p>}
          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={closeCreateModal} disabled={creating}>
              Cancel
            </Button>
            <Button type="submit" loading={creating} loadingText="Creating...">
              Create project
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editingProject} onClose={closeEditModal} title="Edit project" closeDisabled={saving}>
        <form onSubmit={handleEditSubmit} className="space-y-5">
          <Input
            label="Name"
            required
            name="edit-name"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
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
              label="Status"
              name="edit-status"
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value as ProjectStatus })}
            >
              <option value="PLANNING">Planning</option>
              <option value="ACTIVE">Active</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="COMPLETED">Completed</option>
              <option value="ARCHIVED">Archived</option>
            </Select>
            <Select
              label="Priority"
              name="edit-priority"
              value={editForm.priority}
              onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as ProjectPriority })}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </Select>
          </div>
          <Input
            label="Category"
            name="edit-category"
            value={editForm.category}
            onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <DateInput
              label="Start date"
              name="edit-startDate"
              value={editForm.startDate}
              onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
            />
            <DateInput
              label="Due date"
              name="edit-dueDate"
              value={editForm.dueDate}
              onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
            />
          </div>
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
        open={!!deletingProject}
        onClose={closeDeleteConfirm}
        onConfirm={handleConfirmDelete}
        title="Delete project?"
        itemLabel={deletingProject?.name ?? ""}
        description="This will permanently delete this project. This cannot be undone."
        loading={deleting}
        error={deleteError}
      />
    </main>
  );
}