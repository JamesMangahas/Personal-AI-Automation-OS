"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type LogStatus = "SUCCESS" | "FAILED";

type AutomationRef = { id: string; name: string };

type AutomationLog = {
  id: string;
  automationId: string;
  automation: AutomationRef;
  status: LogStatus;
  executionTime: number | null;
  error: string | null;
  input: string | null;
  output: string | null;
  createdAt: string;
};

type LoadStatus = "loading" | "success" | "error";
type Toast = { type: "success" | "error"; message: string };
type StatusFilter = "ALL" | LogStatus;

type FormState = {
  automationId: string;
  status: LogStatus;
  executionTime: string;
  error: string;
  input: string;
  output: string;
};

const STATUS_META: Record<LogStatus, { label: string; badge: string }> = {
  SUCCESS: { label: "Success", badge: "bg-success/15 text-success" },
  FAILED: { label: "Failed", badge: "bg-danger/15 text-danger" },
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

const EMPTY_FORM: FormState = {
  automationId: "",
  status: "SUCCESS",
  executionTime: "",
  error: "",
  input: "",
  output: "",
};

function toFormState(log: AutomationLog): FormState {
  return {
    automationId: log.automationId,
    status: log.status,
    executionTime: log.executionTime !== null ? String(log.executionTime) : "",
    error: log.error ?? "",
    input: log.input ?? "",
    output: log.output ?? "",
  };
}

export default function AutomationLogsPage() {
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [automations, setAutomations] = useState<AutomationRef[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(EMPTY_FORM);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [editingLog, setEditingLog] = useState<AutomationLog | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deletingLog, setDeletingLog] = useState<AutomationLog | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [viewingLog, setViewingLog] = useState<AutomationLog | null>(null);

  const [toast, setToast] = useState<Toast | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [automationFilter, setAutomationFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"NEWEST" | "OLDEST">("NEWEST");

  const loadData = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const [logsRes, automationsRes] = await Promise.all([
        fetch("/api/automation-logs"),
        fetch("/api/automations"),
      ]);
      const [logsData, automationsData] = await Promise.all([
        logsRes.json(),
        automationsRes.json(),
      ]);

      if (!logsRes.ok || !logsData.success) {
        throw new Error(logsData.error || "Failed to load automation logs.");
      }
      if (!automationsRes.ok || !automationsData.success) {
        throw new Error(automationsData.error || "Failed to load automations.");
      }

      setLogs(logsData.logs as AutomationLog[]);
      setAutomations(
        (automationsData.automations as { id: string; name: string }[]).map((a) => ({
          id: a.id,
          name: a.name,
        }))
      );
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const visibleLogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = logs.filter((log) => {
      if (statusFilter !== "ALL" && log.status !== statusFilter) return false;
      if (automationFilter !== "ALL" && log.automationId !== automationFilter) return false;
      if (query && !log.automation.name.toLowerCase().includes(query)) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return sortBy === "NEWEST" ? diff : -diff;
    });
  }, [logs, searchQuery, statusFilter, automationFilter, sortBy]);

  const hasActiveFilters =
    searchQuery.trim() !== "" || statusFilter !== "ALL" || automationFilter !== "ALL";

  function clearFilters() {
    setSearchQuery("");
    setStatusFilter("ALL");
    setAutomationFilter("ALL");
  }

  function openCreateModal() {
    setCreateForm({ ...EMPTY_FORM, automationId: automations[0]?.id ?? "" });
    setCreateError(null);
    setIsCreateOpen(true);
  }

  function closeCreateModal() {
    if (creating) return;
    setIsCreateOpen(false);
  }

  async function handleCreateSubmit(e: FormEvent) {
    e.preventDefault();

    if (!createForm.automationId) {
      setCreateError("Automation is required.");
      return;
    }

    setCreateError(null);
    setCreating(true);

    try {
      const body: Record<string, string> = {
        automationId: createForm.automationId,
        status: createForm.status,
      };
      if (createForm.executionTime.trim()) body.executionTime = createForm.executionTime.trim();
      if (createForm.error.trim()) body.error = createForm.error.trim();
      if (createForm.input.trim()) body.input = createForm.input.trim();
      if (createForm.output.trim()) body.output = createForm.output.trim();

      const res = await fetch("/api/automation-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create automation log.");
      }

      setLogs((current) => [data.log as AutomationLog, ...current]);
      setIsCreateOpen(false);
      setCreateForm(EMPTY_FORM);
      setToast({ type: "success", message: "Log entry was created." });
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create automation log.");
    } finally {
      setCreating(false);
    }
  }

  function openEditModal(log: AutomationLog) {
    setEditingLog(log);
    setEditForm(toFormState(log));
    setEditError(null);
  }

  function closeEditModal() {
    if (saving) return;
    setEditingLog(null);
  }

  async function handleEditSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editingLog) return;

    if (!editForm.automationId) {
      setEditError("Automation is required.");
      return;
    }

    const changes: Record<string, string | number | null> = {};

    if (editForm.automationId !== editingLog.automationId) {
      changes.automationId = editForm.automationId;
    }
    if (editForm.status !== editingLog.status) {
      changes.status = editForm.status;
    }

    const oldExecutionTime =
      editingLog.executionTime !== null ? String(editingLog.executionTime) : "";
    if (editForm.executionTime.trim() !== oldExecutionTime) {
      changes.executionTime = editForm.executionTime.trim() === "" ? null : editForm.executionTime.trim();
    }

    const stringFields: Array<[keyof FormState, keyof AutomationLog]> = [
      ["error", "error"],
      ["input", "input"],
      ["output", "output"],
    ];
    for (const [formKey, logKey] of stringFields) {
      const newVal = (editForm[formKey] as string).trim();
      const oldVal = (editingLog[logKey] as string | null) ?? "";
      if (newVal !== oldVal) {
        changes[formKey] = newVal === "" ? null : newVal;
      }
    }

    if (Object.keys(changes).length === 0) {
      setEditingLog(null);
      return;
    }

    setEditError(null);
    setSaving(true);

    try {
      const res = await fetch(`/api/automation-logs/${editingLog.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update automation log.");
      }

      const updated = data.log as AutomationLog;
      setLogs((current) => current.map((l) => (l.id === updated.id ? updated : l)));
      setEditingLog(null);
      setToast({ type: "success", message: "Log entry was updated." });
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update automation log.");
    } finally {
      setSaving(false);
    }
  }

  function openDeleteConfirm(log: AutomationLog) {
    setDeletingLog(log);
    setDeleteError(null);
  }

  function closeDeleteConfirm() {
    if (deleting) return;
    setDeletingLog(null);
  }

  async function handleConfirmDelete() {
    if (!deletingLog || deleting) return;

    setDeleteError(null);
    setDeleting(true);

    try {
      const res = await fetch(`/api/automation-logs/${deletingLog.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete automation log.");
      }

      const deletedId = deletingLog.id;
      setLogs((current) => current.filter((l) => l.id !== deletedId));
      setDeletingLog(null);
      setToast({ type: "success", message: "Log entry was deleted." });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete automation log.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-8 sm:py-10 lg:px-10">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs tracking-wide text-muted">OPS · 06 LOGS</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Automation Logs
            </h1>
            <p className="mt-1 text-sm text-muted">
              {status === "success"
                ? `${visibleLogs.length} of ${logs.length} log${logs.length === 1 ? "" : "s"}`
                : "Personal AI Automation OS"}
            </p>
          </div>
          <button
            onClick={openCreateModal}
            disabled={automations.length === 0}
            className={`w-full rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${FOCUS_RING}`}
          >
            Create log
          </button>
        </header>

        {status === "success" && automations.length === 0 && (
          <div className="mb-6 rounded-md border border-dashed border-border bg-surface p-5 text-sm text-muted">
            You need at least one registered automation before you can create a log. Visit{" "}
            <a href="/automations" className="font-medium text-accent hover:underline">
              Automations
            </a>{" "}
            to add one.
          </div>
        )}

        {status === "success" && logs.length > 0 && (
          <div className="mb-6 flex flex-col gap-3 rounded-md border border-border bg-surface p-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex-1 sm:min-w-[220px]">
              <label htmlFor="log-search" className="sr-only">
                Search by automation name
              </label>
              <input
                id="log-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search automation name..."
                className={`w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <div>
                <label htmlFor="automation-filter" className="sr-only">
                  Filter by automation
                </label>
                <select
                  id="automation-filter"
                  value={automationFilter}
                  onChange={(e) => setAutomationFilter(e.target.value)}
                  className={`rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                >
                  <option value="ALL">All automations</option>
                  {automations.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

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
                  <option value="SUCCESS">Success</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>

              <div>
                <label htmlFor="sort-by" className="sr-only">
                  Sort logs
                </label>
                <select
                  id="sort-by"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "NEWEST" | "OLDEST")}
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
            <p className="font-semibold text-foreground">Couldn&apos;t load automation logs</p>
            <p className="mt-1 text-sm text-muted">{error}</p>
            <button
              onClick={loadData}
              className={`mt-4 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:opacity-90 ${FOCUS_RING}`}
            >
              Retry
            </button>
          </div>
        )}

        {status === "success" && logs.length === 0 && (
          <div className="rounded-md border border-dashed border-border bg-surface p-10 text-center">
            <p className="font-semibold text-foreground">No logs yet</p>
            <p className="mt-1 text-sm text-muted">
              Logs from your automation runs will appear here.
            </p>
          </div>
        )}

        {status === "success" && logs.length > 0 && visibleLogs.length === 0 && (
          <div className="rounded-md border border-dashed border-border bg-surface p-10 text-center">
            <p className="font-semibold text-foreground">No logs found</p>
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

        {status === "success" && visibleLogs.length > 0 && (
          <ul className="space-y-2">
            {visibleLogs.map((log) => {
              const statusMeta = STATUS_META[log.status];
              const hasDetails = Boolean(log.input || log.output || log.error);
              return (
                <li
                  key={log.id}
                  className="rounded-md border border-border bg-surface p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-foreground">
                        {log.automation.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {formatDateTime(log.createdAt)}
                        {log.executionTime !== null && ` · ${log.executionTime}ms`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusMeta.badge}`}
                      >
                        {statusMeta.label}
                      </span>
                      {hasDetails && (
                        <button
                          onClick={() => setViewingLog(log)}
                          className={`rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-surface-raised ${FOCUS_RING}`}
                        >
                          View details
                        </button>
                      )}
                      <button
                        onClick={() => openEditModal(log)}
                        className={`rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-surface-raised ${FOCUS_RING}`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => openDeleteConfirm(log)}
                        className={`rounded-md border border-danger/40 px-2.5 py-1 text-xs font-semibold text-danger transition-colors hover:bg-danger/10 ${FOCUS_RING}`}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {log.status === "FAILED" && log.error && (
                    <p className="mt-2 line-clamp-2 break-words text-sm text-danger">
                      {log.error}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {viewingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-md border border-border bg-surface-raised p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">
                {viewingLog.automation.name} — Log details
              </h2>
              <button
                onClick={() => setViewingLog(null)}
                className={`rounded text-muted transition-colors hover:text-foreground ${FOCUS_RING}`}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-4 text-muted">
                <span>{formatDateTime(viewingLog.createdAt)}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    STATUS_META[viewingLog.status].badge
                  }`}
                >
                  {STATUS_META[viewingLog.status].label}
                </span>
                {viewingLog.executionTime !== null && (
                  <span>{viewingLog.executionTime}ms</span>
                )}
              </div>

              {viewingLog.error && (
                <div>
                  <p className="mb-1 font-medium text-danger">Error</p>
                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md border border-danger/30 bg-background p-3 text-xs text-danger">
                    {viewingLog.error}
                  </pre>
                </div>
              )}

              {viewingLog.input && (
                <div>
                  <p className="mb-1 font-medium text-foreground">Input</p>
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-background p-3 text-xs text-muted">
                    {viewingLog.input}
                  </pre>
                </div>
              )}

              {viewingLog.output && (
                <div>
                  <p className="mb-1 font-medium text-foreground">Output</p>
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-background p-3 text-xs text-muted">
                    {viewingLog.output}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-md border border-border bg-surface-raised p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">New log entry</h2>
              <button
                onClick={closeCreateModal}
                className={`rounded text-muted transition-colors hover:text-foreground ${FOCUS_RING}`}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Automation <span className="text-danger">*</span>
                  </label>
                  <select
                    value={createForm.automationId}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, automationId: e.target.value })
                    }
                    className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                    autoFocus
                  >
                    {automations.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Status
                  </label>
                  <select
                    value={createForm.status}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, status: e.target.value as LogStatus })
                    }
                    className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  >
                    <option value="SUCCESS">Success</option>
                    <option value="FAILED">Failed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Execution time (ms)
                </label>
                <input
                  type="number"
                  min="0"
                  value={createForm.executionTime}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, executionTime: e.target.value })
                  }
                  className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  placeholder="e.g. 1240"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Error
                </label>
                <textarea
                  value={createForm.error}
                  onChange={(e) => setCreateForm({ ...createForm, error: e.target.value })}
                  className={`w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  rows={2}
                  placeholder="Only if the run failed"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Input
                </label>
                <textarea
                  value={createForm.input}
                  onChange={(e) => setCreateForm({ ...createForm, input: e.target.value })}
                  className={`w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  rows={3}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Output
                </label>
                <textarea
                  value={createForm.output}
                  onChange={(e) => setCreateForm({ ...createForm, output: e.target.value })}
                  className={`w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  rows={3}
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
                  {creating ? "Creating..." : "Create log"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-md border border-border bg-surface-raised p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Edit log entry</h2>
              <button
                onClick={closeEditModal}
                className={`rounded text-muted transition-colors hover:text-foreground ${FOCUS_RING}`}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Automation <span className="text-danger">*</span>
                  </label>
                  <select
                    value={editForm.automationId}
                    onChange={(e) =>
                      setEditForm({ ...editForm, automationId: e.target.value })
                    }
                    className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                    autoFocus
                  >
                    {automations.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm({ ...editForm, status: e.target.value as LogStatus })
                    }
                    className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  >
                    <option value="SUCCESS">Success</option>
                    <option value="FAILED">Failed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Execution time (ms)
                </label>
                <input
                  type="number"
                  min="0"
                  value={editForm.executionTime}
                  onChange={(e) =>
                    setEditForm({ ...editForm, executionTime: e.target.value })
                  }
                  className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Error
                </label>
                <textarea
                  value={editForm.error}
                  onChange={(e) => setEditForm({ ...editForm, error: e.target.value })}
                  className={`w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  rows={2}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Input
                </label>
                <textarea
                  value={editForm.input}
                  onChange={(e) => setEditForm({ ...editForm, input: e.target.value })}
                  className={`w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  rows={3}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Output
                </label>
                <textarea
                  value={editForm.output}
                  onChange={(e) => setEditForm({ ...editForm, output: e.target.value })}
                  className={`w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  rows={3}
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

      {deletingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-md border border-border bg-surface-raised p-6">
            <h2 className="text-lg font-bold text-foreground">Delete log entry?</h2>

            <div className="mt-3 rounded-md border border-border bg-background p-3">
              <p className="break-words font-semibold text-foreground">
                {deletingLog.automation.name}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {formatDateTime(deletingLog.createdAt)} · {STATUS_META[deletingLog.status].label}
              </p>
            </div>

            <p className="mt-3 text-sm text-muted">
              This will permanently delete this log entry. This cannot be undone.
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
                {deleting ? "Deleting..." : "Delete log"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}