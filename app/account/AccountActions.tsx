"use client";

import { useActionState, useState } from "react";
import {
  deleteAccountAction,
  signOutAction,
  type AccountState,
} from "./actions";

export function AccountActions() {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState<AccountState, FormData>(
    deleteAccountAction,
    undefined,
  );

  return (
    <>
      {/* Sign out */}
      <form action={signOutAction}>
        <button type="submit" className="btn-ghost">Sign out</button>
      </form>

      <div className="hairline-bot mt-10" />

      {/* Danger zone */}
      <section className="mt-10">
        <div className="eyebrow text-red-700">Danger zone</div>

        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="btn-danger-outline mt-4"
          >
            Delete account
          </button>
        ) : (
          <form action={formAction} className="mt-4 max-w-md space-y-4">
            <p className="text-sm text-ink-muted">
              This permanently deletes your account and every pin you've saved.
              It cannot be undone.
            </p>
            <label className="block">
              <span className="eyebrow block mb-1.5">
                Type DELETE to confirm
              </span>
              <input
                name="confirm"
                type="text"
                autoComplete="off"
                autoFocus
                className="input"
              />
            </label>
            {state?.error && (
              <p className="text-sm text-red-700">{state.error}</p>
            )}
            <div className="flex items-center gap-3">
              <button type="submit" disabled={pending} className="btn-danger">
                {pending ? "Deleting…" : "Delete account permanently"}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={pending}
                className="btn-ghost"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>
    </>
  );
}
