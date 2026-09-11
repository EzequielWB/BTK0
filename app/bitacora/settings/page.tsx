import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/change-password-form";
import { CompletionSettingsForm } from "@/components/completion-settings-form";
import { ObjectiveManager } from "@/components/objective-manager";
import { TemporalGoalManager } from "@/components/temporal-goal-manager";
import { isAuthenticated } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Objective, Settings, TemporalGoal } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  if (!(await isAuthenticated())) redirect("/");

  const supabase = await createClient();

  const [{ data: objectives }, { data: goals }, { data: settings }] =
    await Promise.all([
      supabase.from("objectives").select("*").order("created_at"),
      supabase.from("temporal_goals").select("*").order("start_date"),
      supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
    ]);

  return (
    <div className="space-y-8">
      <ObjectiveManager objectives={(objectives ?? []) as Objective[]} />
      <TemporalGoalManager goals={(goals ?? []) as TemporalGoal[]} />
      <CompletionSettingsForm settings={(settings ?? null) as Settings | null} />
      <ChangePasswordForm />
    </div>
  );
}