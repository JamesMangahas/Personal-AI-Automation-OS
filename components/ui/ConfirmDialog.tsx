"use client";

import { Button } from "./Button";
import { Modal } from "./Modal";

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  itemLabel: string;
  description?: string;
  confirmLabel?: string;
  loadingLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  error?: string | null;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  itemLabel,
  description = "This action cannot be undone.",
  confirmLabel = "Delete",
  loadingLabel = "Deleting...",
  cancelLabel = "Cancel",
  loading = false,
  error,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm" closeDisabled={loading}>
      <div className="rounded-md border border-border bg-background p-3">
        <span className="break-words font-semibold text-foreground">{itemLabel}</span>
      </div>
      <p className="mt-3 text-sm text-muted">{description}</p>
      {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={loading} loadingText={loadingLabel}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}