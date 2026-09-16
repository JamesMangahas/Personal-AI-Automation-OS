"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Note = {
  id: string;
  title: string;
  content: string | null;
  category: string | null;
  tags: string | null;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

type LoadStatus = "loading" | "success" | "error";
type Toast = { type: "success" | "error"; message: string };
type PinnedFilter = "ALL" | "PINNED" | "UNPINNED";
type SortOption = "NEWEST" | "OLDEST" | "UPDATED" | "TITLE_ASC" | "TITLE_DESC";

type FormState = {
  title: string;
  content: string;
  category: string;
  tags: string;
  pinned: boolean;
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

function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  return tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

const EMPTY_FORM: FormState = {
  title: "",
  content: "",
  category: "",
  tags: "",
  pinned: false,
};

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(EMPTY_FORM);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deletingNote, setDeletingNote] = useState<Note | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [toast, setToast] = useState<Toast | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [pinnedFilter, setPinnedFilter] = useState<PinnedFilter>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("NEWEST");

  const loadNotes = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/notes");
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load notes.");
      }
      setNotes(data.notes as Note[]);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    for (const note of notes) {
      if (note.category) set.add(note.category);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [notes]);

  useEffect(() => {
    if (categoryFilter !== "ALL" && !availableCategories.includes(categoryFilter)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCategoryFilter("ALL");
    }
  }, [availableCategories, categoryFilter]);

  const visibleNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = notes.filter((note) => {
      if (pinnedFilter === "PINNED" && !note.pinned) return false;
      if (pinnedFilter === "UNPINNED" && note.pinned) return false;
      if (categoryFilter !== "ALL" && note.category !== categoryFilter) return false;

      if (query) {
        const haystack = [note.title, note.content ?? "", note.category ?? "", note.tags ?? ""]
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
        case "UPDATED":
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case "TITLE_ASC":
          return a.title.localeCompare(b.title);
        case "TITLE_DESC":
          return b.title.localeCompare(a.title);
        case "NEWEST":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return sorted;
  }, [notes, searchQuery, pinnedFilter, categoryFilter, sortBy]);

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
      const body: Record<string, string | boolean> = { title, pinned: createForm.pinned };
      if (createForm.content.trim()) body.content = createForm.content.trim();
      if (createForm.category.trim()) body.category = createForm.category.trim();
      if (createForm.tags.trim()) body.tags = createForm.tags.trim();

      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create note.");
      }

      setIsCreateOpen(false);
      setCreateForm(EMPTY_FORM);
      setToast({ type: "success", message: `"${data.note.title}" was created.` });
      await loadNotes();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create note.");
    } finally {
      setCreating(false);
    }
  }

  function openEditModal(note: Note) {
    setEditingNote(note);
    setEditForm({
      title: note.title,
      content: note.content ?? "",
      category: note.category ?? "",
      tags: note.tags ?? "",
      pinned: note.pinned,
    });
    setEditError(null);
  }

  function closeEditModal() {
    if (saving) return;
    setEditingNote(null);
  }

  async function handleEditSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editingNote) return;

    const title = editForm.title.trim();
    if (!title) {
      setEditError("Title is required.");
      return;
    }

    const changes: Record<string, string | boolean | null> = {};

    if (title !== editingNote.title) {
      changes.title = title;
    }

    const newContent = editForm.content.trim();
    const oldContent = editingNote.content ?? "";
    if (newContent !== oldContent) {
      changes.content = newContent === "" ? null : newContent;
    }

    const newCategory = editForm.category.trim();
    const oldCategory = editingNote.category ?? "";
    if (newCategory !== oldCategory) {
      changes.category = newCategory === "" ? null : newCategory;
    }

    const newTags = editForm.tags.trim();
    const oldTags = editingNote.tags ?? "";
    if (newTags !== oldTags) {
      changes.tags = newTags === "" ? null : newTags;
    }

    if (editForm.pinned !== editingNote.pinned) {
      changes.pinned = editForm.pinned;
    }

    if (Object.keys(changes).length === 0) {
      setEditingNote(null);
      return;
    }

    setEditError(null);
    setSaving(true);

    try {
      const res = await fetch(`/api/notes/${editingNote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update note.");
      }

      setEditingNote(null);
      setToast({ type: "success", message: `"${data.note.title}" was updated.` });
      await loadNotes();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update note.");
    } finally {
      setSaving(false);
    }
  }

  function openDeleteConfirm(note: Note) {
    setDeletingNote(note);
    setDeleteError(null);
  }

  function closeDeleteConfirm() {
    if (deleting) return;
    setDeletingNote(null);
  }

  async function handleConfirmDelete() {
    if (!deletingNote) return;

    setDeleteError(null);
    setDeleting(true);

    try {
      const res = await fetch(`/api/notes/${deletingNote.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (res.status === 404) {
        setDeletingNote(null);
        setToast({
          type: "error",
          message: "This note was already deleted elsewhere.",
        });
        await loadNotes();
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete note.");
      }

      const deletedTitle = deletingNote.title;
      setDeletingNote(null);
      setToast({ type: "success", message: `"${deletedTitle}" was deleted.` });
      await loadNotes();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete note.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleTogglePinned(note: Note) {
    setTogglingId(note.id);

    const nextPinned = !note.pinned;

    try {
      const res = await fetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: nextPinned }),
      });
      const data = await res.json();

      if (res.status === 404) {
        setToast({ type: "error", message: "This note no longer exists." });
        await loadNotes();
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update note.");
      }

      setNotes((current) =>
        current.map((n) => (n.id === note.id ? { ...n, pinned: nextPinned } : n))
      );
      setToast({
        type: "success",
        message: `"${note.title}" ${nextPinned ? "pinned" : "unpinned"}.`,
      });
    } catch (err) {
      setToast({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to update note.",
      });
    } finally {
      setTogglingId(null);
    }
  }

  const hasActiveFilters =
    searchQuery.trim() !== "" || pinnedFilter !== "ALL" || categoryFilter !== "ALL";

  function clearFilters() {
    setSearchQuery("");
    setPinnedFilter("ALL");
    setCategoryFilter("ALL");
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-8 sm:py-10 lg:px-10">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs tracking-wide text-muted">OPS Ã‚Â· 02 NOTES</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Notes
            </h1>
            <p className="mt-1 text-sm text-muted">
              {status === "success"
                ? `${visibleNotes.length} of ${notes.length} note${
                    notes.length === 1 ? "" : "s"
                  }`
                : "Personal AI Automation OS"}
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className={`w-full rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:opacity-90 sm:w-auto ${FOCUS_RING}`}
          >
            Create note
          </button>
        </header>

        {status === "success" && notes.length > 0 && (
          <div className="mb-6 flex flex-col gap-3 rounded-md border border-border bg-surface p-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex-1 sm:min-w-[220px]">
              <label htmlFor="note-search" className="sr-only">
                Search notes
              </label>
              <input
                id="note-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title, content, category, tags..."
                className={`w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <div>
                <label htmlFor="pinned-filter" className="sr-only">
                  Filter by pinned
                </label>
                <select
                  id="pinned-filter"
                  value={pinnedFilter}
                  onChange={(e) => setPinnedFilter(e.target.value as PinnedFilter)}
                  className={`rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                >
                  <option value="ALL">All notes</option>
                  <option value="PINNED">Pinned</option>
                  <option value="UNPINNED">Unpinned</option>
                </select>
              </div>

              <div>
                <label htmlFor="category-filter" className="sr-only">
                  Filter by category
                </label>
                <select
                  id="category-filter"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className={`rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                >
                  <option value="ALL">All categories</option>
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="sort-by" className="sr-only">
                  Sort notes
                </label>
                <select
                  id="sort-by"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className={`rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                >
                  <option value="NEWEST">Newest first</option>
                  <option value="OLDEST">Oldest first</option>
                  <option value="UPDATED">Recently updated</option>
                  <option value="TITLE_ASC">Title AÃ¢â‚¬â€œZ</option>
                  <option value="TITLE_DESC">Title ZÃ¢â‚¬â€œA</option>
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
              Ã¢Å“â€¢
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
            <p className="font-semibold text-foreground">Couldn&apos;t load notes</p>
            <p className="mt-1 text-sm text-muted">{error}</p>
            <button
              onClick={loadNotes}
              className={`mt-4 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:opacity-90 ${FOCUS_RING}`}
            >
              Retry
            </button>
          </div>
        )}

        {status === "success" && notes.length === 0 && (
          <div className="rounded-md border border-dashed border-border bg-surface p-10 text-center">
            <p className="font-semibold text-foreground">No notes yet</p>
            <p className="mt-1 text-sm text-muted">
              Create your first note to get started.
            </p>
          </div>
        )}

        {status === "success" && notes.length > 0 && visibleNotes.length === 0 && (
          <div className="rounded-md border border-dashed border-border bg-surface p-10 text-center">
            <p className="font-semibold text-foreground">No notes found</p>
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

        {status === "success" && visibleNotes.length > 0 && (
          <ul className="space-y-2">
            {visibleNotes.map((note) => {
              const tags = parseTags(note.tags);
              const isToggling = togglingId === note.id;
              return (
                <li
                  key={note.id}
                  className={`rounded-md border p-4 transition-colors sm:p-5 ${
                    note.pinned
                      ? "border-accent/50 border-l-4 border-l-accent bg-accent/5"
                      : "border-border bg-surface"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleTogglePinned(note)}
                          disabled={isToggling}
                          aria-label={note.pinned ? "Unpin note" : "Pin note"}
                          title={note.pinned ? "Unpin note" : "Pin note"}
                          className={`shrink-0 rounded text-lg leading-none transition-colors disabled:opacity-40 ${FOCUS_RING} ${
                            note.pinned
                              ? "text-accent hover:text-accent/70"
                              : "text-muted hover:text-accent"
                          }`}
                        >
                          {note.pinned ? "Ã¢Ëœâ€¦" : "Ã¢Ëœâ€ "}
                        </button>
                        <p className="min-w-0 break-words font-semibold text-foreground">
                          {note.title}
                        </p>
                        {note.category && (
                          <span
                            className="max-w-[10rem] shrink-0 truncate rounded px-2 py-0.5 text-xs font-medium text-background"
                            style={{ backgroundColor: categoryColor(note.category) }}
                            title={note.category}
                          >
                            {note.category}
                          </span>
                        )}
                        {note.pinned && (
                          <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">
                            Pinned
                          </span>
                        )}
                        {isToggling && (
                          <span className="shrink-0 text-xs text-muted">Updating...</span>
                        )}
                      </div>

                      {note.content && (
                        <p className="mt-2 line-clamp-3 break-words text-sm text-muted">
                          {note.content}
                        </p>
                      )}

                      {tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              className="max-w-[10rem] truncate rounded-full border border-border px-2 py-0.5 text-xs text-muted"
                              title={tag}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-2 sm:ml-4">
                      <span className="whitespace-nowrap text-xs text-muted">
                        Updated {formatDate(note.updatedAt)}
                      </span>
                      <button
                        onClick={() => openEditModal(note)}
                        className={`rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface-raised ${FOCUS_RING}`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => openDeleteConfirm(note)}
                        className={`rounded-md border border-danger/40 px-3 py-1.5 text-xs font-semibold text-danger transition-colors hover:bg-danger/10 ${FOCUS_RING}`}
                      >
                        Delete
                      </button>
                    </div>
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
              <h2 className="text-xl font-bold text-foreground">New note</h2>
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
                  Title <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  placeholder="Note title"
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Content
                </label>
                <textarea
                  value={createForm.content}
                  onChange={(e) => setCreateForm({ ...createForm, content: e.target.value })}
                  className={`w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  rows={4}
                  placeholder="Optional details"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Category
                  </label>
                  <input
                    type="text"
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                    className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                    placeholder="e.g. Work"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Tags
                  </label>
                  <input
                    type="text"
                    value={createForm.tags}
                    onChange={(e) => setCreateForm({ ...createForm, tags: e.target.value })}
                    className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                    placeholder="comma, separated"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={createForm.pinned}
                  onChange={(e) => setCreateForm({ ...createForm, pinned: e.target.checked })}
                  className={`h-4 w-4 rounded border-border bg-background accent-accent ${FOCUS_RING}`}
                />
                Pin this note
              </label>

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
                  {creating ? "Creating..." : "Create note"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-md border border-border bg-surface-raised p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Edit note</h2>
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
                  Content
                </label>
                <textarea
                  value={editForm.content}
                  onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                  className={`w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                  rows={4}
                  placeholder="Optional details"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Category
                  </label>
                  <input
                    type="text"
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                    placeholder="e.g. Work"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Tags
                  </label>
                  <input
                    type="text"
                    value={editForm.tags}
                    onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                    className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-accent ${FOCUS_RING}`}
                    placeholder="comma, separated"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={editForm.pinned}
                  onChange={(e) => setEditForm({ ...editForm, pinned: e.target.checked })}
                  className={`h-4 w-4 rounded border-border bg-background accent-accent ${FOCUS_RING}`}
                />
                Pin this note
              </label>

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

      {deletingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-md border border-border bg-surface-raised p-6">
            <h2 className="text-lg font-bold text-foreground">Delete note?</h2>

            <div className="mt-3 flex items-center gap-2 rounded-md border border-border bg-background p-3">
              {deletingNote.pinned && <span className="text-accent">Ã¢Ëœâ€¦</span>}
              <span className="min-w-0 truncate font-semibold text-foreground">
                {deletingNote.title}
              </span>
              {deletingNote.category && (
                <span
                  className="ml-auto shrink-0 rounded px-2 py-0.5 text-xs font-medium text-background"
                  style={{ backgroundColor: categoryColor(deletingNote.category) }}
                >
                  {deletingNote.category}
                </span>
              )}
            </div>

            <p className="mt-3 text-sm text-muted">
              This will permanently delete this note. This cannot be undone.
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
                {deleting ? "Deleting..." : "Delete note"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}