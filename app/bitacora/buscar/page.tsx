import { redirect } from "next/navigation";
import Link from "next/link";
import { isAuthenticated } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { formatShortDate, isValidISODate, toISODate } from "@/lib/utils";
import type {
  AnnualCategory,
  AnnualReminder,
  Learning,
  Note,
  Reminder,
} from "@/lib/types";

export const dynamic = "force-dynamic";

type Category =
  | "Recordatorio"
  | "Efeméride"
  | "Anotación"
  | "Aprendizaje"
  | "Hoja";

const CATEGORY_ORDER: Category[] = [
  "Recordatorio",
  "Efeméride",
  "Anotación",
  "Aprendizaje",
  "Hoja",
];

type SearchItem = {
  category: Category;
  categoryName?: string;
  date: string;
  text: string;
};

const MONTH_NAMES = Array.from({ length: 12 }, (_, i) =>
  new Intl.DateTimeFormat("es-AR", { month: "long" }).format(
    new Date(2020, i, 1)
  )
);

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; anio?: string; mes?: string }>;
}) {
  if (!(await isAuthenticated())) redirect("/");

  const { q = "", anio = "", mes = "" } = await searchParams;

  const term = q.trim().toLowerCase();
  const currentYear = new Date().getFullYear();
  const year = /^\d{4}$/.test(anio) ? Number(anio) : currentYear;
  const selMonth = /^(1[0-2]|[1-9])$/.test(mes) ? Number(mes) : null;

  const start = selMonth
    ? toISODate(new Date(year, selMonth - 1, 1, 12))
    : `${year}-01-01`;
  const end = selMonth
    ? toISODate(new Date(year, selMonth, 0, 12))
    : `${year}-12-31`;
  const rangeLabel = selMonth
    ? `${MONTH_NAMES[selMonth - 1]} de ${year}`
    : `todo ${year}`;

  const items: SearchItem[] = [];

  if (term.length > 0) {
    const supabase = await createClient();
    const [
      { data: notes },
      { data: learnings },
      { data: reminders },
      { data: journalRows },
      { data: annualRows },
      { data: categoryRows },
    ] = await Promise.all([
      supabase
        .from("notes")
        .select("date, content")
        .gte("date", start)
        .lte("date", end)
        .order("date"),
      supabase
        .from("learnings")
        .select("date, content")
        .gte("date", start)
        .lte("date", end)
        .order("date"),
      supabase
        .from("reminders")
        .select("date, content")
        .gte("date", start)
        .lte("date", end)
        .order("date"),
      supabase
        .from("journal")
        .select("date, content")
        .gte("date", start)
        .lte("date", end)
        .order("date"),
      supabase
        .from("annual_reminders")
        .select("*")
        .order("month")
        .order("day"),
      supabase.from("annual_categories").select("id, name"),
    ]);

    const categoryNameById = new Map(
      ((categoryRows ?? []) as AnnualCategory[]).map((c) => [c.id, c.name])
    );

    for (const row of (reminders ?? []) as Reminder[]) {
      items.push({
        category: "Recordatorio",
        date: row.date,
        text: row.content ?? "",
      });
    }

    for (const entry of (annualRows ?? []) as AnnualReminder[]) {
      if (selMonth && entry.month !== selMonth) continue;
      const when = `${year}-${String(entry.month).padStart(2, "0")}-${String(
        entry.day
      ).padStart(2, "0")}`;
      if (!isValidISODate(when)) continue;
      items.push({
        category: "Efeméride",
        categoryName:
          (entry.category_id && categoryNameById.get(entry.category_id)) ||
          undefined,
        date: when,
        text: entry.content ?? "",
      });
    }

    for (const row of (notes ?? []) as Note[]) {
      items.push({
        category: "Anotación",
        date: row.date,
        text: row.content ?? "",
      });
    }

    for (const row of (learnings ?? []) as Learning[]) {
      items.push({
        category: "Aprendizaje",
        date: row.date,
        text: row.content ?? "",
      });
    }

    for (const row of (journalRows ?? []) as {
      date: string;
      content: string | null;
    }[]) {
      items.push({
        category: "Hoja",
        date: row.date,
        text: row.content ?? "",
      });
    }
  }

  const matches = items.filter((item) =>
    item.text.toLowerCase().includes(term)
  );
  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    rows: matches.filter((item) => item.category === category),
  })).filter((group) => group.rows.length > 0);

  return (
    <div className="space-y-4">
      <div className="blk">
        <span className="blk-tag">Buscar</span>
        <form
          method="get"
          action="/bitacora/buscar"
          className="flex flex-wrap items-end gap-2"
        >
          <label className="cyb-muted flex min-w-[220px] flex-1 flex-col gap-1 text-xs">
            Texto
            <input
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Buscar..."
              aria-label="Texto a buscar"
              className="cyb-in"
            />
          </label>
          <label className="cyb-muted flex w-24 flex-col gap-1 text-xs">
            Año
            <input
              name="anio"
              type="number"
              defaultValue={anio}
              placeholder={String(currentYear)}
              min="2000"
              max="2100"
              inputMode="numeric"
              aria-label="Año"
              className="cyb-in"
            />
          </label>
          <label className="cyb-muted flex w-36 flex-col gap-1 text-xs">
            Mes
            <select
              name="mes"
              defaultValue={mes}
              aria-label="Mes (opcional)"
              className="cyb-in"
            >
              <option value="">Todo el año</option>
              {MONTH_NAMES.map((name, i) => (
                <option key={name} value={String(i + 1)}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="cyb-btn">
            Buscar
          </button>
        </form>

        {term.length > 0 &&
          (grouped.length > 0 ? (
            <div className="mt-5">
              <div className="blk-tag">
                Resultados · {matches.length}
                <span className="text-xs normal-case tracking-normal opacity-80">
                  {" "}
                  en {rangeLabel}
                </span>
              </div>
              <div className="mt-3 space-y-4">
                {grouped.map((group) => (
                  <div key={group.category}>
                    <div className="blk-tag">{group.category}</div>
                    <ul className="space-y-1">
                      {group.rows.map((item) => (
                        <li key={`${item.category}-${item.date}-${item.text}`}>
                          <Link
                            href={`/bitacora/${item.date}`}
                            className="cyb-link break-words"
                          >
                            <span className="cyb-muted text-sm">
                              {formatShortDate(item.date)} ·{" "}
                            </span>
                            {item.categoryName
                              ? `${item.categoryName} · `
                              : ""}
                            {item.text}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="cyb-hint mt-4 text-sm">
              Sin coincidencias para «{q.trim()}» en {rangeLabel}.
            </p>
          ))}
      </div>
    </div>
  );
}