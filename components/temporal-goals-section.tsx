import { formatDateRange } from "@/lib/utils";
import type { TemporalGoal } from "@/lib/types";

export function TemporalGoalsSection({ goals }: { goals: TemporalGoal[] }) {
  if (goals.length === 0) return null;

  return (
    <section className="blk">
      <h2 className="blk-tag">Metas_activas</h2>
      <ul className="space-y-2">
        {goals.map((goal) => (
          <li key={goal.id} className="enrow">
            <div className="flex items-center justify-between gap-2">
              <strong>{goal.title}</strong>
              <span className="cyb-hint text-xs whitespace-nowrap">
                {formatDateRange(goal.start_date, goal.end_date)}
              </span>
            </div>
            {goal.description ? (
              <p className="cyb-muted text-sm mt-1">{goal.description}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}