"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/lib/actions";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, {});

  return (
    <section className="blk">
      <h2 className="blk-tag">Seguridad</h2>

      <form action={formAction} className="space-y-2">
        <label className="block">
          <span className="cyb-hint text-sm block mb-1">Contraseña actual</span>
          <input
            type="password"
            name="current_password"
            required
            className="cyb-in"
          />
        </label>
        <label className="block">
          <span className="cyb-hint text-sm block mb-1">Nueva contraseña</span>
          <input
            type="password"
            name="new_password"
            required
            minLength={6}
            className="cyb-in"
          />
        </label>
        <label className="block">
          <span className="cyb-hint text-sm block mb-1">Repetir nueva contraseña</span>
          <input
            type="password"
            name="confirm_password"
            required
            minLength={6}
            className="cyb-in"
          />
        </label>
        {state.error ? (
          <p className="text-sm text-[var(--cyb-g1)]" role="alert">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className="text-sm text-[var(--cyb-green)]" role="status">
            {state.success}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="cyb-btn"
        >
          {pending ? "Guardando..." : "Cambiar contraseña"}
        </button>
      </form>
    </section>
  );
}