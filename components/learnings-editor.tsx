"use client";

import { DailyEntriesEditor } from "@/components/daily-entries-editor";
import { addLearningAction, deleteLearningAction } from "@/lib/actions";
import type { Learning } from "@/lib/types";

export function LearningsEditor({
  date,
  initialLearnings,
}: {
  date: string;
  initialLearnings: Learning[];
}) {
  return (
    <DailyEntriesEditor
      title="Qué aprendí"
      emptyText="Aún no registraste aprendizajes para este día."
      placeholder="¿Qué aprendiste nuevo hoy?"
      addLabel="Agregar aprendizaje"
      pendingAddLabel="Agregando..."
      okMessage="Aprendizaje agregado"
      initialEntries={initialLearnings}
      add={(content, id) => addLearningAction(date, content, id)}
      remove={(id) => deleteLearningAction(id, date)}
    />
  );
}