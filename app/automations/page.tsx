"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type AutomationStatus = "ACTIVE" | "INACTIVE" | "ERROR";

type Automation = {
  id: string;
  name: string;
  description: string | null;
  status: AutomationStatus;
  trigger: string | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
  webhookUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

type LoadStatus = "loading" | "success" | "error";
type Toast = { type: "success" | "error"; message: string };
type StatusFilter = "ALL" | AutomationStatus;
type SortOption = "NEWEST" | "OLDEST";

type FormState = {
  name: string;
  description: string;
  status: AutomationStatus;
  trigger: string;
  lastRunAt: string;
  nextRunAt: string;
  webhookUrl: string;
};

const STATUS_META: Record<AutomationStatus, { label: string; badge: string }> = {
  ACTIVE: { label: "Active", badge: "bg-success/15 text-success" },
  INACTIVE: { label: "Inactive", badge: "bg-status-archived/15 text-status-archived" },
  ERROR: { label: "Error", badge: "bg-danger/15 text-danger" },
};

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function toDateTimeInputValue(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  status: "INACTIVE",
  trigger: "",
  lastRunAt: "",
  nextRunAt: "",
  webhookUrl: "",
};

function toFormState(a: Automation): FormState {
  return {
    name: a.name,
    description: a.description ?? "",
    status: a.status,
    trigger: a.trigger ?? "",
    lastRunAt: toDateTimeInputValue(a.lastRunAt),
    nextRunAt: toDateTimeInputValue(a.nextRunAt),
    webhookUrl: a.webhookUrl ?? "",
  };
}

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(EMPTY_FORM);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deletingAutomation, setDeletingAutomation] = useState<Automation | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState<Toast | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("NEWEST");

  const loadAutomations = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/automations");
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load automations.");
      }
      setAutomations(data.automations as Automation[]);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAutomations();
  }, [loadAutomations]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const visibleAutomations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = automations.filter((a) => {
      if (statusFilter !== "ALL" && a.status !== statusFilter) return false;

      if (query) {
        const haystack = `${a.name} ${a.description ?? ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });

    return [...filtered].sort((a, b) => {
      const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return sortBy === "NEWEST" ? diff : -diff;
    });
  }, [automations, searchQuery, statusFilter, sortBy]);

  const hasActiveFilters = searchQuery.trim() !== "" || statusFilter !== "ALL";

  function clearFilters() {
    setSearchQuery("");
    setStatusFilter("ALL");
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
      const body: Record<string, string> = { name, status: createForm.status };
      if (createForm.description.trim()) body.description = createForm.description.trim();
      if (createForm.trigger.trim()) body.trigger = createForm.trigger.trim();
      if (createForm.webhookUrl.trim()) body.webhookUrl = createForm.webhookUrl.trim();
      if (createForm.lastRunAt) body.lastRunAt = createForm.lastRunAt;
      if (createForm.nextRunAt) body.nextRunAt = createForm.nextRunAt;

      const res = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create automation.");
      }

      setAutomations((current) => [data.automation as Automation, ...current]);
      setIsCreateOpen(false);
      setCreateForm(EMPTY_FORM);
      setToast({ type: "success", message: `"${data.automation.name}" was created.` });
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create automation.");
    } finally {
      setCreating(false);
    }
  }

  function openEditModal(automation: Automation) {
    setEditingAutomation(automation);
    setEditForm(toFormState(automation));
    setEditError(null);
  }

  function closeEditModal() {
    if (saving) return;
    setEditingAutomation(null);
  }

  async function handleEditSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editingAutomation) return;

    const name = editForm.name.trim();
    if (!name) {
      setEditError("Name is required.");
      return;
    }

    const changes: Record<string, string | null> = {};

    if (name !== editingAutomation.name) changes.name = name;

    const stringFields: Array<[keyof FormState, keyof Automation]> = [
      ["description", "description"],
      ["trigger", "trigger"],
      ["webhookUrl", "webhookUrl"],
    ];
    for (const [formKey, autoKey] of stringFields) {
      const newVal = (editForm[formKey] as string).trim();
      const oldVal = (editingAutomation[autoKey] as string | null) ?? "";
      if (newVal !== oldVal) {
        changes[formKey] = newVal === "" ? null : newVal;
      }
    }

    if (editForm.status !== editingAutomation.status) {
      changes.status = editForm.status;
    }

    const dateFields: Array<[keyof FormState, keyof Automation]> = [
      ["lastRunAt", "lastRunAt"],
      ["nextRunAt", "nextRunAt"],
    ];
    for (const [formKey, autoKey] of dateFields) {
      const newVal = editForm[formKey] as string;
      const oldVal = toDateTimeInputValue(editingAutomation[autoKey] as string | null);
      if (newVal !== oldVal) {
        changes[formKey] = newVal === "" ? null : newVal;
      }
    }

    if (Object.keys(changes).length === 0) {
      setEditingAutomation(null);
      return;
    }

    setEditError(null);
    setSaving(true);

    try {
      const res = await fetch(`/api/automations/${editingAutomation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update automation.");
      }

      const updated = data.automation as Automation;
      setAutomations((current) =>
        current.map((a) => (a.id === updated.id ? updated : a))
      );
      setEditingAutomation(null);
      setToast({ type: "success", message: `"${updated.name}" was updated.` });
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update automation.");
    } finally {
      setSaving(false);
    }
  }

  function openDeleteConfirm(automation: Automation) {
    setDeletingAutomation(automation);
    setDeleteError(null);
  }

  function closeDeleteConfirm() {
    if (deleting) return;
    setDeletingAutomation(null);
  }

  async function handleConfirmDelete() {
    if (!deletingAutomation || deleting) return;

    setDeleteError(null);
    setDeleting(true);

    try {
      const res = await fetch(`/api/automations/${deletingAutomation.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete automation.");
      }

      const deletedId = deletingAutomation.id;
      const name = deletingAutomation.name;
      setAutomations((current) => current.filter((a) => a.id !== deletedId));
      setDeletingAutomation(null);
      setToast({ type: "success", message: `"${name}" was deleted.` });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete automation.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-8 sm:py-10 lg:px-10">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs tracking-wide text-muted">OPS Â· 05 AUTOMATIONS</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Automations
            </h1>
            <p className="mt-1 text-sm text-muted">
              {status === "success"
                ? `${visibleAutomations.length} of ${automations.length} automation${
                    automations.length === 1 ? "" : "s"
                  }`
                : "Personal AI Automation OS"}
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className={`w-full rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:opacity-90 sm:w-auto ${FOCUS_RING}`}
          >
            Register automation
          </button>
        </header>

        {status === "success" && automations.length > 0 && (
          <div className="mb-6 flex flex-col gap-3 rounded-md border border-border bg-surface p-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex-1 sm:min-w-[220px]">
              <label htmlFor="automation-search" className="sr-only">
                Search automations
              </label>
              <input
                id="automation-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name or description..."
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
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="ERROR">Error</option>
                </select>
              </div>

              <div>
                <label htmlFor="sort-by" className="sr-only">
                  Sort automations
                </label>
                <select
                  id="sort-by"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className={`rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                >
                  <option value="NEWEST">Newest first</option>
                  <option value="OLDEST">Oldest first</option>
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
              âœ•
            </button>
          </div>
        )}

        {status === "loading" && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-md border border-border bg-surface"
              />
            ))}
          </div>
        )}

        {status === "error" && (
          <div className="rounded-md border border-danger/40 border-l-4 border-l-danger bg-surface p-5">
            <p className="font-semibold text-foreground">Couldn&apos;t load automations</p>
            <p className="mt-1 text-sm text-muted">{error}</p>
            <button
              onClick={loadAutomations}
              className={`mt-4 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:opacity-90 ${FOCUS_RING}`}
            >
              Retry
            </button>
          </div>
        )}

        {status === "success" && automations.length === 0 && (
          <div className="rounded-md border border-dashed border-border bg-surface p-10 text-center">
            <p className="font-semibold text-foreground">No automations registered</p>
            <p className="mt-1 text-sm text-muted">
              Register your first automation to start tracking it here.
            </p>
          </div>
        )}

        {status === "success" && automations.length > 0 && visibleAutomations.length === 0 && (
          <div className="rounded-md border border-dashed border-border bg-surface p-10 text-center">
            <p className="font-semibold text-foreground">No automations found</p>
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

        {status === "success" && visibleAutomations.length > 0 && (
          <ul className="space-y-2">
            {visibleAutomations.map((automation) => {
              const statusMeta = STATUS_META[automation.status];
              return (
                <li
                  key={automation.id}
                  className="rounded-md border border-border bg-surface p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-foreground">
                        {automation.name}
                      </p>
                      {automation.description && (
                        <p className="mt-1 line-clamp-2 break-words text-sm text-muted">
                          {automation.description}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusMeta.badge}`}
                      >
                        {statusMeta.label}
                      </span>
                      <button
                        onClick={() => openEditModal(automation)}
                        className={`rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-surface-raised ${FOCUS_RING}`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => openDeleteConfirm(automation)}
                        className={`rounded-md border border-danger/40 px-2.5 py-1 text-xs font-semibold text-danger transition-colors hover:bg-danger/10 ${FOCUS_RING}`}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                    {automation.trigger && <span>Trigger: {automation.trigger}</span>}
                    {automation.lastRunAt && (
                      <span>Last run {formatDateTime(automation.lastRunAt)}</span>
                    )}
                    {automation.nextRunAt && (
                      <span>Next run {formatDateTime(automation.nextRunAt)}</span>
                    )}
                    {automation.webhookUrl && (
                      <span className="max-w-[16rem] truncate" title={automation.webhookUrl}>
                        {automation.webhookUrl}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-md border border-border bg-surface-raised p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">New automation</h2>
              <button
                onClick={closeCreateModal}
                className={`rounded text-muted transition-colors hover:text-foreground ${FOCUS_RING}`}
                aria-label="Close"
              >
                âœ•
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
                  className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  placeholder="Daily digest email"
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
                  placeholder="What does this automation do?"
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
                      setCreateForm({
                        ...createForm,
                        status: e.target.value as AutomationStatus,
                      })
                    }
                    className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="ERROR">Error</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Trigger
                  </label>
                  <input
                    type="text"
                    value={createForm.trigger}
                    onChange={(e) => setCreateForm({ ...createForm, trigger: e.target.value })}
                    className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                    placeholder="Webhook / Schedule"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Webhook URL
                </label>
                <input
                  type="text"
                  value={createForm.webhookUrl}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, webhookUrl: e.target.value })
                  }
                  className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  placeholder="https://your-n8n-instance/webhook/..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Last run
                  </label>
                  <input
                    type="datetime-local"
                    value={createForm.lastRunAt}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, lastRunAt: e.target.value })
                    }
                    className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Next run
                  </label>
                  <input
                    type="datetime-local"
                    value={createForm.nextRunAt}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, nextRunAt: e.target.value })
                    }
                    className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
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
                  className={`rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className={`rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                >
                  {creating ? "Registering..." : "Register automation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingAutomation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-md border border-border bg-surface-raised p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Edit automation</h2>
              <button
                onClick={closeEditModal}
                className={`rounded text-muted transition-colors hover:text-foreground ${FOCUS_RING}`}
                aria-label="Close"
              >
                âœ•
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
                      setEditForm({ ...editForm, status: e.target.value as AutomationStatus })
                    }
                    className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="ERROR">Error</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Trigger
                  </label>
                  <input
                    type="text"
                    value={editForm.trigger}
                    onChange={(e) => setEditForm({ ...editForm, trigger: e.target.value })}
                    className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Webhook URL
                </label>
                <input
                  type="text"
                  value={editForm.webhookUrl}
                  onChange={(e) => setEditForm({ ...editForm, webhookUrl: e.target.value })}
                  className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Last run
                  </label>
                  <input
                    type="datetime-local"
                    value={editForm.lastRunAt}
                    onChange={(e) => setEditForm({ ...editForm, lastRunAt: e.target.value })}
                    className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Next run
                  </label>
                  <input
                    type="datetime-local"
                    value={editForm.nextRunAt}
                    onChange={(e) => setEditForm({ ...editForm, nextRunAt: e.target.value })}
                    className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  />
                </div>
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

      {deletingAutomation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-md border border-border bg-surface-raised p-6">
            <h2 className="text-lg font-bold text-foreground">Delete automation?</h2>

            <div className="mt-3 rounded-md border border-border bg-background p-3">
              <span className="break-words font-semibold text-foreground">
                {deletingAutomation.name}
              </span>
            </div>

            <p className="mt-3 text-sm text-muted">
              This will permanently delete this automation record. This cannot be undone.
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
                {deleting ? "Deleting..." : "Delete automation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}