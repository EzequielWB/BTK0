"use client";

import { useState } from "react";

const MONTH_NAMES = Array.from({ length: 12 }, (_, i) =>
  new Intl.DateTimeFormat("es-AR", { month: "long" }).format(
    new Date(2020, i, 1)
  )
);

export function StatsPeriodSelector({
  mes,
  anio,
  vista,
  currentYear,
}: {
  mes: string;
  anio: string;
  vista: "mes" | "año";
  currentYear: number;
}) {
  const [view, setView] = useState<"mes" | "año">(vista);
  const years = Array.from(
    { length: 8 },
    (_, i) => currentYear - 5 + i
  );

  return (
    <form
      method="get"
      action="/bitacora/stats"
      className="flex flex-wrap items-end gap-2 mt-3"
      aria-label="Filtros de estadísticas"
    >
      <input type="hidden" name="vista" value={view} />
      {view === "mes" && (
        <label className="cyb-muted flex flex-col gap-1 text-xs">
          Mes
          <select
            name="mes"
            defaultValue={mes}
            aria-label="Mes de las estadísticas"
            className="cyb-in"
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={name} value={String(i + 1)}>
                {name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="cyb-muted flex flex-col gap-1 text-xs">
        Año
        <select
          name="anio"
          defaultValue={anio}
          aria-label="Año de las estadísticas"
          className="cyb-in"
        >
          {years.map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-center gap-1" role="group" aria-label="Vista">
        <button
          type="button"
          onClick={() => setView("mes")}
          className={"chip-btn" + (view === "mes" ? " active" : "")}
        >
          Mes
        </button>
        <button
          type="button"
          onClick={() => setView("año")}
          className={"chip-btn" + (view === "año" ? " active" : "")}
        >
          Año
        </button>
      </div>
      <button type="submit" className="chip-btn white">
        Ir
      </button>
    </form>
  );
}