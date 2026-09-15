"use client";

import { useActionState, useState } from "react";
import {
  createTemporalGoalAction,
  deleteTemporalGoalAction,
  toggleTemporalGoalActiveAction,
  updateTemporalGoalAction,
} from "@/lib/actions";
import { formatDateRange } from "@/lib/utils";
import { TemporalGoalDone } from "@/components/temporal-goal-done";
import type { TemporalGoal } from "@/lib/types";

function GoalToggleAndDelete({ goal }: { goal: TemporalGoal }) {
  return (
    <div className="flex gap-2">
      <form action={toggleTemporalGoalActiveAction} className="inline">
        <input type="hidden" name="id" value={goal.id} />
        <input
          type="hidden"
          name="is_active"
          value={String(!goal.is_active)}
        />
        <button type="submit" className="cyb-link">
          {goal.is_active ? "Desactivar" : "Activar"}
        </button>
      </form>
      <form action={deleteTemporalGoalAction} className="inline">
        <input type="hidden" name="id" value={goal.id} />
        <button type="submit" className="cyb-link red">
          Borrar
        </button>
      </form>
    </div>
  );
}

function GoalFields({
  goal,
  formAction,
  buttonLabel,
  pending,
}: {
  goal: TemporalGoal | null;
  formAction: (formData: FormData) => void | Promise<void>;
  buttonLabel: string;
  pending: boolean;
}) {
  return (
    <form action={formAction} className="w-full">
      {goal ? <input type="hidden" name="id" value={goal.id} /> : null}
      <label className="block mb-1">
        <span className="cyb-hint text-sm block mb-1">Título</span>
        <input
          name="title"
          required
          defaultValue={goal?.title}
          placeholder="Ej: Preparar examen"
          className="cyb-in"
        />
      </label>
      <label className="block mb-1">
        <span className="cyb-hint text-sm block mb-1">Descripción (opcional)</span>
        <input
          name="description"
          defaultValue={goal?.description ?? ""}
          placeholder="Ej: Estudiar capítulos 1 a 5"
          className="cyb-in"
        />
      </label>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <label className="block">
          <span className="cyb-hint text-sm block mb-1">Desde</span>
          <input
            type="date"
            name="start_date"
            required
            defaultValue={goal?.start_date}
            className="cyb-in"
          />
        </label>
        <label className="block">
          <span className="cyb-hint text-sm block mb-1">Hasta</span>
          <input
            type="date"
            name="end_date"
            required
            defaultValue={goal?.end_date}
            className="cyb-in"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="cyb-btn small"
      >
        {buttonLabel}
      </button>
    </form>
  );
}

export function TemporalGoalManager({ goals }: { goals: TemporalGoal[] }) {
  const [createState, createAction, createPending] = useActionState(
    createTemporalGoalAction,
    {}
  );
  const [editState, editAction, editPending] = useActionState(
    updateTemporalGoalAction,
    {}
  );
  const [editingId, setEditingId] = useState<string | null>(null);

  const sorted = [...goals].sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    return a.start_date.localeCompare(b.start_date);
  });
  const editingGoal = goals.find((goal) => goal.id === editingId) ?? null;

  return (
    <section className="blk">
      <h2 className="blk-tag">Metas_temporales</h2>
      <p className="cyb-muted text-sm mb-3">
        Se muestran solo los días que caen dentro de su rango de fechas.
      </p>

      <div className="blk mb-4">
        <h3 className="mb-1 text-[12px] uppercase tracking-wide font-medium text-[var(--cyb-fg)]">
          + Agregar meta
        </h3>
        <GoalFields
          goal={null}
          formAction={createAction}
          buttonLabel={createPending ? "Creando..." : "Crear meta"}
          pending={createPending}
        />
        {createState.error ? (
          <p className="text-sm text-[var(--cyb-g1)] mt-2">{createState.error}</p>
        ) : null}
        {createState.success ? (
          <p className="text-sm text-[var(--cyb-green)] mt-2">{createState.success}</p>
        ) : null}
      </div>

      {sorted.length === 0 ? (
        <p className="cyb-hint text-sm">No hay metas temporales.</p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((goal) => (
            <li key={goal.id} className="enrow">
              {editingId === goal.id && editingGoal ? (
                <>
                  <GoalFields
                    goal={editingGoal}
                    formAction={editAction}
                    buttonLabel={editPending ? "Guardando..." : "Guardar cambios"}
                    pending={editPending}
                  />
                  {editState.error ? (
                    <p className="text-sm text-[var(--cyb-g1)] mt-2">{editState.error}</p>
                  ) : null}
                  {editState.success ? (
                    <p className="text-sm text-[var(--cyb-green)] mt-2">{editState.success}</p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="cyb-link mt-2"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <strong className={`${goal.is_active ? "" : "cyb-dim"} break-words`}>
                        {goal.title}
                      </strong>
                      {goal.completed_at ? (
                        <span className="cyb-hint text-xs whitespace-nowrap text-[var(--cyb-green)]">
                          ✓ Hecha
                        </span>
                      ) : null}
                    </div>
                    <p className="cyb-hint text-xs">{formatDateRange(goal.start_date, goal.end_date)}</p>
                    {goal.description ? (
                      <p className="cyb-muted text-sm mt-1">{goal.description}</p>
                    ) : null}
                    {!goal.is_active ? (
                      <p className="cyb-hint text-xs mt-1">Desactivada</p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <TemporalGoalDone goal={goal} />
                    <button
                      type="button"
                      onClick={() => setEditingId(goal.id)}
                      className="cyb-link"
                    >
                      Editar
                    </button>
                    <GoalToggleAndDelete goal={goal} />
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}