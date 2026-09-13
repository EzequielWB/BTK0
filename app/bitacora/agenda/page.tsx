import { redirect } from "next/navigation";
import { AgendaManager } from "@/components/agenda-manager";
import { isAuthenticated } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { AgendaCategory, AgendaItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  if (!(await isAuthenticated())) redirect("/");

  const supabase = await createClient();
  const [{ data: categoryRows }, { data: itemRows }] = await Promise.all([
    supabase.from("agenda_categories").select("*").order("sort_order"),
    supabase.from("agenda_items").select("*").order("created_at"),
  ]);

  const categories = (categoryRows ?? []) as AgendaCategory[];
  const items = (itemRows ?? []) as AgendaItem[];

  return (
    <div className="space-y-4">
      <div className="blk">
        <span className="blk-tag">
          Cuaderno
          {categories.length > 0 && (
            <span className="normal-case tracking-normal text-xs opacity-80">
              {" "}
              ({categories.length})
            </span>
          )}
        </span>
        <div className="mt-3">
          <AgendaManager initialCategories={categories} initialItems={items} />
        </div>
      </div>
    </div>
  );
}