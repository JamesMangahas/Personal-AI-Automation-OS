"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { SkeletonList } from "../../components/ui/LoadingSkeleton";
import { Modal } from "../../components/ui/Modal";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { useToast } from "../../components/ui/Toast";

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

function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  return tags.split(",").map((t) => t.trim()).filter(Boolean);
}

const EMPTY_FORM: FormState = {
  title: "",
  content: "",
  category: "",
  tags: "",
  pinned: false,
};

function toFormState(note: Note): FormState {
  return {
    title: note.title,
    content: note.content ?? "",
    category: note.category ?? "",
    tags: note.tags ?? "",
    pinned: note.pinned,
  };
}

export default function NotesPage() {
  const { showToast } = useToast();

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

    return [...filtered].sort((a, b) => {
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
  }, [notes, searchQuery, pinnedFilter, categoryFilter, sortBy]);

  const hasActiveFilters =
    searchQuery.trim() !== "" || pinnedFilter !== "ALL" || categoryFilter !== "ALL";

  function clearFilters() {
    setSearchQuery("");
    setPinnedFilter("ALL");
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

      setNotes((current) => [data.note as Note, ...current]);
      setIsCreateOpen(false);
      setCreateForm(EMPTY_FORM);
      showToast("success", `"${data.note.title}" was created.`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create note.");
    } finally {
      setCreating(false);
    }
  }

  function openEditModal(note: Note) {
    setEditingNote(note);
    setEditForm(toFormState(note));
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

    if (title !== editingNote.title) changes.title = title;

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

      const updated = data.note as Note;
      setNotes((current) => current.map((n) => (n.id === updated.id ? updated : n)));
      setEditingNote(null);
      showToast("success", `"${updated.title}" was updated.`);
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
      const res = await fetch(`/api/notes/${deletingNote.id}`, { method: "DELETE" });
      const data = await res.json();

      if (res.status === 404) {
        setDeletingNote(null);
        showToast("error", "This note was already deleted elsewhere.");
        await loadNotes();
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete note.");
      }

      const deletedId = deletingNote.id;
      const title = deletingNote.title;
      setNotes((current) => current.filter((n) => n.id !== deletedId));
      setDeletingNote(null);
      showToast("success", `"${title}" was deleted.`);
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
        showToast("error", "This note no longer exists.");
        await loadNotes();
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update note.");
      }

      setNotes((current) =>
        current.map((n) => (n.id === note.id ? { ...n, pinned: nextPinned } : n))
      );
      showToast("success", `"${note.title}" ${nextPinned ? "pinned" : "unpinned"}.`);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to update note.");
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-8 sm:py-14 lg:px-10">
      <div className="mx-auto max-w-4xl">
        <header className="mb-10 border-b border-border pb-8">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">System / Notes</p>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                Notes
              </h1>
              <p className="mt-2 max-w-md text-sm text-muted sm:text-base">
                Capture ideas, references, and context.
              </p>
            </div>
            <Button onClick={openCreateModal}>Create note</Button>
          </div>
        </header>

        {status === "success" && notes.length > 0 && (
          <Card variant="raised" className="mb-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="lg:col-span-2">
                <label htmlFor="note-search" className={MICRO_LABEL}>
                  Search
                </label>
                <Input
                  id="note-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Title, content, category, tags..."
                />
              </div>
              <div>
                <label htmlFor="pinned-filter" className={MICRO_LABEL}>
                  Pinned
                </label>
                <Select
                  id="pinned-filter"
                  value={pinnedFilter}
                  onChange={(e) => setPinnedFilter(e.target.value as PinnedFilter)}
                >
                  <option value="ALL">All notes</option>
                  <option value="PINNED">Pinned</option>
                  <option value="UNPINNED">Unpinned</option>
                </Select>
              </div>
              {availableCategories.length > 0 && (
                <div>
                  <label htmlFor="category-filter" className={MICRO_LABEL}>
                    Category
                  </label>
                  <Select
                    id="category-filter"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <option value="ALL">All categories</option>
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <div className="max-w-[10rem]">
                <label htmlFor="sort-by" className={MICRO_LABEL}>
                  Sort
                </label>
                <Select id="sort-by" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)}>
                  <option value="NEWEST">Newest first</option>
                  <option value="OLDEST">Oldest first</option>
                  <option value="UPDATED">Recently updated</option>
                  <option value="TITLE_ASC">Title A-Z</option>
                  <option value="TITLE_DESC">Title Z-A</option>
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
            <p className="font-semibold text-foreground">Couldn&apos;t load notes</p>
            <p className="mt-1 text-sm text-muted">{error}</p>
            <Button onClick={loadNotes} className="mt-4">
              Retry
            </Button>
          </Card>
        )}

        {status === "success" && notes.length === 0 && (
          <EmptyState title="No notes yet" message="Create your first note to get started." />
        )}

        {status === "success" && notes.length > 0 && visibleNotes.length === 0 && (
          <EmptyState
            title="No notes found"
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

        {status === "success" && visibleNotes.length > 0 && (
          <>
            <div className="mb-4 flex items-center gap-3">
              <span className="font-mono text-sm font-semibold text-accent">01</span>
              <span className="h-px w-8 bg-gradient-to-r from-accent/50 to-transparent" aria-hidden="true" />
              <h2 className="text-xl font-bold tracking-tight text-foreground">Note Archive</h2>
              <span className="ml-auto font-mono text-xs text-muted">
                {visibleNotes.length} / {notes.length}
              </span>
            </div>

            <ul className="space-y-2">
              {visibleNotes.map((note) => {
                const tags = parseTags(note.tags);
                const isToggling = togglingId === note.id;
                return (
                  <li key={note.id}>
                    <Card
                      variant="raised"
                      hoverable
                      className={`flex flex-col gap-3 border-l-4 transition-transform duration-150 hover:translate-x-1 ${
                        note.pinned ? "border-l-accent bg-accent/5" : "border-l-transparent"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleTogglePinned(note)}
                            disabled={isToggling}
                            aria-label={note.pinned ? "Unpin note" : "Pin note"}
                            title={note.pinned ? "Unpin note" : "Pin note"}
                            className={`shrink-0 rounded text-lg leading-none transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                              note.pinned ? "text-accent hover:text-accent/70" : "text-muted hover:text-accent"
                            }`}
                          >
                            {note.pinned ? "\u2605" : "\u2606"}
                          </button>
                          <p className="min-w-0 break-words font-semibold text-foreground">{note.title}</p>
                          {note.category && (
                            <span
                              className="max-w-[8rem] shrink-0 truncate rounded px-2 py-0.5 text-xs font-medium text-background"
                              style={{ backgroundColor: categoryColor(note.category) }}
                              title={note.category}
                            >
                              {note.category}
                            </span>
                          )}
                          {note.pinned && <Badge tone="accent">Pinned</Badge>}
                          {isToggling && <span className="shrink-0 text-xs text-muted">Updating...</span>}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="whitespace-nowrap font-mono text-xs text-muted">
                            {formatDate(note.updatedAt)}
                          </span>
                          <Button variant="secondary" size="sm" onClick={() => openEditModal(note)}>
                            Edit
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => openDeleteConfirm(note)}>
                            Delete
                          </Button>
                        </div>
                      </div>

                      {note.content && (
                        <p className="line-clamp-3 break-words text-sm text-muted">{note.content}</p>
                      )}

                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              className="max-w-[10rem] truncate rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted"
                              title={tag}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </Card>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      <Modal open={isCreateOpen} onClose={closeCreateModal} title="New note" closeDisabled={creating}>
        <form onSubmit={handleCreateSubmit} className="space-y-5">
          <Input
            label="Title"
            required
            name="title"
            value={createForm.title}
            onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
            placeholder="Note title"
            autoFocus
          />
          <Textarea
            label="Content"
            name="content"
            value={createForm.content}
            onChange={(e) => setCreateForm({ ...createForm, content: e.target.value })}
            placeholder="Optional details"
            rows={4}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Category"
              name="category"
              value={createForm.category}
              onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
              placeholder="e.g. Work"
            />
            <Input
              label="Tags"
              name="tags"
              value={createForm.tags}
              onChange={(e) => setCreateForm({ ...createForm, tags: e.target.value })}
              placeholder="comma, separated"
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              checked={createForm.pinned}
              onChange={(e) => setCreateForm({ ...createForm, pinned: e.target.checked })}
              className="h-4 w-4 rounded border-border bg-background accent-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
            Pin this note
          </label>
          {createError && <p className="text-sm font-medium text-danger">{createError}</p>}
          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={closeCreateModal} disabled={creating}>
              Cancel
            </Button>
            <Button type="submit" loading={creating} loadingText="Creating...">
              Create note
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editingNote} onClose={closeEditModal} title="Edit note" closeDisabled={saving}>
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
            label="Content"
            name="edit-content"
            value={editForm.content}
            onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
            rows={4}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Category"
              name="edit-category"
              value={editForm.category}
              onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
            />
            <Input
              label="Tags"
              name="edit-tags"
              value={editForm.tags}
              onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              checked={editForm.pinned}
              onChange={(e) => setEditForm({ ...editForm, pinned: e.target.checked })}
              className="h-4 w-4 rounded border-border bg-background accent-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
            Pin this note
          </label>
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
        open={!!deletingNote}
        onClose={closeDeleteConfirm}
        onConfirm={handleConfirmDelete}
        title="Delete note?"
        itemLabel={deletingNote?.title ?? ""}
        description="This will permanently delete this note. This cannot be undone."
        loading={deleting}
        error={deleteError}
      />
    </main>
  );
}