"use client";

import { useRef, useState, useTransition } from "react";
import { useOptimistic } from "react";
import {
  createAnnualCategoryAction,
  createAnnualReminderAction,
  deleteAnnualCategoryAction,
  deleteAnnualReminderAction,
  moveAnnualCategoryAction,
  updateAnnualCategoryAction,
  updateAnnualReminderAction,
} from "@/lib/actions";
import type { AnnualCategory, AnnualReminder } from "@/lib/types";
import {
  annualOccurrenceISO,
  formatMonthDay,
} from "@/lib/utils";
import { ClampText } from "@/components/clamp-text";

const SIN_SEPARAR = "Sin separar";

function occurrenceLabel(item: AnnualReminder): string {
  const next = annualOccurrenceISO(item.month, item.day);
  if (!next) return "";
  if (next.inDays === 0) return "hoy";
  if (next.inDays === 1) return "mañana";
  return `en ${next.inDays} días`;
}

function sortedByOccurrence(items: AnnualReminder[]): AnnualReminder[] {
  return [...items].sort((a, b) => {
    const na = annualOccurrenceISO(a.month, a.day)?.inDays ?? 367;
    const nb = annualOccurrenceISO(b.month, b.day)?.inDays ?? 367;
    return na - nb;
  });
}

type Message = { kind: "ok" | "error"; text: string };

type CategoryAction =
  | { type: "add"; category: AnnualCategory }
  | { type: "update"; category: AnnualCategory }
  | { type: "move"; id: string; direction: "up" | "down" }
  | { type: "delete"; id: string };

type ReminderAction =
  | { type: "add"; reminder: AnnualReminder }
  | { type: "update"; reminder: AnnualReminder }
  | { type: "uncategorize"; categoryId: string }
  | { type: "delete"; reminder: AnnualReminder };

