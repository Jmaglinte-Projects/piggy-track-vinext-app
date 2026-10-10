"use client";

import { useEffect } from "react";
import { Icon } from "@/components/ui/icon";

interface ModalProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
}

export function Modal({ title, description, children, onClose }: ModalProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !event.defaultPrevented) onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-heading">
          <div>
            <h2 id="modal-title">{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close dialog">
            <Icon name="close" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

interface ConfirmDeleteProps {
  itemName: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  saving: boolean;
}

export function ConfirmDelete({ itemName, onCancel, onConfirm, saving }: ConfirmDeleteProps) {
  return (
    <Modal
      title="Delete this record?"
      description="This action cannot be undone."
      onClose={onCancel}
    >
      <p className="confirm-copy">
        You are about to delete <strong>{itemName}</strong>.
      </p>
      <div className="form-actions">
        <button className="secondary-button" type="button" onClick={onCancel}>
          Keep record
        </button>
        <button
          className="danger-button"
          type="button"
          disabled={saving}
          onClick={() => void onConfirm()}
        >
          {saving ? "Deleting…" : "Delete permanently"}
        </button>
      </div>
    </Modal>
  );
}
