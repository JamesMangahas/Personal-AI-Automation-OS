"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type JobStatus =
  | "INTERESTED"
  | "PREPARING"
  | "APPLIED"
  | "INTERVIEW"
  | "ASSESSMENT"
  | "OFFER"
  | "REJECTED"
  | "HIRED";

type JobApplication = {
  id: string;
  company: string;
  position: string;
  url: string | null;
  salary: string | null;
  appliedDate: string | null;
  status: JobStatus;
  interviewDate: string | null;
  contact: string | null;
  notes: string | null;
  followUpDate: string | null;
  createdAt: string;
  updatedAt: string;
};

type LoadStatus = "loading" | "success" | "error";
type Toast = { type: "success" | "error"; message: string };
type StatusFilter = "ALL" | JobStatus;

type FormState = {
  company: string;
  position: string;
  url: string;
  salary: string;
  appliedDate: string;
  status: JobStatus;
  interviewDate: string;
  contact: string;
  notes: string;
  followUpDate: string;
};

const STATUS_META: Record<JobStatus, { label: string; badge: string }> = {
  INTERESTED: { label: "Interested", badge: "bg-status-planning/15 text-status-planning" },
  PREPARING: { label: "Preparing", badge: "bg-priority-medium/15 text-priority-medium" },
  APPLIED: { label: "Applied", badge: "bg-status-active/15 text-status-active" },
  INTERVIEW: { label: "Interview", badge: "bg-accent/15 text-accent" },
  ASSESSMENT: { label: "Assessment", badge: "bg-priority-medium/15 text-priority-medium" },
  OFFER: { label: "Offer", badge: "bg-status-completed/15 text-status-completed" },
  REJECTED: { label: "Rejected", badge: "bg-danger/15 text-danger" },
  HIRED: { label: "Hired", badge: "bg-status-completed/15 text-status-completed" },
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

function toDateInputValue(value: string | null): string {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

const EMPTY_FORM: FormState = {
  company: "",
  position: "",
  url: "",
  salary: "",
  appliedDate: "",
  status: "INTERESTED",
  interviewDate: "",
  contact: "",
  notes: "",
  followUpDate: "",
};

function toFormState(job: JobApplication): FormState {
  return {
    company: job.company,
    position: job.position,
    url: job.url ?? "",
    salary: job.salary ?? "",
    appliedDate: toDateInputValue(job.appliedDate),
    status: job.status,
    interviewDate: toDateInputValue(job.interviewDate),
    contact: job.contact ?? "",
    notes: job.notes ?? "",
    followUpDate: toDateInputValue(job.followUpDate),
  };
}

export default function JobsPage() {
  const [jobApplications, setJobApplications] = useState<JobApplication[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(EMPTY_FORM);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [editingJob, setEditingJob] = useState<JobApplication | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deletingJob, setDeletingJob] = useState<JobApplication | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState<Toast | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const loadJobs = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/job-applications");
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load job applications.");
      }
      setJobApplications(data.jobApplications as JobApplication[]);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const visibleJobs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = jobApplications.filter((job) => {
      if (statusFilter !== "ALL" && job.status !== statusFilter) return false;

      if (query) {
        const haystack = `${job.company} ${job.position}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });

    return [...filtered].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [jobApplications, searchQuery, statusFilter]);

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

    const company = createForm.company.trim();
    const position = createForm.position.trim();

    if (!company) {
      setCreateError("Company is required.");
      return;
    }
    if (!position) {
      setCreateError("Position is required.");
      return;
    }

    setCreateError(null);
    setCreating(true);

    try {
      const body: Record<string, string> = { company, position, status: createForm.status };
      if (createForm.url.trim()) body.url = createForm.url.trim();
      if (createForm.salary.trim()) body.salary = createForm.salary.trim();
      if (createForm.appliedDate) body.appliedDate = createForm.appliedDate;
      if (createForm.interviewDate) body.interviewDate = createForm.interviewDate;
      if (createForm.contact.trim()) body.contact = createForm.contact.trim();
      if (createForm.notes.trim()) body.notes = createForm.notes.trim();
      if (createForm.followUpDate) body.followUpDate = createForm.followUpDate;

      const res = await fetch("/api/job-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create job application.");
      }

      setJobApplications((current) => [data.jobApplication as JobApplication, ...current]);
      setIsCreateOpen(false);
      setCreateForm(EMPTY_FORM);
      setToast({
        type: "success",
        message: `"${data.jobApplication.position}" at "${data.jobApplication.company}" was added.`,
      });
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create job application.");
    } finally {
      setCreating(false);
    }
  }

  function openEditModal(job: JobApplication) {
    setEditingJob(job);
    setEditForm(toFormState(job));
    setEditError(null);
  }

  function closeEditModal() {
    if (saving) return;
    setEditingJob(null);
  }

  async function handleEditSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editingJob) return;

    const company = editForm.company.trim();
    if (!company) {
      setEditError("Company is required.");
      return;
    }
    const position = editForm.position.trim();
    if (!position) {
      setEditError("Position is required.");
      return;
    }

    const changes: Record<string, string | null> = {};

    if (company !== editingJob.company) changes.company = company;
    if (position !== editingJob.position) changes.position = position;

    const stringFields: Array<[keyof FormState, keyof JobApplication]> = [
      ["url", "url"],
      ["salary", "salary"],
      ["contact", "contact"],
      ["notes", "notes"],
    ];
    for (const [formKey, jobKey] of stringFields) {
      const newVal = (editForm[formKey] as string).trim();
      const oldVal = (editingJob[jobKey] as string | null) ?? "";
      if (newVal !== oldVal) {
        changes[formKey] = newVal === "" ? null : newVal;
      }
    }

    if (editForm.status !== editingJob.status) {
      changes.status = editForm.status;
    }

    const dateFields: Array<[keyof FormState, keyof JobApplication]> = [
      ["appliedDate", "appliedDate"],
      ["interviewDate", "interviewDate"],
      ["followUpDate", "followUpDate"],
    ];
    for (const [formKey, jobKey] of dateFields) {
      const newVal = editForm[formKey] as string;
      const oldVal = toDateInputValue(editingJob[jobKey] as string | null);
      if (newVal !== oldVal) {
        changes[formKey] = newVal === "" ? null : newVal;
      }
    }

    if (Object.keys(changes).length === 0) {
      setEditingJob(null);
      return;
    }

    setEditError(null);
    setSaving(true);

    try {
      const res = await fetch(`/api/job-applications/${editingJob.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update job application.");
      }

      const updated = data.jobApplication as JobApplication;
      setJobApplications((current) =>
        current.map((j) => (j.id === updated.id ? updated : j))
      );
      setEditingJob(null);
      setToast({
        type: "success",
        message: `"${updated.position}" at "${updated.company}" was updated.`,
      });
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update job application.");
    } finally {
      setSaving(false);
    }
  }

  function openDeleteConfirm(job: JobApplication) {
    setDeletingJob(job);
    setDeleteError(null);
  }

  function closeDeleteConfirm() {
    if (deleting) return;
    setDeletingJob(null);
  }

  async function handleConfirmDelete() {
    if (!deletingJob || deleting) return;

    setDeleteError(null);
    setDeleting(true);

    try {
      const res = await fetch(`/api/job-applications/${deletingJob.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete job application.");
      }

      const deletedId = deletingJob.id;
      const label = `"${deletingJob.position}" at "${deletingJob.company}"`;
      setJobApplications((current) => current.filter((j) => j.id !== deletedId));
      setDeletingJob(null);
      setToast({ type: "success", message: `${label} was deleted.` });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete job application.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-8 sm:py-10 lg:px-10">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs tracking-wide text-muted">OPS · 04 JOBS</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Job Applications
            </h1>
            <p className="mt-1 text-sm text-muted">
              {status === "success"
                ? `${visibleJobs.length} of ${jobApplications.length} application${
                    jobApplications.length === 1 ? "" : "s"
                  }`
                : "Personal AI Automation OS"}
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className={`w-full rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:opacity-90 sm:w-auto ${FOCUS_RING}`}
          >
            Add application
          </button>
        </header>

        {status === "success" && jobApplications.length > 0 && (
          <div className="mb-6 flex flex-col gap-3 rounded-md border border-border bg-surface p-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex-1 sm:min-w-[220px]">
              <label htmlFor="job-search" className="sr-only">
                Search job applications
              </label>
              <input
                id="job-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search company or position..."
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
                  <option value="INTERESTED">Interested</option>
                  <option value="PREPARING">Preparing</option>
                  <option value="APPLIED">Applied</option>
                  <option value="INTERVIEW">Interview</option>
                  <option value="ASSESSMENT">Assessment</option>
                  <option value="OFFER">Offer</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="HIRED">Hired</option>
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
                className="h-24 animate-pulse rounded-md border border-border bg-surface"
              />
            ))}
          </div>
        )}

        {status === "error" && (
          <div className="rounded-md border border-danger/40 border-l-4 border-l-danger bg-surface p-5">
            <p className="font-semibold text-foreground">Couldn&apos;t load job applications</p>
            <p className="mt-1 text-sm text-muted">{error}</p>
            <button
              onClick={loadJobs}
              className={`mt-4 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:opacity-90 ${FOCUS_RING}`}
            >
              Retry
            </button>
          </div>
        )}

        {status === "success" && jobApplications.length === 0 && (
          <div className="rounded-md border border-dashed border-border bg-surface p-10 text-center">
            <p className="font-semibold text-foreground">No job applications yet</p>
            <p className="mt-1 text-sm text-muted">
              Add your first application to start tracking it here.
            </p>
          </div>
        )}

        {status === "success" && jobApplications.length > 0 && visibleJobs.length === 0 && (
          <div className="rounded-md border border-dashed border-border bg-surface p-10 text-center">
            <p className="font-semibold text-foreground">No applications found</p>
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

        {status === "success" && visibleJobs.length > 0 && (
          <ul className="space-y-2">
            {visibleJobs.map((job) => {
              const statusMeta = STATUS_META[job.status];
              return (
                <li
                  key={job.id}
                  className="rounded-md border border-border bg-surface p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-foreground">
                        {job.position}
                      </p>
                      <p className="break-words text-sm text-muted">{job.company}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusMeta.badge}`}
                      >
                        {statusMeta.label}
                      </span>
                      <button
                        onClick={() => openEditModal(job)}
                        className={`rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-surface-raised ${FOCUS_RING}`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => openDeleteConfirm(job)}
                        className={`rounded-md border border-danger/40 px-2.5 py-1 text-xs font-semibold text-danger transition-colors hover:bg-danger/10 ${FOCUS_RING}`}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                    {job.salary && <span>{job.salary}</span>}
                    {job.appliedDate && <span>Applied {formatDate(job.appliedDate)}</span>}
                    {job.interviewDate && (
                      <span>Interview {formatDate(job.interviewDate)}</span>
                    )}
                    {job.followUpDate && (
                      <span>Follow up {formatDate(job.followUpDate)}</span>
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
              <h2 className="text-xl font-bold text-foreground">New application</h2>
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
                    Company <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={createForm.company}
                    onChange={(e) => setCreateForm({ ...createForm, company: e.target.value })}
                    className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                    placeholder="Acme Corp"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Position <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={createForm.position}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, position: e.target.value })
                    }
                    className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                    placeholder="Frontend Engineer"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Job posting URL
                </label>
                <input
                  type="text"
                  value={createForm.url}
                  onChange={(e) => setCreateForm({ ...createForm, url: e.target.value })}
                  className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  placeholder="https://..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Salary
                  </label>
                  <input
                    type="text"
                    value={createForm.salary}
                    onChange={(e) => setCreateForm({ ...createForm, salary: e.target.value })}
                    className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                    placeholder="$90k - $110k"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Status
                  </label>
                  <select
                    value={createForm.status}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, status: e.target.value as JobStatus })
                    }
                    className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  >
                    <option value="INTERESTED">Interested</option>
                    <option value="PREPARING">Preparing</option>
                    <option value="APPLIED">Applied</option>
                    <option value="INTERVIEW">Interview</option>
                    <option value="ASSESSMENT">Assessment</option>
                    <option value="OFFER">Offer</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="HIRED">Hired</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Applied date
                  </label>
                  <input
                    type="date"
                    value={createForm.appliedDate}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, appliedDate: e.target.value })
                    }
                    className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Interview date
                  </label>
                  <input
                    type="date"
                    value={createForm.interviewDate}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, interviewDate: e.target.value })
                    }
                    className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Contact
                </label>
                <input
                  type="text"
                  value={createForm.contact}
                  onChange={(e) => setCreateForm({ ...createForm, contact: e.target.value })}
                  className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  placeholder="Recruiter name / email"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Notes
                </label>
                <textarea
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  className={`w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  rows={3}
                  placeholder="Optional details"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Follow-up date
                </label>
                <input
                  type="date"
                  value={createForm.followUpDate}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, followUpDate: e.target.value })
                  }
                  className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
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
                  {creating ? "Adding..." : "Add application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-md border border-border bg-surface-raised p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Edit application</h2>
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
                    Company <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.company}
                    onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                    className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Position <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.position}
                    onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                    className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Job posting URL
                </label>
                <input
                  type="text"
                  value={editForm.url}
                  onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                  className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Salary
                  </label>
                  <input
                    type="text"
                    value={editForm.salary}
                    onChange={(e) => setEditForm({ ...editForm, salary: e.target.value })}
                    className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm({ ...editForm, status: e.target.value as JobStatus })
                    }
                    className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  >
                    <option value="INTERESTED">Interested</option>
                    <option value="PREPARING">Preparing</option>
                    <option value="APPLIED">Applied</option>
                    <option value="INTERVIEW">Interview</option>
                    <option value="ASSESSMENT">Assessment</option>
                    <option value="OFFER">Offer</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="HIRED">Hired</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Applied date
                  </label>
                  <input
                    type="date"
                    value={editForm.appliedDate}
                    onChange={(e) =>
                      setEditForm({ ...editForm, appliedDate: e.target.value })
                    }
                    className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Interview date
                  </label>
                  <input
                    type="date"
                    value={editForm.interviewDate}
                    onChange={(e) =>
                      setEditForm({ ...editForm, interviewDate: e.target.value })
                    }
                    className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Contact
                </label>
                <input
                  type="text"
                  value={editForm.contact}
                  onChange={(e) => setEditForm({ ...editForm, contact: e.target.value })}
                  className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Notes
                </label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className={`w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  rows={3}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Follow-up date
                </label>
                <input
                  type="date"
                  value={editForm.followUpDate}
                  onChange={(e) =>
                    setEditForm({ ...editForm, followUpDate: e.target.value })
                  }
                  className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
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

      {deletingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-md border border-border bg-surface-raised p-6">
            <h2 className="text-lg font-bold text-foreground">Delete application?</h2>

            <div className="mt-3 rounded-md border border-border bg-background p-3">
              <p className="break-words font-semibold text-foreground">
                {deletingJob.position}
              </p>
              <p className="break-words text-sm text-muted">{deletingJob.company}</p>
            </div>

            <p className="mt-3 text-sm text-muted">
              This will permanently delete this job application. This cannot be undone.
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
                {deleting ? "Deleting..." : "Delete application"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}