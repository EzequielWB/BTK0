"use client";

import { useActionState, useState } from "react";
import {
  createObjectiveAction,
  deleteObjectiveAction,
  toggleObjectiveActiveAction,
  updateObjectiveAction,
} from "@/lib/actions";
import type { Objective } from "@/lib/types";

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

function ObjectiveRow({
  objective,
  onEdit,
}: {
  objective: Objective;
  onEdit: (id: string) => void;
}) {
  return (
    <li className="enrow flex items-start justify-between gap-2">
      <div>
        <strong className={objective.is_active ? "" : "cyb-dim"}>
          {objective.title}
        </strong>
        {objective.description ? (
          <p className="cyb-muted text-sm">{objective.description}</p>
        ) : null}
        {!objective.is_active ? (
          <p className="cyb-hint text-xs mt-1">Desactivado</p>
        ) : null}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
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

  const sorted = [...objectives].sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.created_at.localeCompare(b.created_at);
  });

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
          {sorted.map((objective) =>
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
                onEdit={setEditingId}
              />
            )
          )}
        </ul>
      )}
    </section>
  );
}