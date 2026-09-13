"use client";

import { useRef, useState, useTransition } from "react";
import { useOptimistic } from "react";
import {
  createAgendaCategoryAction,
  createAgendaItemAction,
  deleteAgendaCategoryAction,
  deleteAgendaItemAction,
  moveAgendaCategoryAction,
  renameAgendaCategoryAction,
  updateAgendaItemAction,
} from "@/lib/actions";
import type { AgendaCategory, AgendaItem } from "@/lib/types";

type Message = { kind: "ok" | "error"; text: string };

type CategoryAction =
  | { type: "add"; category: AgendaCategory }
  | { type: "update"; category: AgendaCategory }
  | { type: "move"; id: string; direction: "up" | "down" }
  | { type: "delete"; id: string };

type ItemAction =
  | { type: "add"; item: AgendaItem }
  | { type: "update"; item: AgendaItem }
  | { type: "delete"; id: string };

export function AgendaManager({
  initialCategories,
  initialItems,
}: {
  initialCategories: AgendaCategory[];
  initialItems: AgendaItem[];
}) {
  const [categorySearch, setCategorySearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    [...initialCategories].sort((a, b) => a.sort_order - b.sort_order)[0]?.id ?? null
  );

  const [newCatName, setNewCatName] = useState("");
  const [catEditingId, setCatEditingId] = useState<string | null>(null);
  const [catEditName, setCatEditName] = useState("");
  const [catArmId, setCatArmId] = useState<string | null>(null);
  const catArmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [itemEditingId, setItemEditingId] = useState<string | null>(null);
  const [itemEditTitle, setItemEditTitle] = useState("");
  const [itemEditContent, setItemEditContent] = useState("");
  const [itemArmId, setItemArmId] = useState<string | null>(null);
  const itemArmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<Message | null>(null);

  const [optimisticCategories, mutateCategories] = useOptimistic(
    initialCategories,
    (state: AgendaCategory[], action: CategoryAction) => {
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

  const [optimisticItems, mutateItems] = useOptimistic(
    initialItems,
    (state: AgendaItem[], action: ItemAction) => {
      if (action.type === "add") return [...state, action.item];
      if (action.type === "update")
        return state.map((it) => (it.id === action.item.id ? action.item : it));
      return state.filter((it) => it.id !== action.id);
    }
  );

  const orderedCategories = [...optimisticCategories].sort(
    (a, b) => a.sort_order - b.sort_order
  );

  const categoryTerm = categorySearch.trim().toLowerCase();
  const filteredCategories = orderedCategories.filter((cat) =>
    categoryTerm ? cat.name.toLowerCase().includes(categoryTerm) : true
  );

  let activeCategory: AgendaCategory | null = null;
  if (selectedId) {
    activeCategory = filteredCategories.find((c) => c.id === selectedId) ?? null;
  }
  if (!activeCategory) {
    activeCategory = filteredCategories[0] ?? null;
  }

  const countFor = (catId: string): number =>
    optimisticItems.filter((it) => it.category_id === catId).length;

  const itemTerm = itemSearch.trim().toLowerCase();
  const activeItems = activeCategory
    ? optimisticItems
        .filter((it) => it.category_id === activeCategory.id)
        .filter((it) => (itemTerm ? it.title.toLowerCase().includes(itemTerm) || it.content.toLowerCase().includes(itemTerm) : true))
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
    : [];

  function selectCategory(id: string) {
    if (pending) return;
    setSelectedId(id);
    setMessage(null);
    setCatArmId(null);
    setItemEditingId(null);
    setItemArmId(null);
    setItemSearch("");
  }

  function handleAddCategory() {
    if (pending) return;
    const name = newCatName.trim();
    setMessage(null);
    if (!name) return;
    const id = crypto.randomUUID();
    setNewCatName("");
    startTransition(async () => {
      mutateCategories({
        type: "add",
        category: {
          id,
          name,
          sort_order: orderedCategories.length,
          created_at: new Date().toISOString(),
        },
      });
      setSelectedId(id);
      const result = await createAgendaCategoryAction(name, id);
      setMessage(
        result?.error
          ? { kind: "error", text: result.error }
          : { kind: "ok", text: "Categoría creada." }
      );
    });
  }

  function handleRenameCategory(cat: AgendaCategory) {
    const name = catEditName.trim();
    if (!name) {
      setCatEditingId(null);
      return;
    }
    setCatEditingId(null);
    startTransition(async () => {
      mutateCategories({ type: "update", category: { ...cat, name } });
      const result = await renameAgendaCategoryAction(cat.id, name);
      if (result?.error) setMessage({ kind: "error", text: result.error });
    });
  }

  function handleMoveCategory(cat: AgendaCategory, direction: "up" | "down") {
    if (pending) return;
    startTransition(async () => {
      mutateCategories({ type: "move", id: cat.id, direction });
      const result = await moveAgendaCategoryAction(cat.id, direction);
      if (result?.error) setMessage({ kind: "error", text: result.error });
    });
  }

  function handleDeleteCategory(cat: AgendaCategory) {
    if (catArmId !== cat.id) {
      setCatArmId(cat.id);
      if (catArmTimer.current) clearTimeout(catArmTimer.current);
      catArmTimer.current = setTimeout(() => setCatArmId(null), 3000);
      return;
    }
    if (catArmTimer.current) clearTimeout(catArmTimer.current);
    setCatArmId(null);
    if (selectedId === cat.id) setSelectedId(null);
    startTransition(async () => {
      mutateCategories({ type: "delete", id: cat.id });
      const result = await deleteAgendaCategoryAction(cat.id);
      if (result?.error) setMessage({ kind: "error", text: result.error });
    });
  }

  function handleAddItem() {
    if (pending || !activeCategory) return;
    const title = newTitle.trim();
    if (!title) {
      setMessage({ kind: "error", text: "Escribí un título para el ítem." });
      return;
    }
    const content = newContent.trim();
    const id = crypto.randomUUID();
    setNewTitle("");
    setNewContent("");
    setMessage(null);
    startTransition(async () => {
      mutateItems({
        type: "add",
        item: {
          id,
          category_id: activeCategory.id,
          title,
          content,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });
      const result = await createAgendaItemAction(activeCategory.id, title, content, id);
      setMessage(
        result?.error
          ? { kind: "error", text: result.error }
          : { kind: "ok", text: "Ítem agregado." }
      );
    });
  }

  function handleSaveItem(item: AgendaItem) {
    if (pending) return;
    const title = itemEditTitle.trim();
    if (!title) {
      setMessage({ kind: "error", text: "El título del ítem está vacío." });
      return;
    }
    const content = itemEditContent.trim();
    setItemEditingId(null);
    startTransition(async () => {
      mutateItems({
        type: "update",
        item: { ...item, title, content, updated_at: new Date().toISOString() },
      });
      const result = await updateAgendaItemAction(item.id, title, content);
      setMessage(
        result?.error
          ? { kind: "error", text: result.error }
          : { kind: "ok", text: "Ítem actualizado." }
      );
    });
  }

  function handleDeleteItem(item: AgendaItem) {
    if (itemArmId !== item.id) {
      setItemArmId(item.id);
      if (itemArmTimer.current) clearTimeout(itemArmTimer.current);
      itemArmTimer.current = setTimeout(() => setItemArmId(null), 3000);
      return;
    }
    if (itemArmTimer.current) clearTimeout(itemArmTimer.current);
    setItemArmId(null);
    startTransition(async () => {
      mutateItems({ type: "delete", id: item.id });
      const result = await deleteAgendaItemAction(item.id);
      if (result?.error) setMessage({ kind: "error", text: result.error });
    });
  }

  const rowBase =
    "flex items-center gap-1.5 border px-2 py-1.5 text-sm cursor-pointer select-none";

  return (
    <div className="space-y-3">
      <div className="grid gap-4 md:grid-cols-[250px_1fr]">
        {/* Categorías */}
        <section className="blk" aria-label="Categorías">
          <span className="blk-tag">Categorías</span>
          <input
            value={categorySearch}
            onChange={(event) => {
              setCategorySearch(event.target.value);
              setMessage(null);
            }}
            placeholder="Buscar categorías..."
            aria-label="Buscar categorías"
            className="cyb-in"
          />
          <div className="mt-3 space-y-2">
            {filteredCategories.length === 0 ? (
              <p className="cyb-hint text-sm">
                {orderedCategories.length === 0
                  ? "Todavía no hay categorías. Creá la primera abajo."
                  : "Ninguna categoría coincide con la búsqueda."}
              </p>
            ) : (
              filteredCategories.map((cat, index) => {
                const isActive = cat.id === activeCategory?.id;
                const count = countFor(cat.id);
                return (
                  <div
                    key={cat.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => selectCategory(cat.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        selectCategory(cat.id);
                      }
                    }}
                    aria-label={`Categoría ${cat.name}`}
                    aria-current={isActive ? "true" : undefined}
                    className={
                      rowBase +
                      " " +
                      (isActive
                        ? "border-[#00ff9d] text-[#00ff9d] bg-[rgba(0,255,157,0.08)]"
                        : "border-[#242424] text-[#f2f2f2] hover:border-[#00ff9d]") +
                      (pending ? " pointer-events-none opacity-70" : "")
                    }
                  >
                    {catEditingId === cat.id ? (
                      <>
                        <input
                          value={catEditName}
                          onChange={(event) => setCatEditName(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              handleRenameCategory(cat);
                            }
                          }}
                          aria-label={`Renombrar categoría ${cat.name}`}
                          autoFocus
                          className="cyb-in flex-1"
                        />
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleRenameCategory(cat);
                          }}
                          aria-label="Confirmar nombre"
                          disabled={pending}
                          className="cyb-link"
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setCatEditingId(null);
                          }}
                          aria-label="Cancelar renombrado"
                          className="cyb-link"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 truncate">{cat.name}</span>
                        <span className="cyb-hint text-xs">{count}</span>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setCatEditingId(cat.id);
                            setCatEditName(cat.name);
                          }}
                          aria-label={`Renombrar ${cat.name}`}
                          disabled={pending}
                          className="cyb-link disabled:opacity-40"
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleMoveCategory(cat, "up");
                          }}
                          aria-label={`Subir ${cat.name}`}
                          disabled={index === 0 || pending}
                          className="cyb-link disabled:opacity-40"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleMoveCategory(cat, "down");
                          }}
                          aria-label={`Bajar ${cat.name}`}
                          disabled={index === filteredCategories.length - 1 || pending}
                          className="cyb-link disabled:opacity-40"
                        >
                          ▼
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteCategory(cat);
                          }}
                          aria-label={
                            catArmId === cat.id
                              ? `Confirmar borrado de ${cat.name}`
                              : `Borrar ${cat.name}`
                          }
                          disabled={pending}
                          className={`cyb-link disabled:opacity-40 ${
                            catArmId === cat.id ? "red" : ""
                          }`}
                        >
                          {catArmId === cat.id ? "¿Borrar?" : "✕"}
                        </button>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <div className="mt-3 flex gap-2">
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
              className="cyb-in"
            />
            <button
              type="button"
              onClick={handleAddCategory}
              disabled={pending || !newCatName.trim()}
              className="cyb-btn small disabled:opacity-40"
            >
              Agregar
            </button>
          </div>
        </section>

        {/* Ítems de la categoría seleccionada */}
        <section className="blk" aria-label="Ítems de la categoría">
          <span className="blk-tag">
            {activeCategory ? activeCategory.name : "Sin categoría"}
          </span>

          {!activeCategory ? (
            <p className="cyb-hint text-sm">
              Creá o elegí una categoría para empezar a anotar.
            </p>
          ) : (
            <>
              <input
                value={itemSearch}
                onChange={(event) => {
                  setItemSearch(event.target.value);
                  setMessage(null);
                }}
                placeholder={`Buscar en "${activeCategory.name}"...`}
                aria-label={`Buscar ítems en ${activeCategory.name}`}
                className="cyb-in"
              />
              {activeItems.length === 0 ? (
                <p className="cyb-hint text-sm mt-3">
                  {itemSearch.trim()
                    ? "Ningún ítem coincide con la búsqueda."
                    : "Todavía no hay ítems en esta categoría. Agregá el primero abajo."}
                </p>
              ) : (
                <ul className="space-y-2 mt-3">
                  {activeItems.map((item) => (
                    <li key={item.id} className="enrow">
                      {itemEditingId === item.id ? (
                        <>
                          <input
                            value={itemEditTitle}
                            onChange={(event) => setItemEditTitle(event.target.value)}
                            placeholder="Título"
                            aria-label="Título del ítem"
                            autoFocus
                            className="cyb-in"
                          />
                          <textarea
                            value={itemEditContent}
                            onChange={(event) => setItemEditContent(event.target.value)}
                            placeholder="Escribí lo que quieras..."
                            rows={4}
                            aria-label="Contenido del ítem"
                            className="cyb-in resize-y mt-2"
                          />
                          <div className="mt-2 flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleSaveItem(item)}
                              disabled={pending || !itemEditTitle.trim()}
                              className="cyb-btn small disabled:opacity-40"
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              onClick={() => setItemEditingId(null)}
                              className="cyb-link"
                            >
                              Cancelar
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <h3 className="font-semibold">{item.title}</h3>
                          {item.content && (
                            <p className="cyb-muted text-sm whitespace-pre-wrap mt-1">
                              {item.content}
                            </p>
                          )}
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setItemEditingId(item.id);
                                setItemEditTitle(item.title);
                                setItemEditContent(item.content);
                              }}
                              disabled={pending}
                              className="cyb-link disabled:opacity-40"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item)}
                              disabled={pending}
                              className={`cyb-link red disabled:opacity-40 ${
                                itemArmId === item.id ? "opacity-70" : ""
                              }`}
                            >
                              {itemArmId === item.id ? "¿Borrar?" : "Borrar"}
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <div className="border-t pt-3 mt-3" aria-label="Nuevo ítem">
                <input
                  value={newTitle}
                  onChange={(event) => {
                    setNewTitle(event.target.value);
                    setMessage(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleAddItem();
                  }}
                  placeholder="Título del ítem (ej: Milanesas)"
                  aria-label="Título del nuevo ítem"
                  className="cyb-in"
                />
                <textarea
                  value={newContent}
                  onChange={(event) => {
                    setNewContent(event.target.value);
                    setMessage(null);
                  }}
                  placeholder="Escribí lo que quieras guardar..."
                  rows={3}
                  aria-label="Contenido del nuevo ítem"
                  className="cyb-in resize-y mt-2"
                />
                <button
                  type="button"
                  onClick={handleAddItem}
                  disabled={pending || !newTitle.trim()}
                  className="cyb-btn mt-2 disabled:opacity-40"
                >
                  {pending ? "Guardando..." : "Agregar ítem"}
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      {message && (
        <span
          role="status"
          aria-live="polite"
          className={`block text-sm ${
            message.kind === "error" ? "text-[#ff3b5c]" : "cyb-muted"
          }`}
        >
          {message.text}
        </span>
      )}
    </div>
  );
}