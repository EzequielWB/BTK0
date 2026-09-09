"use client";

import { DailyEntriesEditor } from "@/components/daily-entries-editor";
import { addNoteAction, deleteNoteAction } from "@/lib/actions";
import type { Note } from "@/lib/types";

export function NotesEditor({
  date,
  initialNotes,
}: {
  date: string;
  initialNotes: Note[];
}) {
  return (
    <DailyEntriesEditor
      title="Notas del día"
      emptyText="Todavía no hay notas para este día."
      placeholder="Escribí una nota para dejar en este día..."
      addLabel="Agregar nota"
      pendingAddLabel="Agregando..."
      okMessage="Nota agregada"
      initialEntries={initialNotes}
      add={(content, id) => addNoteAction(date, content, id)}
      remove={(id) => deleteNoteAction(id, date)}
    />
  );
}