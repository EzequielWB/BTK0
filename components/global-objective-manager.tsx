"use client";

import { useActionState, useState, useTransition } from "react";
import {
  createGlobalObjectiveAction,
  deleteGlobalObjectiveAction,
  reorderGlobalObjectivesAction,
  updateGlobalObjectiveAction,
} from "@/lib/actions";
import { formatShortDate } from "@/lib/utils";
import { ClampText } from "@/components/clamp-text";
import type { GlobalObjective } from "@/lib/types";

function completedLabel(objective: GlobalObjective): string | null {
  if (!objective.completed_at) return null;
  return `Completado el ${formatShortDate(objective.completed_at.slice(0, 10))}`;
}

function MoveButtons({
  index,
  count,
  onMove,
}: {
  index: number;
  count: number;
  onMove: (direction: -1 | 1) => void;
}) {
  return (
    <div className="flex gap-1">
      <button
        type="button"
        disabled={index === 0}
        onClick={() => onMove(-1)}
        aria-label="Subir en el orden"
        title="Subir"
        className="cyb-link"
      >
        ↑
      </button>
      <button
        type="button"
        disabled={index === count - 1}
        onClick={() => onMove(1)}
        aria-label="Bajar en el orden"
        title="Bajar"
        className="cyb-link"
      >
        ↓
      </button>
    </div>
  );
}

function GlobalObjectiveRow({
  objective,
  index,
  count,
  onEdit,
  onMove,
}: {
  objective: GlobalObjective;
  index: number;
  count: number;
  onEdit: (id: string) => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const completed = completedLabel(objective);

  return (
    <li className="enrow flex items-start justify-between gap-2">
      <div className="min-w-0">
        <strong className={completed ? "cyb-dim line-through" : ""}>
          {objective.title}
        </strong>
        {objective.description ? (
          <ClampText text={objective.description} className="cyb-muted text-sm" />
        ) : null}
        {completed ? (
          <p className="cyb-hint text-xs mt-1">{completed}</p>
        ) : null}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <MoveButtons index={index} count={count} onMove={onMove} />
        <button
          type="button"
          onClick={() => onEdit(objective.id)}
          className="cyb-link"
        >
          Editar
        </button>
        <form action={deleteGlobalObjectiveAction} className="inline">
          <input type="hidden" name="id" value={objective.id} />
          <button type="submit" className="cyb-link red">
            Borrar
          </button>
        </form>
      </div>
    </li>
  );
}

function EditForm({
  objective,
  onCancel,
}: {
  objective: GlobalObjective;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    updateGlobalObjectiveAction,
    {}
  );

  return (
    <form action={formAction} className="enrow mt-2 space-y-2">
      <input type="hidden" name="id" value={objective.id} />
      <label className="block">
        <span className="cyb-hint text-sm block mb-1">Título</span>
        <input
          name="title"
          defaultValue={objective.title}
          required
          className="cyb-in"
        />
      </label>
      <label className="block">
        <span className="cyb-hint text-sm block mb-1">Descripción (opcional)</span>
        <input
          name="description"
          defaultValue={objective.description ?? ""}
          className="cyb-in"
        />
      </label>
      {state.error ? (
        <p className="text-sm text-[var(--cyb-g1)]">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-[var(--cyb-green)]">{state.success}</p>
      ) : null}
      <div className="flex gap-3">
        <button type="submit" disabled={pending} className="cyb-btn small">
          {pending ? "Guardando..." : "Guardar"}
        </button>
        <button type="button" onClick={onCancel} className="cyb-link">
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function GlobalObjectiveManager({
  objectives,
}: {
  objectives: GlobalObjective[];
}) {
  const [state, formAction, pending] = useActionState(
    createGlobalObjectiveAction,
    {}
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [movedIds, setMovedIds] = useState<string[] | null>(null);
  const [, startTransition] = useTransition();

  const sorted = [...objectives].sort((a, b) => {
    const aDone = Boolean(a.completed_at);
    const bDone = Boolean(b.completed_at);
    if (aDone !== bDone) return aDone ? 1 : -1;
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.created_at.localeCompare(b.created_at);
  });

  const displayOrder = movedIds
    ? (movedIds
        .map((id) => sorted.find((objective) => objective.id === id))
        .filter(Boolean) as GlobalObjective[])
    : sorted;

  function move(objectiveId: string, direction: -1 | 1) {
    const ids = displayOrder.map((objective) => objective.id);
    const from = ids.indexOf(objectiveId);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= ids.length) return;
    const next = [...ids];
    [next[from], next[to]] = [next[to], next[from]];

    setMovedIds(next);
    startTransition(async () => {
      const res = await reorderGlobalObjectivesAction(next);
      if (res?.error) setMovedIds(null);
      setMovedIds(null);
    });
  }

  return (
    <section className="blk">
      <h2 className="blk-tag">Objetivos_globales</h2>
      <p className="cyb-muted text-sm mb-3">
        Metas fuertes sin fecha de fin (ej: terminar la carrera). Aparecen en la
        antesala, al entrar a la bitácora, y se completan desde ahí con
        confirmación. Acá siguen visibles aunque estén completadas.
      </p>

      <form action={formAction} className="blk mb-4 space-y-2">
        <h3 className="mb-1 text-[12px] uppercase tracking-wide font-medium text-[var(--cyb-fg)]">
          + Agregar objetivo global
        </h3>
        <label className="block">
          <span className="cyb-hint text-sm block mb-1">Título</span>
          <input
            name="title"
            required
            placeholder="Ej: Terminar la carrera"
            className="cyb-in"
          />
        </label>
        <label className="block">
          <span className="cyb-hint text-sm block mb-1">Descripción (opcional)</span>
          <input
            name="description"
            placeholder="Ej: Recibirme de licenciado"
            className="cyb-in"
          />
        </label>
        {state.error ? (
          <p className="text-sm text-[var(--cyb-g1)]">{state.error}</p>
        ) : null}
        {state.success ? (
          <p className="text-sm text-[var(--cyb-green)]">{state.success}</p>
        ) : null}
        <button type="submit" disabled={pending} className="cyb-btn small">
          {pending ? "Creando..." : "Crear objetivo global"}
        </button>
      </form>

      {sorted.length === 0 ? (
        <p className="cyb-hint text-sm">No hay objetivos globales todavía.</p>
      ) : (
        <ul className="space-y-2">
          {displayOrder.map((objective, index) =>
            editingId === objective.id ? (
              <li key={objective.id}>
                <EditForm
                  objective={objective}
                  onCancel={() => setEditingId(null)}
                />
              </li>
            ) : (
              <GlobalObjectiveRow
                key={objective.id}
                objective={objective}
                index={index}
                count={displayOrder.length}
                onEdit={setEditingId}
                onMove={(direction) => move(objective.id, direction)}
              />
            )
          )}
        </ul>
      )}
    </section>
  );
}
