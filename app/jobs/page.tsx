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

const STATUS_META: Record<JobStatus, { label: string; tone: BadgeTone; bar: string }> = {
  INTERESTED: { label: "Interested", tone: "status-planning", bar: "bg-status-planning" },
  PREPARING: { label: "Preparing", tone: "priority-medium", bar: "bg-priority-medium" },
  APPLIED: { label: "Applied", tone: "status-active", bar: "bg-status-active" },
  INTERVIEW: { label: "Interview", tone: "accent", bar: "bg-accent" },
  ASSESSMENT: { label: "Assessment", tone: "priority-medium", bar: "bg-priority-medium" },
  OFFER: { label: "Offer", tone: "status-completed", bar: "bg-status-completed" },
  REJECTED: { label: "Rejected", tone: "danger", bar: "bg-danger" },
  HIRED: { label: "Hired", tone: "success", bar: "bg-success" },
};

const MICRO_LABEL = "mb-1 block font-mono text-[10px] uppercase tracking-[0.15em] text-muted";

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
  const { showToast } = useToast();

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadJobs();
  }, [loadJobs]);

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
      showToast("success", `"${data.jobApplication.position}" at "${data.jobApplication.company}" was added.`);
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
      showToast("success", `"${updated.position}" at "${updated.company}" was updated.`);
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
      showToast("success", `${label} was deleted.`);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete job application.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-8 sm:py-14 lg:px-10">
      <div className="mx-auto max-w-4xl">
        <header className="mb-10 border-b border-border pb-8">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">System / Jobs</p>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                Job Applications
              </h1>
              <p className="mt-2 max-w-md text-sm text-muted sm:text-base">
                Track outreach, interviews, and offers in one place.
              </p>
            </div>
            <Button onClick={openCreateModal}>Add application</Button>
          </div>
        </header>

        {status === "success" && jobApplications.length > 0 && (
          <Card variant="raised" className="mb-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <label htmlFor="job-search" className={MICRO_LABEL}>
                  Search
                </label>
                <Input
                  id="job-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Company or position..."
                />
              </div>
              <div>
                <label htmlFor="status-filter" className={MICRO_LABEL}>
                  Status
                </label>
                <Select id="status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
                  <option value="ALL">All statuses</option>
                  <option value="INTERESTED">Interested</option>
                  <option value="PREPARING">Preparing</option>
                  <option value="APPLIED">Applied</option>
                  <option value="INTERVIEW">Interview</option>
                  <option value="ASSESSMENT">Assessment</option>
                  <option value="OFFER">Offer</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="HIRED">Hired</option>
                </Select>
              </div>
            </div>
            {hasActiveFilters && (
              <div className="mt-4 flex justify-end border-t border-border pt-4">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              </div>
            )}
          </Card>
        )}

        {status === "loading" && <SkeletonList count={4} />}

        {status === "error" && (
          <Card variant="raised" className="border-l-4 border-l-danger">
            <p className="font-semibold text-foreground">Couldn&apos;t load job applications</p>
            <p className="mt-1 text-sm text-muted">{error}</p>
            <Button onClick={loadJobs} className="mt-4">
              Retry
            </Button>
          </Card>
        )}

        {status === "success" && jobApplications.length === 0 && (
          <EmptyState title="No job applications yet" message="Add your first application to start tracking it here." />
        )}

        {status === "success" && jobApplications.length > 0 && visibleJobs.length === 0 && (
          <EmptyState
            title="No applications found"
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

        {status === "success" && visibleJobs.length > 0 && (
          <>
            <div className="mb-4 flex items-center gap-3">
              <span className="font-mono text-sm font-semibold text-accent">01</span>
              <span className="h-px w-8 bg-gradient-to-r from-accent/50 to-transparent" aria-hidden="true" />
              <h2 className="text-xl font-bold tracking-tight text-foreground">Job Application Operations</h2>
              <span className="ml-auto font-mono text-xs text-muted">
                {visibleJobs.length} / {jobApplications.length}
              </span>
            </div>

            <ul className="space-y-2">
              {visibleJobs.map((job) => {
                const statusMeta = STATUS_META[job.status];
                return (
                  <li key={job.id}>
                    <Card variant="raised" hoverable className={`relative overflow-hidden border-l-4 pt-4`} style={{}}>
                      <span className={`absolute inset-x-0 top-0 h-0.5 ${statusMeta.bar}`} aria-hidden="true" />
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-lg font-bold text-foreground">{job.position}</p>
                          <p className="break-words text-sm text-muted">{job.company}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                          <Button variant="secondary" size="sm" onClick={() => openEditModal(job)}>
                            Edit
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => openDeleteConfirm(job)}>
                            Delete
                          </Button>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 font-mono text-xs text-muted">
                        {job.salary && <span>{job.salary}</span>}
                        {job.appliedDate && <span>Applied {formatDate(job.appliedDate)}</span>}
                        {job.interviewDate && <span>Interview {formatDate(job.interviewDate)}</span>}
                        {job.followUpDate && <span>Follow up {formatDate(job.followUpDate)}</span>}
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      <Modal open={isCreateOpen} onClose={closeCreateModal} title="New application" closeDisabled={creating}>
        <form onSubmit={handleCreateSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Company"
              required
              name="company"
              value={createForm.company}
              onChange={(e) => setCreateForm({ ...createForm, company: e.target.value })}
              placeholder="Acme Corp"
              autoFocus
            />
            <Input
              label="Position"
              required
              name="position"
              value={createForm.position}
              onChange={(e) => setCreateForm({ ...createForm, position: e.target.value })}
              placeholder="Frontend Engineer"
            />
          </div>

          <Input
            label="Job posting URL"
            name="url"
            value={createForm.url}
            onChange={(e) => setCreateForm({ ...createForm, url: e.target.value })}
            placeholder="https://..."
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Salary"
              name="salary"
              value={createForm.salary}
              onChange={(e) => setCreateForm({ ...createForm, salary: e.target.value })}
              placeholder="$90k - $110k"
            />
            <Select
              label="Status"
              name="status"
              value={createForm.status}
              onChange={(e) => setCreateForm({ ...createForm, status: e.target.value as JobStatus })}
            >
              <option value="INTERESTED">Interested</option>
              <option value="PREPARING">Preparing</option>
              <option value="APPLIED">Applied</option>
              <option value="INTERVIEW">Interview</option>
              <option value="ASSESSMENT">Assessment</option>
              <option value="OFFER">Offer</option>
              <option value="REJECTED">Rejected</option>
              <option value="HIRED">Hired</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <DateInput
              label="Applied date"
              name="appliedDate"
              value={createForm.appliedDate}
              onChange={(e) => setCreateForm({ ...createForm, appliedDate: e.target.value })}
            />
            <DateInput
              label="Interview date"
              name="interviewDate"
              value={createForm.interviewDate}
              onChange={(e) => setCreateForm({ ...createForm, interviewDate: e.target.value })}
            />
          </div>

          <Input
            label="Contact"
            name="contact"
            value={createForm.contact}
            onChange={(e) => setCreateForm({ ...createForm, contact: e.target.value })}
            placeholder="Recruiter name / email"
          />

          <Textarea
            label="Notes"
            name="notes"
            value={createForm.notes}
            onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
            placeholder="Optional details"
          />

          <DateInput
            label="Follow-up date"
            name="followUpDate"
            value={createForm.followUpDate}
            onChange={(e) => setCreateForm({ ...createForm, followUpDate: e.target.value })}
          />

          {createError && <p className="text-sm font-medium text-danger">{createError}</p>}

          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={closeCreateModal} disabled={creating}>
              Cancel
            </Button>
            <Button type="submit" loading={creating} loadingText="Adding...">
              Add application
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editingJob} onClose={closeEditModal} title="Edit application" closeDisabled={saving}>
        <form onSubmit={handleEditSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Company"
              required
              name="edit-company"
              value={editForm.company}
              onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
              autoFocus
            />
            <Input
              label="Position"
              required
              name="edit-position"
              value={editForm.position}
              onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
            />
          </div>

          <Input
            label="Job posting URL"
            name="edit-url"
            value={editForm.url}
            onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Salary"
              name="edit-salary"
              value={editForm.salary}
              onChange={(e) => setEditForm({ ...editForm, salary: e.target.value })}
            />
            <Select
              label="Status"
              name="edit-status"
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value as JobStatus })}
            >
              <option value="INTERESTED">Interested</option>
              <option value="PREPARING">Preparing</option>
              <option value="APPLIED">Applied</option>
              <option value="INTERVIEW">Interview</option>
              <option value="ASSESSMENT">Assessment</option>
              <option value="OFFER">Offer</option>
              <option value="REJECTED">Rejected</option>
              <option value="HIRED">Hired</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <DateInput
              label="Applied date"
              name="edit-appliedDate"
              value={editForm.appliedDate}
              onChange={(e) => setEditForm({ ...editForm, appliedDate: e.target.value })}
            />
            <DateInput
              label="Interview date"
              name="edit-interviewDate"
              value={editForm.interviewDate}
              onChange={(e) => setEditForm({ ...editForm, interviewDate: e.target.value })}
            />
          </div>

          <Input
            label="Contact"
            name="edit-contact"
            value={editForm.contact}
            onChange={(e) => setEditForm({ ...editForm, contact: e.target.value })}
          />

          <Textarea
            label="Notes"
            name="edit-notes"
            value={editForm.notes}
            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
          />

          <DateInput
            label="Follow-up date"
            name="edit-followUpDate"
            value={editForm.followUpDate}
            onChange={(e) => setEditForm({ ...editForm, followUpDate: e.target.value })}
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
        open={!!deletingJob}
        onClose={closeDeleteConfirm}
        onConfirm={handleConfirmDelete}
        title="Delete application?"
        itemLabel={deletingJob ? `${deletingJob.position} at ${deletingJob.company}` : ""}
        description="This will permanently delete this job application. This cannot be undone."
        loading={deleting}
        error={deleteError}
      />
    </main>
  );
}