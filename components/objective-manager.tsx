"use client";

import { useActionState, useState, useTransition } from "react";
import {
  createObjectiveAction,
  deleteObjectiveAction,
  reorderObjectivesAction,
  toggleObjectiveActiveAction,
  updateObjectiveAction,
} from "@/lib/actions";
import type { Objective } from "@/lib/types";
import { ClampText } from "@/components/clamp-text";

function ToggleAndDeleteButtons({
  objective,
}: {
  objective: Objective;
}) {
  return (
    <div className="flex gap-2">
      <form action={toggleObjectiveActiveAction} className="inline">
        <input type="hidden" name="id" value={objective.id} />
        <input
          type="hidden"
          name="is_active"
          value={String(!objective.is_active)}
        />
        <button type="submit" className="cyb-link">
          {objective.is_active ? "Desactivar" : "Activar"}
        </button>
      </form>
      <form action={deleteObjectiveAction} className="inline">
        <input type="hidden" name="id" value={objective.id} />
        <button type="submit" className="cyb-link red">
          Borrar
        </button>
      </form>
    </div>
  );
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

function ObjectiveRow({
  objective,
  index,
  count,
  onEdit,
  onMove,
}: {
  objective: Objective;
  index: number;
  count: number;
  onEdit: (id: string) => void;
  onMove: (direction: -1 | 1) => void;
}) {
  return (
    <li className="enrow flex items-start justify-between gap-2">
      <div className="min-w-0">
        <strong className={objective.is_active ? "" : "cyb-dim"}>
          {objective.title}
        </strong>
        {objective.description ? (
          <ClampText text={objective.description} className="cyb-muted text-sm" />
        ) : null}
        {!objective.is_active ? (
          <p className="cyb-hint text-xs mt-1">Desactivado</p>
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
        <ToggleAndDeleteButtons objective={objective} />
      </div>
    </li>
  );
}

function EditForm({ objective, onCancel }: { objective: Objective; onCancel: () => void }) {
  const [state, formAction, pending] = useActionState(updateObjectiveAction, {});

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
      {state.error ? <p className="text-sm text-[#ff3b5c]">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-[#00ff9d]">{state.success}</p> : null}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="cyb-btn small"
        >
          {pending ? "Guardando..." : "Guardar"}
        </button>
        <button type="button" onClick={onCancel} className="cyb-link">
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function ObjectiveManager({ objectives }: { objectives: Objective[] }) {
  const [state, formAction, pending] = useActionState(createObjectiveAction, {});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [movedIds, setMovedIds] = useState<string[] | null>(null);
  const [, startTransition] = useTransition();

  const sorted = [...objectives].sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.created_at.localeCompare(b.created_at);
  });

  const displayOrder = movedIds
    ? movedIds.map((id) => sorted.find((o) => o.id === id)).filter(Boolean) as Objective[]
    : sorted;

  function move(objectiveId: string, direction: -1 | 1) {
    const ids = displayOrder.map((o) => o.id);
    const from = ids.indexOf(objectiveId);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= ids.length) return;
    const next = [...ids];
    [next[from], next[to]] = [next[to], next[from]];

    setMovedIds(next);
    startTransition(async () => {
      const res = await reorderObjectivesAction(next);
      if (res?.error) setMovedIds(null);
      setMovedIds(null);
    });
  }

  return (
    <section className="blk">
      <h2 className="blk-tag">Objetivos_generales</h2>
      <p className="cyb-muted text-sm mb-3">
        Aparecen todos los días como checklist. Podés marcar si lo cumpliste o no.
      </p>

      <form action={formAction} className="blk mb-4 space-y-2">
        <h3 className="mb-1 text-[12px] uppercase tracking-wide font-medium text-[#f2f2f2]">
          + Agregar objetivo
        </h3>
        <label className="block">
          <span className="cyb-hint text-sm block mb-1">Título</span>
          <input
            name="title"
            required
            placeholder="Ej: Hacer ejercicio"
            className="cyb-in"
          />
        </label>
        <label className="block">
          <span className="cyb-hint text-sm block mb-1">Descripción (opcional)</span>
          <input
            name="description"
            placeholder="Ej: 30 minutos de caminata"
            className="cyb-in"
          />
        </label>
        {state.error ? <p className="text-sm text-[#ff3b5c]">{state.error}</p> : null}
        {state.success ? <p className="text-sm text-[#00ff9d]">{state.success}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="cyb-btn small"
        >
          {pending ? "Creando..." : "Crear objetivo"}
        </button>
      </form>

      {sorted.length === 0 ? (
        <p className="cyb-hint text-sm">No hay objetivos todavía.</p>
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
              <ObjectiveRow
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