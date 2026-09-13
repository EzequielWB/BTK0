import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/change-password-form";
import { CompletionSettingsForm } from "@/components/completion-settings-form";
import { NotificationSettingsForm } from "@/components/notification-settings-form";
import { NotificationToggle } from "@/components/notification-toggle";
import { ObjectiveManager } from "@/components/objective-manager";
import { TemporalGoalManager } from "@/components/temporal-goal-manager";
import { isAuthenticated } from "@/lib/session";
import { createClient, isLocalMode } from "@/lib/supabase/server";
import type { Objective, Settings, TemporalGoal } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  if (!(await isAuthenticated())) redirect("/");

  const local = isLocalMode();
  const supabase = await createClient();

  const [{ data: objectives }, { data: goals }, { data: settings }] =
    await Promise.all([
      supabase.from("objectives").select("*").order("created_at"),
      supabase.from("temporal_goals").select("*").order("start_date"),
      supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
    ]);

  return (
    <div className="space-y-8">
      {!local && (
        <div className="blk">
          <span className="blk-tag">Notificaciones</span>
          <p className="cyb-hint mb-3 text-sm">
            Al avisarte, el navegador muestra una notificación aunque la app esté
            cerrada. Requiere instalar la PWA y tener cargadas las claves VAPID.
          </p>
          <NotificationToggle />
          <div className="mt-4 border-t border-[var(--cyb-track)] pt-4">
            <NotificationSettingsForm
              daily={(settings?.notif_daily_time ?? "21:00") || "21:00"}
              reminder={(settings?.notif_reminder_time ?? "09:00") || "09:00"}
            />
          </div>
        </div>
      )}

      <ObjectiveManager objectives={(objectives ?? []) as Objective[]} />
      <TemporalGoalManager goals={(goals ?? []) as TemporalGoal[]} />
      <CompletionSettingsForm settings={(settings ?? null) as Settings | null} />
      <ChangePasswordForm />
    </div>
  );
}