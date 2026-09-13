"use client";

import { useTransition } from "react";
import { toggleTemporalGoalCompleteAction } from "@/lib/actions";
import type { TemporalGoal } from "@/lib/types";

export function TemporalGoalDone({ goal }: { goal: TemporalGoal }) {
  const [pending, startTransition] = useTransition();
  const completed = Boolean(goal.completed_at);

  function toggle() {
    if (pending) return;
    startTransition(() => {
      void toggleTemporalGoalCompleteAction(goal.id, !completed);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={completed}
      aria-label={completed ? "Reabrir meta" : "Marcar meta como completada"}
      title={completed ? "Reabrir meta" : "Marcar como completada"}
      className={
        "cyb-btn small " + (completed ? "cyb-goal-done-on" : "")
      }
    >
      {completed ? "✓ Hecha" : "Completar"}
    </button>
  );
}