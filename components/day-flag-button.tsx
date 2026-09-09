"use client";

import { useActionState } from "react";
import { toggleDayFlagAction } from "@/lib/actions";

export function DayFlagButton({
  date,
  flagged,
}: {
  date: string;
  flagged: boolean;
}) {
  const [, submit, pending] = useActionState(
    () => toggleDayFlagAction(date),
    null
  );

  return (
    <button
      type="button"
      onClick={() => submit()}
      disabled={pending}
      aria-pressed={flagged}
      aria-label={flagged ? "Quitar día destacado" : "Destacar este día"}
      className={flagged ? "cyb-flag-btn on" : "cyb-flag-btn"}
    >
      ★ {flagged ? "Destacado ✓" : "Destacar"}
    </button>
  );
}