export function AnnualReminders({
  initialReminders,
  initialCategories,
}: {
  initialReminders: AnnualReminder[];
  initialCategories: AnnualCategory[];
}) {
  const [content, setContent] = useState("");
  const [dayVal, setDayVal] = useState("");
  const [monthVal, setMonthVal] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<Message | null>(null);

  const [newCatName, setNewCatName] = useState("");
  const [catEditingId, setCatEditingId] = useState<string | null>(null);
  const [catEditName, setCatEditName] = useState("");
  const [catArmId, setCatArmId] = useState<string | null>(null);
  const catArmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [optimistic, mutate] = useOptimistic(initialReminders, (state, action: ReminderAction) => {
    if (action.type === "add") return [...state, action.reminder];
    if (action.type === "update")
      return state.map((r) => (r.id === action.reminder.id ? action.reminder : r));
    if (action.type === "uncategorize")
      return state.map((r) =>
        r.category_id === action.categoryId ? { ...r, category_id: null } : r
      );
    return state.filter((r) => r.id !== action.reminder.id);
  });

  const [optimisticCats, mutateCategories] = useOptimistic(
    initialCategories,
    (state: AnnualCategory[], action: CategoryAction) => {
      if (action.type === "add") return [...state, action.category];
      if (action.type === "update")
        return state.map((c) => (c.id === action.category.id ? action.category : c));
      if (action.type === "delete") return state.filter((c) => c.id !== action.id);
      const idx = state.findIndex((c) => c.id === action.id);
      const pos = action.direction === "up" ? idx - 1 : idx + 1;
      if (idx < 0 || pos < 0 || pos >= state.length) return state;
      const next = [...state];
      const a = next[idx];
      const b = next[pos];
      next[idx] = { ...b, sort_order: a.sort_order };
      next[pos] = { ...a, sort_order: b.sort_order };
      return next;
    }
  );

  const orderedCategories = [...optimisticCats].sort(
    (a, b) => a.sort_order - b.sort_order
  );
  const sorted = sortedByOccurrence(optimistic);

  const groups: { category: AnnualCategory | null; items: AnnualReminder[] }[] = [
    ...orderedCategories.map((cat) => ({
      category: cat,
      items: sorted.filter((r) => r.category_id === cat.id),
    })),
    {
      category: null,
      items: sorted.filter((r) => !r.category_id),
    },
  ].filter((g) => g.items.length > 0);

  function persistAdd(categoryId: string | null) {
    if (pending) return;
    const text = content.trim();
    const month = Number(monthVal);
    const day = Number(dayVal);
    const id = crypto.randomUUID();
    setPickerOpen(false);
    setContent("");
    setDayVal("");
    setMonthVal("");
    startTransition(async () => {
      mutate({
        type: "add",
        reminder: {
          id,
          month,
          day,
          content: text,
          category_id: categoryId,
          created_at: new Date().toISOString(),
        },
      });
      const result = await createAnnualReminderAction(text, month, day, id, categoryId);
      setMessage(
        result?.error
          ? { kind: "error", text: result.error }
          : { kind: "ok", text: "Efeméride guardada." }
      );
    });
  }

  function handleAdd() {
    if (pending) return;
    const text = content.trim();
    const month = Number(monthVal);
    const day = Number(dayVal);
    setMessage(null);
    if (!text) {
      setMessage({ kind: "error", text: "Escribí la efeméride." });
      return;
    }
    if (!(annualOccurrenceISO(month, day) ?? null)) {
      setMessage({ kind: "error", text: "La fecha no es válida. Usá día y mes." });
      return;
    }
    if (orderedCategories.length === 0) {
      persistAdd(null);
      return;
    }
    setPickerOpen(true);
  }

  function handleSaveEdit(reminder: AnnualReminder) {
    if (pending) return;
    const text = editValue.trim();
    if (!text) {
      setMessage({ kind: "error", text: "La efeméride está vacía." });
      return;
    }
    setEditingId(null);
    startTransition(async () => {
      mutate({
        type: "update",
        reminder: { ...reminder, content: text },
      });
      const result = await updateAnnualReminderAction(
        reminder.id,
        text,
        reminder.month,
        reminder.day,
        reminder.category_id ?? null
      );
      setMessage(
        result?.error
          ? { kind: "error", text: result.error }
          : { kind: "ok", text: "Efeméride actualizada." }
      );
    });
  }

  function handleMove(reminder: AnnualReminder, categoryId: string | null) {
    if (pending) return;
    if ((reminder.category_id ?? null) === categoryId) return;
    startTransition(async () => {
      mutate({
        type: "update",
        reminder: { ...reminder, category_id: categoryId },
      });
      const result = await updateAnnualReminderAction(
        reminder.id,
        reminder.content,
        reminder.month,
        reminder.day,
        categoryId
      );
      setMessage(
        result?.error
          ? { kind: "error", text: result.error }
          : { kind: "ok", text: "Efeméride movida." }
      );
    });
  }

  function handleDelete(reminder: AnnualReminder) {
    startTransition(async () => {
      mutate({ type: "delete", reminder });
      const result = await deleteAnnualReminderAction(reminder.id);
      if (result?.error) setMessage({ kind: "error", text: result.error });
    });
  }

  function handleDeleteCategory(cat: AnnualCategory) {
    if (catArmId !== cat.id) {
      setCatArmId(cat.id);
      if (catArmTimer.current) clearTimeout(catArmTimer.current);
      catArmTimer.current = setTimeout(() => setCatArmId(null), 3000);
      return;
    }
    if (catArmTimer.current) clearTimeout(catArmTimer.current);
    setCatArmId(null);
    startTransition(async () => {
      mutateCategories({ type: "delete", id: cat.id });
      mutate({ type: "uncategorize", categoryId: cat.id });
      const result = await deleteAnnualCategoryAction(cat.id);
      if (result?.error) setMessage({ kind: "error", text: result.error });
    });
  }

  function handleAddCategory() {
    if (pending) return;
    const name = newCatName.trim();
    setMessage(null);
    if (!name) return;
    setNewCatName("");
    startTransition(async () => {
      mutateCategories({
        type: "add",
        category: {
          id: crypto.randomUUID(),
          name,
          sort_order: orderedCategories.length,
          created_at: new Date().toISOString(),
        },
      });
      const result = await createAnnualCategoryAction(name);
      setMessage(
        result?.error
          ? { kind: "error", text: result.error }
          : { kind: "ok", text: "Categoría creada." }
      );
    });
  }

  function handleRenameCategory(cat: AnnualCategory) {
    const name = catEditName.trim();
    if (!name) {
      setCatEditingId(null);
      return;
    }
    setCatEditingId(null);
    startTransition(async () => {
      mutateCategories({ type: "update", category: { ...cat, name } });
      const result = await updateAnnualCategoryAction(cat.id, name);
      if (result?.error) setMessage({ kind: "error", text: result.error });
    });
  }

  function handleMoveCategory(cat: AnnualCategory, direction: "up" | "down") {
    if (pending) return;
    startTransition(async () => {
      mutateCategories({ type: "move", id: cat.id, direction });
      const result = await moveAnnualCategoryAction(cat.id, direction);
      if (result?.error) setMessage({ kind: "error", text: result.error });
    });
  }

  return (
    <div className="space-y-3">
      {/* Categorías */}
      <div className="space-y-2" aria-label="Categorías">
        <span className="cyb-hint block text-xs uppercase tracking-wider">
          Categorías
        </span>
        <div className="chip-row">
          {orderedCategories.map((cat, index) => (
            <span key={cat.id} className="cat-chip">
              {catEditingId === cat.id ? (
                <>
                  <input
                    value={catEditName}
                    onChange={(event) => setCatEditName(event.target.value)}
                    aria-label={`Renombrar categoría ${cat.name}`}
                    className="cat-chip-in cyb-in"
                  />
                  <button
                    type="button"
                    onClick={() => handleRenameCategory(cat)}
                    aria-label="Confirmar nombre"
                    disabled={pending}
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatEditingId(null)}
                    aria-label="Cancelar renombrado"
                  >
                    ✕
                  </button>
                </>
              ) : (
                <>
                  <span>{cat.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCatEditingId(cat.id);
                      setCatEditName(cat.name);
                    }}
                    aria-label={`Renombrar ${cat.name}`}
                    disabled={pending}
                  >
                    ✎
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => handleMoveCategory(cat, "up")}
                aria-label={`Subir ${cat.name}`}
                disabled={index === 0 || pending}
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => handleMoveCategory(cat, "down")}
                aria-label={`Bajar ${cat.name}`}
                disabled={index === orderedCategories.length - 1 || pending}
              >
                ▼
              </button>
              <button
                type="button"
                onClick={() => handleDeleteCategory(cat)}
                aria-label={
                  catArmId === cat.id
                    ? `Confirmar borrado de ${cat.name}`
                    : `Borrar ${cat.name}`
                }
                disabled={pending}
                className={catArmId === cat.id ? "cat-del-active" : undefined}
              >
                ✕
              </button>
            </span>
          ))}
          <input
            value={newCatName}
            onChange={(event) => {
              setNewCatName(event.target.value);
              setMessage(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleAddCategory();
            }}
            placeholder="Nueva categoría..."
            maxLength={40}
            aria-label="Nombre de la nueva categoría"
            className="cyb-in new-cat-in"
          />
          <button
            type="button"
            onClick={handleAddCategory}
            disabled={pending || !newCatName.trim()}
            className="chip-btn disabled:opacity-40"
          >
            Agregar
          </button>
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="cyb-hint text-sm">
          No hay efemérides todavía. Agregá cumpleaños, aniversarios o
          cualquier fecha que se repita todos los años.
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.category?.id ?? "__sin-separar"}>
              <span className="cyb-hint block text-xs uppercase tracking-wider mb-1">
                {group.category?.name ?? SIN_SEPARAR}
              </span>
              <ul className="space-y-2">
                {group.items.map((reminder) => (
                  <li key={reminder.id} className="enrow">
                    {editingId === reminder.id ? (
                      <textarea
                        value={editValue}
                        onChange={(event) => setEditValue(event.target.value)}
                        rows={2}
                        className="cyb-in resize-y"
                      />
                    ) : (
                      <>
                        <span className="cyb-hint text-xs block">
                          {formatMonthDay(reminder.month, reminder.day)} · próxima:{" "}
                          {occurrenceLabel(reminder)}
                        </span>
                        <ClampText text={reminder.content} className="whitespace-pre-wrap" />
                      </>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
                      <div className="flex items-center gap-2">
                        {editingId !== reminder.id && (
                          <select
                            value={reminder.category_id ?? ""}
                            onChange={(event) =>
                              handleMove(
                                reminder,
                                event.target.value === "" ? null : event.target.value
                              )
                            }
                            disabled={pending}
                            aria-label="Mover efeméride a categoría"
                            className="cyb-in cat-move-select"
                          >
                            <option value="">{SIN_SEPARAR}</option>
                            {orderedCategories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        )}
                        <span className="text-xs">
                          {editingId === reminder.id ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(reminder)}
                                disabled={pending}
                                className="cyb-link disabled:opacity-40"
                              >
                                Guardar
                              </button>
                              {" · "}
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="cyb-link"
                              >
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(reminder.id);
                                setEditValue(reminder.content);
                              }}
                              disabled={pending}
                              className="cyb-link disabled:opacity-40"
                            >
                              Editar
                            </button>
                          )}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(reminder)}
                        disabled={pending}
                        className="cyb-link red disabled:opacity-40"
                      >
                        Borrar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {message && (
        <span
          role="status"
          aria-live="polite"
          className={`block text-sm ${
            message.kind === "error" ? "text-[var(--cyb-g1)]" : "cyb-muted"
          }`}
        >
          {message.text}
        </span>
      )}

      <div className="pt-3 border-t" aria-label="Nueva efeméride">
        <textarea
          value={content}
          onChange={(event) => {
            setContent(event.target.value);
            setMessage(null);
          }}
          placeholder="Escribí la efeméride..."
          rows={2}
          className="cyb-in resize-y"
        />
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <div className="flex items-center gap-1">
            <input
              value={dayVal}
              onChange={(event) => {
                setDayVal(event.target.value.replace(/\D/g, "").slice(0, 2));
                setMessage(null);
              }}
              placeholder="día"
              inputMode="numeric"
              maxLength={2}
              aria-label="Día de la efeméride (dd)"
              className="cyb-in w-14"
            />
            <span aria-hidden className="cyb-hint text-xs">/</span>
            <input
              value={monthVal}
              onChange={(event) => {
                setMonthVal(
                  event.target.value.replace(/\D/g, "").slice(0, 2)
                );
                setMessage(null);
              }}
              placeholder="mes"
              inputMode="numeric"
              maxLength={2}
              aria-label="Mes de la efeméride (mm)"
              className="cyb-in w-14"
            />
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={pending || (!content.trim() && !(dayVal || monthVal))}
            className="cyb-btn disabled:opacity-40"
          >
            {pending ? "Guardando..." : "Agregar efeméride"}
          </button>
        </div>
      </div>

      {/* Menú al guardar: elegir categoría. Si se cierra sin elegir, se guarda en "sin separar". */}
      {pickerOpen && (
        <div className="cyb-modal" onClick={() => persistAdd(null)}>
          <div
            className="cyb-modal-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="blk-tag">¿Dónde la guardo?</span>
              <button
                type="button"
                onClick={() => persistAdd(null)}
                className="cyb-link"
                aria-label="Cerrar sin elegir"
              >
                ✕
              </button>
            </div>
            <div className="chip-row">
              {orderedCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => persistAdd(cat.id)}
                  className="chip-btn"
                >
                  {cat.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => persistAdd(null)}
                className="chip-btn"
              >
                {SIN_SEPARAR}
              </button>
            </div>
            <p className="cyb-hint text-xs mt-2">
              Si cerrás sin elegir, se anota igualmente como «{SIN_SEPARAR}».
            </p>
          </div>
        </div>
      )}
    </div>
  );
}