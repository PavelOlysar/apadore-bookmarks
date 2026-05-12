"use client";

import { useState, useTransition } from "react";

export function DeletePinButton({
  deleteAction,
}: {
  deleteAction: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="btn-danger-outline mt-4"
      >
        Delete pin
      </button>
    );
  }

  return (
    <div className="mt-4 max-w-md space-y-4">
      <p className="text-sm text-ink-muted">
        This permanently deletes the pin. It can't be undone.
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(async () => { await deleteAction(); })}
          className="btn-danger"
        >
          {pending ? "Deleting…" : "Delete permanently"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming(false)}
          className="btn-ghost"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
