import { redirect } from "next/navigation";
import { AnnualReminders } from "@/components/annual-reminders";
import { isAuthenticated } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { AnnualCategory, AnnualReminder } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EfemeridesPage() {
  if (!(await isAuthenticated())) redirect("/");

  const supabase = await createClient();
  const [{ data: rows }, { data: categoriesRows }] = await Promise.all([
    supabase.from("annual_reminders").select("*").order("month").order("day"),
    supabase.from("annual_categories").select("*").order("sort_order"),
  ]);

  const efemerides = (rows ?? []) as AnnualReminder[];
  const categories = (categoriesRows ?? []) as AnnualCategory[];

  return (
    <div className="space-y-4">
      <div className="blk efemeride-blk">
        <span className="blk-tag">
          Efemérides
          {efemerides.length > 0 && (
            <span className="normal-case tracking-normal text-xs opacity-80">
              {" "}
              ({efemerides.length})
            </span>
          )}
        </span>
        <p className="cyb-hint text-sm">
          Fechas que se repiten todos los años: cumpleaños, aniversarios, día
          de los enamorados. Se marcan en el calendario y aparecen en la vista
          del día, pero no se completan. Podés ordenarlas por categorías.
        </p>
        <div className="mt-3">
          <AnnualReminders
            initialReminders={efemerides}
            initialCategories={categories}
          />
        </div>
      </div>
    </div>
  );
}