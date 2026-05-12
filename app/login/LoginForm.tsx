"use client";

import { useActionState, useState } from "react";
import {
  signInAction,
  signUpAction,
  type AuthField,
  type AuthState,
} from "./actions";

export function LoginForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const action = mode === "signin" ? signInAction : signUpAction;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, undefined);

  // Controlled values — kept in client state so a failed submit never wipes
  // what the user typed. The form action receives them via input name attrs.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const isSignup = mode === "signup";

  return (
    <div className="w-full max-w-sm">
      <div className="mb-10">
        <div className="eyebrow">Apadore</div>
        <h1 className="display-2 mt-3">
          {isSignup ? "Join the archive" : "Sign in"}
        </h1>
        <p className="mt-3 text-sm text-ink-muted">
          {isSignup
            ? "You'll need the team invite code to create an account."
            : "Use your Apadore credentials to continue."}
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          invalid={state?.field === "email"}
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          value={password}
          onChange={setPassword}
          invalid={state?.field === "password"}
        />
        {isSignup && (
          <>
            <PasswordField
              label="Confirm password"
              name="password_confirm"
              autoComplete="new-password"
              value={passwordConfirm}
              onChange={setPasswordConfirm}
              invalid={state?.field === "password_confirm"}
            />
            <Field
              label="Invite code"
              name="invite_code"
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              required
              invalid={state?.field === "invite_code"}
            />
          </>
        )}

        {state?.error && (
          <p className="text-sm text-red-700">{state.error}</p>
        )}

        <button type="submit" disabled={pending} className="btn-primary mt-2 w-full">
          {pending ? "…" : isSignup ? "Create account" : "Sign in"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setMode(isSignup ? "signin" : "signup")}
        className="btn-ghost mt-6"
      >
        {isSignup ? "Already have an account? Sign in" : "No account yet? Sign up with an invite code"}
      </button>
    </div>
  );
}

function Field({
  label,
  invalid,
  ...props
}: { label: string; invalid?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="eyebrow block mb-1.5">{label}</span>
      <input
        {...props}
        aria-invalid={invalid || undefined}
        className={`input ${invalid ? "is-invalid" : ""}`}
      />
    </label>
  );
}

function PasswordField({
  label,
  name,
  autoComplete,
  value,
  onChange,
  invalid,
}: {
  label: string;
  name: string;
  autoComplete: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="block">
      <span className="eyebrow block mb-1.5">{label}</span>
      <div className="relative">
        <input
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalid || undefined}
          required
          className={`input pr-16 ${invalid ? "is-invalid" : ""}`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          className="absolute right-0 top-0 h-full px-3 text-xs text-ink-muted hover:text-ink"
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
    </label>
  );
}
