"use client";

import { useState } from "react";
import { loginAction } from "@/lib/actions";

export function PasswordGate({
  showDefaultHint = false,
  onError,
  disabled = false,
  onReading,
  onSuccess,
}: {
  showDefaultHint?: boolean;
  onError?: () => void;
  disabled?: boolean;
  onReading?: (reading: boolean) => void;
  onSuccess?: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [flash, setFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending || disabled) return;
    const fd = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    const res = await loginAction({}, fd);
    setPending(false);
    if (res?.error) {
      setError(res.error);
      setAttempts((a) => a + 1);
      setFlash(true);
      window.setTimeout(() => setFlash(false), 420);
      onError?.();
    } else if (res?.success) {
      onSuccess?.();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm">
      <div className={flash ? "gate-shake relative" : "relative"}>
        <input
          type="password"
          name="password"
          required
          autoFocus
          autoComplete="current-password"
          placeholder="••••••••"
          aria-label="Contraseña"
          disabled={pending || disabled}
          onFocus={() => onReading?.(true)}
          onBlur={() => onReading?.(false)}
          className={`w-full rounded-none border bg-[var(--cyb-field)] py-2.5 pl-3 pr-11 text-[var(--cyb-fg)] placeholder:text-[var(--cyb-dim)] caret-[var(--cyb-green)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(var(--cyb-green-rgb),0.7)] disabled:opacity-50 ${
            flash
              ? "border-red-500/80 text-red-400 caret-red-500"
              : "border-[var(--cyb-border)] focus:border-[var(--cyb-green)]"
          }`}
        />
        <button
          type="submit"
          disabled={pending || disabled}
          aria-label="Entrar"
          title="Entrar"
          className={`absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r border-l transition-colors hover:bg-zinc-800 disabled:opacity-50 ${
            flash
              ? "border-red-500/60 text-red-400 hover:bg-red-950/40"
              : "border-[var(--cyb-border)] text-[var(--cyb-mut)] hover:text-[var(--cyb-fg)]"
          }`}
        >
          {pending ? "…" : "➜"}
        </button>
      </div>

      {flash && attempts >= 1 ? (
        <p className="mt-2 text-center text-[11px] tracking-[0.25em] text-red-400">
          · INTENTO {attempts} ·
        </p>
      ) : null}

      {error ? (
        <p className="mt-2 text-xs text-red-500" role="alert">
          {error}
        </p>
      ) : null}

      {showDefaultHint ? (
        <p className="mt-3 text-center text-[11px] text-zinc-600">
          Modo local · contraseña inicial: <strong>bitakra</strong>
        </p>
      ) : null}
    </form>
  );
}