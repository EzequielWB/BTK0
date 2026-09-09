"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, generateSalt, hashPassword, isAuthenticated } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { isValidISODate, todayISO } from "@/lib/utils";
import { sendPush, testPushPayload } from "@/lib/push";
import type { StoredSubscription } from "@/lib/push-client";

export type ActionResult = { error?: string; success?: string };

async function requireAuth(): Promise<void> {
  if (!(await isAuthenticated())) {
    redirect("/");
  }
}

/** Días que todavía no llegaron: solo lectura. Devuelve true si está bloqueado. */
function isFutureDay(date: string): boolean {
  return isValidISODate(date) && date > todayISO();
}

// ---------------------------------------------------------------------------
// Autenticación
// ---------------------------------------------------------------------------

export async function loginAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("password_config")
    .select("salt, password_hash")
    .eq("id", 1)
    .single();

  if (error || !data) {
    return { error: "No hay contraseña configurada. Revisá el seed de Supabase." };
  }

  const { salt, password_hash } = data as { salt: string; password_hash: string };
  if (hashPassword(password, salt) !== password_hash) {
    return { error: "Contraseña incorrecta" };
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, password_hash, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/bitacora");
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);
  redirect("/");
}

export async function changePasswordAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAuth();

  const current = String(formData.get("current_password") ?? "");
  const next = String(formData.get("new_password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (next.length < 6) {
    return { error: "La nueva contraseña debe tener al menos 6 caracteres." };
  }
  if (next !== confirm) {
    return { error: "Las contraseñas nuevas no coinciden." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("password_config")
    .select("salt, password_hash")
    .eq("id", 1)
    .single();

  if (error || !data) {
    return { error: "No hay configuración de contraseña." };
  }
  const { salt: currentSalt, password_hash } = data as {
    salt: string;
    password_hash: string;
  };
  if (hashPassword(current, currentSalt) !== password_hash) {
    return { error: "La contraseña actual es incorrecta." };
  }

  const newSalt = generateSalt();
  await supabase
    .from("password_config")
    .update({
      salt: newSalt,
      password_hash: hashPassword(next, newSalt),
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);

  return { success: "Contraseña actualizada. Volvé a iniciar sesión con la nueva." };
}

// ---------------------------------------------------------------------------
// Días / notas
// ---------------------------------------------------------------------------

export async function addNoteAction(
  date: string,
  content: string,
  id: string
): Promise<ActionResult> {
  await requireAuth();
  if (isFutureDay(date)) return { error: "Días futuros: solo lectura." };

  const text = content.trim();
  if (!text) return { error: "La nota está vacía." };

  const supabase = await createClient();
  const { error } = await supabase.from("notes").insert({ id, date, content: text });

  revalidatePath(`/bitacora/${date}`);

  if (error) return { error: "No se pudo agregar la nota." };
  return { success: "Nota agregada" };
}

export async function deleteNoteAction(
  noteId: string,
  date: string
): Promise<ActionResult> {
  await requireAuth();

  const supabase = await createClient();
  const { error } = await supabase.from("notes").delete().eq("id", noteId);

  revalidatePath(`/bitacora/${date}`);

  if (error) return { error: "No se pudo borrar la nota." };
  return { success: "Nota eliminada" };
}

export async function addLearningAction(
  date: string,
  content: string,
  id: string
): Promise<ActionResult> {
  await requireAuth();
  if (isFutureDay(date)) return { error: "Días futuros: solo lectura." };

  const text = content.trim();
  if (!text) return { error: "El aprendizaje está vacío." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("learnings")
    .insert({ id, date, content: text });

  revalidatePath(`/bitacora/${date}`);

  if (error) return { error: "No se pudo agregar el aprendizaje." };
  return { success: "Aprendizaje agregado" };
}

export async function deleteLearningAction(
  learningId: string,
  date: string
): Promise<ActionResult> {
  await requireAuth();

  const supabase = await createClient();
  const { error } = await supabase
    .from("learnings")
    .delete()
    .eq("id", learningId);

  revalidatePath(`/bitacora/${date}`);

  if (error) return { error: "No se pudo borrar el aprendizaje." };
  return { success: "Aprendizaje eliminado" };
}

// ---------------------------------------------------------------------------
// Objetivos diarios (checklist)
// ---------------------------------------------------------------------------

export async function setDailyObjectiveStatusAction(args: {
  date: string;
  objectiveId: string;
  status: "none" | "partial" | "done";
}): Promise<void> {
  await requireAuth();

  const { date, objectiveId, status } = args;
  if (isFutureDay(date)) return;

  const supabase = await createClient();

  const { data: day } = await supabase
    .from("days")
    .select("id")
    .eq("date", date)
    .maybeSingle();

  let dayId: string;
  if (day) {
    dayId = (day as { id: string }).id;
  } else {
    const { data: created, error: insertError } = await supabase
      .from("days")
      .insert({ date })
      .select("id")
      .single();
    if (insertError || !created) return;
    dayId = (created as { id: string }).id;
  }

  const { data: existing } = await supabase
    .from("daily_objectives")
    .select("id")
    .eq("day_id", dayId)
    .eq("objective_id", objectiveId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("daily_objectives")
      .update({ status })
      .eq("id", (existing as { id: string }).id);
  } else {
    await supabase
      .from("daily_objectives")
      .insert({ day_id: dayId, objective_id: objectiveId, status });
  }

  revalidatePath(`/bitacora/${date}`);
}

// ---------------------------------------------------------------------------
// CRUD objetivos generales
// ---------------------------------------------------------------------------

export async function createObjectiveAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAuth();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!title) return { error: "El título es obligatorio." };

  const supabase = await createClient();
  const { error } = await supabase.from("objectives").insert({ title, description });

  revalidatePath("/bitacora/settings");

  if (error) return { error: "No se pudo crear el objetivo." };
  return { success: "Objetivo creado." };
}

export async function updateObjectiveAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAuth();

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!title) return { error: "El título es obligatorio." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("objectives")
    .update({ title, description })
    .eq("id", id);

  revalidatePath("/bitacora/settings");

  if (error) return { error: "No se pudo actualizar el objetivo." };
  return { success: "Objetivo actualizado." };
}

// ---------------------------------------------------------------------------
// Ajustes (marcado de días cumplidos en el calendario)
// ---------------------------------------------------------------------------

export async function saveSettingsAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAuth();

  const mode = String(formData.get("mode") ?? "off");
  const threshold = Number(formData.get("threshold") ?? "1");

  if (!["off", "count", "percent"].includes(mode)) {
    return { error: "Modo inválido." };
  }
  if (!Number.isInteger(threshold) || threshold < 1 || threshold > 100) {
    return { error: "El valor debe ser un número entero entre 1 y 100." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("settings")
    .update({
      completion_mode: mode,
      threshold,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) return { error: "No se pudieron guardar los ajustes." };

  revalidatePath("/bitacora/settings");
  revalidatePath("/bitacora");

  return { success: "Ajustes guardados." };
}

export async function toggleObjectiveActiveAction(formData: FormData): Promise<void> {
  await requireAuth();

  const id = String(formData.get("id") ?? "");
  const isActive = formData.get("is_active") === "true";

  const supabase = await createClient();
  await supabase.from("objectives").update({ is_active: isActive }).eq("id", id);

  revalidatePath("/bitacora/settings");
}

export async function deleteObjectiveAction(formData: FormData): Promise<void> {
  await requireAuth();

  const id = String(formData.get("id") ?? "");

  const supabase = await createClient();
  await supabase.from("objectives").delete().eq("id", id);

  revalidatePath("/bitacora/settings");
}

// ---------------------------------------------------------------------------
// CRUD metas temporales
// ---------------------------------------------------------------------------

export async function createTemporalGoalAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAuth();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const start_date = String(formData.get("start_date") ?? "");
  const end_date = String(formData.get("end_date") ?? "");

  if (!title) return { error: "El título es obligatorio." };
  if (!start_date || !end_date) {
    return { error: "Indicá fecha de inicio y fin." };
  }
  if (end_date < start_date) {
    return { error: "La fecha de fin debe ser igual o posterior a la de inicio." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("temporal_goals")
    .insert({ title, description, start_date, end_date });

  revalidatePath("/bitacora/settings");

  if (error) return { error: "No se pudo crear la meta." };
  return { success: "Meta temporal creada." };
}

export async function updateTemporalGoalAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAuth();

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const start_date = String(formData.get("start_date") ?? "");
  const end_date = String(formData.get("end_date") ?? "");

  if (!title) return { error: "El título es obligatorio." };
  if (!start_date || !end_date) {
    return { error: "Indicá fecha de inicio y fin." };
  }
  if (end_date < start_date) {
    return { error: "La fecha de fin debe ser igual o posterior a la de inicio." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("temporal_goals")
    .update({ title, description, start_date, end_date })
    .eq("id", id);

  revalidatePath("/bitacora/settings");

  if (error) return { error: "No se pudo actualizar la meta." };
  return { success: "Meta actualizada." };
}

export async function toggleTemporalGoalActiveAction(formData: FormData): Promise<void> {
  await requireAuth();

  const id = String(formData.get("id") ?? "");
  const isActive = formData.get("is_active") === "true";

  const supabase = await createClient();
  await supabase.from("temporal_goals").update({ is_active: isActive }).eq("id", id);

  revalidatePath("/bitacora/settings");
}

export async function deleteTemporalGoalAction(formData: FormData): Promise<void> {
  await requireAuth();

  const id = String(formData.get("id") ?? "");

  const supabase = await createClient();
  await supabase.from("temporal_goals").delete().eq("id", id);

  revalidatePath("/bitacora/settings");
}

// ---------------------------------------------------------------------------
// Borrado total de un día (triple tap en el calendario)
// ---------------------------------------------------------------------------

export async function deleteDayDataAction(date: string): Promise<ActionResult> {
  await requireAuth();
  if (!isValidISODate(date)) return { error: "La fecha es inválida." };
  if (date > todayISO()) return { error: "Días futuros: solo lectura." };

  const supabase = await createClient();

  const { data: day, error: dayError } = await supabase
    .from("days")
    .select("id")
    .eq("date", date)
    .maybeSingle();

  if (dayError) return { error: "No se pudo borrar el día." };
  const dayId = day ? (day as { id: string }).id : null;

  let failure = false;
  const { error: notesErr } = await supabase.from("notes").delete().eq("date", date);
  const { error: learnErr } = await supabase.from("learnings").delete().eq("date", date);
  const { error: remErr } = await supabase.from("reminders").delete().eq("date", date);
  if (notesErr || learnErr || remErr) failure = true;

  if (dayId) {
    const { error: dailyErr } = await supabase
      .from("daily_objectives")
      .delete()
      .eq("day_id", dayId);
    const { error: dayErr } = await supabase.from("days").delete().eq("id", dayId);
    if (dailyErr || dayErr) failure = true;
  }

  if (failure) return { error: "No se pudo borrar todo el día." };

  revalidatePath(`/bitacora/${date}`);
  revalidatePath("/bitacora");
  return { success: "Día borrado." };
}

// ---------------------------------------------------------------------------
// Recordatorios (recuerdos atados a una fecha)
// ---------------------------------------------------------------------------

export async function createReminderAction(
  date: string,
  content: string,
  id: string
): Promise<ActionResult> {
  await requireAuth();

  if (!isValidISODate(date)) return { error: "La fecha es inválida." };
  const text = content.trim();
  if (!text) return { error: "El recordatorio está vacío." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("reminders")
    .insert({ id, date, content: text });

  revalidatePath(`/bitacora/${date}`);

  if (error) return { error: "No se pudo guardar el recordatorio." };
  return { success: "Recordatorio guardado." };
}

export async function updateReminderAction(
  id: string,
  content: string,
  date: string
): Promise<ActionResult> {
  await requireAuth();

  const text = content.trim();
  if (!text) return { error: "El recordatorio está vacío." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("reminders")
    .update({ content: text })
    .eq("id", id);

  revalidatePath(`/bitacora/${date}`);

  if (error) return { error: "No se pudo actualizar el recordatorio." };
  return { success: "Recordatorio actualizado." };
}

export async function deleteReminderAction(
  id: string,
  date: string
): Promise<ActionResult> {
  await requireAuth();

  const supabase = await createClient();
  const { error } = await supabase.from("reminders").delete().eq("id", id);

  revalidatePath(`/bitacora/${date}`);

  if (error) return { error: "No se pudo borrar el recordatorio." };
  return { success: "Recordatorio eliminado." };
}

export async function toggleReminderCompleteAction(
  id: string,
  date: string,
  completed: boolean
): Promise<ActionResult> {
  await requireAuth();

  const supabase = await createClient();
  const { error } = await supabase
    .from("reminders")
    .update({ completed_at: completed ? new Date().toISOString() : null })
    .eq("id", id);

  revalidatePath(`/bitacora/${date}`);

  if (error) return { error: "No se pudo actualizar el recordatorio." };
  return { success: completed ? "Recordatorio completado." : "Recordatorio desmarcado." };
}

// ---------------------------------------------------------------------------
// Días destacados (anillo dorado en el calendario)
// ---------------------------------------------------------------------------

export async function toggleDayFlagAction(date: string): Promise<ActionResult> {
  await requireAuth();
  if (!isValidISODate(date)) return { error: "La fecha es inválida." };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("day_flags")
    .select("date")
    .eq("date", date)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("day_flags").delete().eq("date", date);
    if (error) return { error: "No se pudo quitar el destacado." };
  } else {
    const { error } = await supabase.from("day_flags").insert({ date });
    if (error) return { error: "No se pudo destacar el día." };
  }

  revalidatePath(`/bitacora/${date}`);
  revalidatePath("/bitacora");
  return { success: existing ? "Destacado quitado." : "Día destacado." };
}

// ---------------------------------------------------------------------------
// Notificaciones push
// ---------------------------------------------------------------------------

export async function savePushSubscriptionAction(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<ActionResult> {
  await requireAuth();

  if (!subscription.endpoint) {
    return { error: "La suscripción no es válida." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        endpoint: subscription.endpoint,
        keys_p256dh: subscription.keys.p256dh ?? "",
        keys_auth: subscription.keys.auth ?? "",
      },
      { onConflict: "endpoint" }
    );

  if (error) return { error: "No se pudo guardar la suscripción." };
  return { success: "Notificaciones activadas." };
}

export async function deletePushSubscriptionAction(
  endpoint: string
): Promise<ActionResult> {
  await requireAuth();

  const supabase = await createClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);

  if (error) return { error: "No se pudo desactivar la suscripción." };
  return { success: "Notificaciones desactivadas." };
}

export async function sendTestPushAction(
  subscription: StoredSubscription
): Promise<ActionResult> {
  await requireAuth();

  if (!subscription.endpoint) {
    return { error: "La suscripción no es válida." };
  }

  const result = await sendPush(subscription, testPushPayload());
  if (!result.ok) {
    return {
      error: result.statusCode
        ? `El push de prueba falló (HTTP ${result.statusCode}).`
        : "VAPID no está configurado en el servidor.",
    };
  }
  return { success: "Push de prueba enviado." };
}