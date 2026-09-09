"use client";

import { useEffect, useRef } from "react";
import { useActionState } from "react";
import { loginAction } from "@/lib/actions";

export function PasswordGate({
  showDefaultHint = false,
  onError,
  disabled = false,
}: {
  showDefaultHint?: boolean;
  onError?: () => void;
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState(loginAction, {});
  const firedRef = useRef(false);

  useEffect(() => {
    if (pending) {
      firedRef.current = false;
      return;
    }
    if (state?.error && !firedRef.current) {
      firedRef.current = true;
      onError?.();
    }
  }, [pending, state, onError]);

  return (
    <form action={formAction} className="w-full max-w-sm">
      <div className="relative">
        <input
          type="password"
          name="password"
          required
          autoFocus
          autoComplete="current-password"
          placeholder="••••••••"
          aria-label="Contraseña"
          disabled={pending || disabled}
          className="w-full rounded-none border border-zinc-600/60 bg-zinc-950/60 py-2.5 pl-3 pr-11 text-zinc-100 placeholder:text-zinc-600 caret-[#00ff9d] focus:border-[#00ff9d] focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={pending || disabled}
          aria-label="Entrar"
          title="Entrar"
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r border-l border-zinc-600/60 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white disabled:opacity-50"
        >
          {pending ? "…" : "➜"}
        </button>
      </div>

      {state.error ? (
        <p className="mt-2 text-xs text-red-500" role="alert">
          {state.error}
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