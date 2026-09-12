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
          className={`w-full rounded-none border bg-zinc-950/60 py-2.5 pl-3 pr-11 text-zinc-100 placeholder:text-zinc-600 caret-[#00ff9d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff9d]/70 disabled:opacity-50 ${
            flash
              ? "border-red-500/80 text-red-400 caret-red-500"
              : "border-zinc-600/60 focus:border-[#00ff9d]"
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
              : "border-zinc-600/60 text-zinc-300 hover:text-white"
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