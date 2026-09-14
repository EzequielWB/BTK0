"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, AUTH_DAY_COOKIE, generateSalt, hashPassword, isAuthenticated } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { isDaySectionOrder } from "@/lib/sections";
import { arNow, isValidISODate, isValidMonthDay, todayISO } from "@/lib/utils";

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

  return { success: "IDENTIDAD VERIFICADA" };
}

export async function grantSessionAction(): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("password_config")
    .select("password_hash")
    .eq("id", 1)
    .single();

  if (error || !data) {
    return { error: "No hay contraseña configurada. Revisá el seed de Supabase." };
  }

  const cookieStore = await cookies();
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  } as const;
  cookieStore.set(AUTH_COOKIE, (data as { password_hash: string }).password_hash, options);
  cookieStore.set(AUTH_DAY_COOKIE, arNow().date, options);

  return { success: "granted" };
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);
  cookieStore.delete(AUTH_DAY_COOKIE);
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
  status: "none" | "partial" | "done" | "ignored";
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

// ---------------------------------------------------------------------------
// Orden de las tarjetas de la bitácora (vista del día)
// ---------------------------------------------------------------------------

export async function reorderDaySectionsAction(
  ids: string[]
): Promise<ActionResult> {
  await requireAuth();

  const seen = new Set<string>();
  const uniqueIds: string[] = [];
  for (const raw of ids) {
    const id = String(raw).trim();
    if (id && !seen.has(id)) {
      seen.add(id);
      uniqueIds.push(id);
    }
  }
  if (!isDaySectionOrder(uniqueIds)) {
    return { error: "El orden de secciones es inválido." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("settings")
    .update({
      section_order: JSON.stringify(uniqueIds),
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  revalidatePath("/bitacora/settings");
  revalidatePath("/bitacora");

  if (error) return { error: "No se pudo guardar el orden." };
  return { success: "Orden actualizado." };
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

export async function reorderObjectivesAction(
  ids: string[]
): Promise<ActionResult> {
  await requireAuth();

  const seen = new Set<string>();
  const uniqueIds: string[] = [];
  for (const raw of ids) {
    const id = String(raw).trim();
    if (id && !seen.has(id)) {
      seen.add(id);
      uniqueIds.push(id);
    }
  }
  if (uniqueIds.length < 2) {
    return { error: "Se necesitan al menos dos objetivos para ordenar." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("objectives")
    .select("id")
    .in("id", uniqueIds);

  if (error) return { error: "No se pudo cargar los objetivos." };
  const known = new Set(
    ((data ?? []) as Array<{ id: string }>).map((row) => row.id)
  );
  const missing = uniqueIds.some((id) => !known.has(id));
  if (missing) return { error: "Algunos objetivos no existen." };

  let failure = false;
  for (let index = 0; index < uniqueIds.length; index++) {
    const res = await supabase
      .from("objectives")
      .update({ sort_order: index })
      .eq("id", uniqueIds[index]);
    if (res.error) failure = true;
  }

  revalidatePath("/bitacora/settings");
  revalidatePath("/bitacora");

  if (failure) return { error: "No se pudo guardar el nuevo orden." };
  return { success: "Orden actualizado." };
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
    .insert({ title, description, start_date, end_date, is_active: true });

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

export async function toggleTemporalGoalCompleteAction(
  id: string,
  completed: boolean
): Promise<void> {
  await requireAuth();

  const supabase = await createClient();
  await supabase
    .from("temporal_goals")
    .update({ completed_at: completed ? new Date().toISOString() : null })
    .eq("id", id);

  revalidatePath("/bitacora/settings");
  revalidatePath("/bitacora");
}

export async function deleteTemporalGoalAction(formData: FormData): Promise<void> {
  await requireAuth();

  const id = String(formData.get("id") ?? "");

  const supabase = await createClient();
  await supabase.from("temporal_goals").delete().eq("id", id);

  revalidatePath("/bitacora/settings");
}

// ---------------------------------------------------------------------------
// Objetivos del día (lista por día, se arma solo desde la vista del día)
// ---------------------------------------------------------------------------

export async function createDayGoalAction(
  date: string,
  title: string,
  id: string
): Promise<ActionResult> {
  await requireAuth();
  if (isFutureDay(date)) return { error: "Días futuros: solo lectura." };

  const text = title.trim();
  if (!text) return { error: "Escribí el objetivo del día." };

  const supabase = await createClient();
  const { error } = await supabase.from("day_goals").insert({ id, date, title: text });

  revalidatePath(`/bitacora/${date}`);

  if (error) return { error: "No se pudo agregar el objetivo del día." };
  return { success: "Objetivo del día agregado." };
}

export async function updateDayGoalAction(
  id: string,
  title: string,
  date: string
): Promise<ActionResult> {
  await requireAuth();

  const text = title.trim();
  if (!text) return { error: "Escribí el objetivo del día." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("day_goals")
    .update({ title: text })
    .eq("id", id);

  revalidatePath(`/bitacora/${date}`);

  if (error) return { error: "No se pudo actualizar el objetivo del día." };
  return { success: "Objetivo del día actualizado." };
}

export async function deleteDayGoalAction(
  id: string,
  date: string
): Promise<ActionResult> {
  await requireAuth();

  const supabase = await createClient();
  const { error } = await supabase.from("day_goals").delete().eq("id", id);

  revalidatePath(`/bitacora/${date}`);

  if (error) return { error: "No se pudo borrar el objetivo del día." };
  return { success: "Objetivo del día eliminado." };
}

export async function toggleDayGoalCompleteAction(
  id: string,
  date: string,
  completed: boolean
): Promise<ActionResult> {
  await requireAuth();

  const supabase = await createClient();
  const { error } = await supabase
    .from("day_goals")
    .update({ completed_at: completed ? new Date().toISOString() : null })
    .eq("id", id);

  revalidatePath(`/bitacora/${date}`);

  if (error) return { error: "No se pudo actualizar el objetivo del día." };
  return { success: completed ? "Objetivo del día completado." : "Objetivo del día desmarcado." };
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
  const { error: dayGoalsErr } = await supabase.from("day_goals").delete().eq("date", date);
  if (notesErr || learnErr || remErr || dayGoalsErr) failure = true;

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
  if (date < todayISO()) {
    return { error: "No se pueden agregar recordatorios a días pasados." };
  }
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
// Efemérides (fechas que se repiten todos los años) y sus categorías
// ---------------------------------------------------------------------------

function sanitizeCategoryName(name: string): string {
  return name.trim().slice(0, 40);
}

export async function createAnnualReminderAction(
  content: string,
  month: number,
  day: number,
  id: string,
  categoryId: string | null
): Promise<ActionResult> {
  await requireAuth();

  const text = content.trim();
  if (!text) return { error: "La efeméride está vacía." };
  if (!isValidMonthDay(month, day)) return { error: "La fecha no es válida." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("annual_reminders")
    .insert({ id, month, day, content: text, category_id: categoryId });

  revalidatePath("/bitacora", "layout");

  if (error) return { error: "No se pudo guardar la efeméride." };
  return { success: "Efeméride guardada." };
}

export async function updateAnnualReminderAction(
  id: string,
  content: string,
  month: number,
  day: number,
  categoryId: string | null
): Promise<ActionResult> {
  await requireAuth();

  const text = content.trim();
  if (!text) return { error: "La efeméride está vacía." };
  if (!isValidMonthDay(month, day)) return { error: "La fecha no es válida." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("annual_reminders")
    .update({ content: text, month, day, category_id: categoryId })
    .eq("id", id);

  revalidatePath("/bitacora", "layout");

  if (error) return { error: "No se pudo actualizar la efeméride." };
  return { success: "Efeméride actualizada." };
}

export async function deleteAnnualReminderAction(id: string): Promise<ActionResult> {
  await requireAuth();

  const supabase = await createClient();
  const { error } = await supabase
    .from("annual_reminders")
    .delete()
    .eq("id", id);

  revalidatePath("/bitacora", "layout");

  if (error) return { error: "No se pudo borrar la efeméride." };
  return { success: "Efeméride eliminada." };
}

export async function createAnnualCategoryAction(name: string): Promise<ActionResult> {
  await requireAuth();

  const text = sanitizeCategoryName(name);
  if (!text) return { error: "Escribí el nombre de la categoría." };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("annual_categories")
    .select("id")
    .ilike("name", text);

  if (((existing as Array<{ id: string }> | null)?.length ?? 0) > 0) {
    return { error: "Ya existe esa categoría." };
  }

  const { data: last } = await supabase
    .from("annual_categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = ((last as { sort_order: number } | null)?.sort_order ?? -1) + 1;

  const { error } = await supabase
    .from("annual_categories")
    .insert({ name: text, sort_order: sortOrder });

  revalidatePath("/bitacora", "layout");

  if (error) return { error: "No se pudo crear la categoría." };
  return { success: "Categoría creada." };
}

export async function updateAnnualCategoryAction(
  id: string,
  name: string
): Promise<ActionResult> {
  await requireAuth();

  const text = sanitizeCategoryName(name);
  if (!text) return { error: "El nombre de la categoría está vacío." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("annual_categories")
    .update({ name: text })
    .eq("id", id);

  revalidatePath("/bitacora", "layout");

  if (error) return { error: "No se pudo renombrar la categoría." };
  return { success: "Categoría renombrada." };
}

export async function moveAnnualCategoryAction(
  id: string,
  direction: "up" | "down"
): Promise<ActionResult> {
  await requireAuth();

  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("annual_categories")
    .select("*")
    .order("sort_order", { ascending: true });

  const list = (categories ?? []) as {
    id: string;
    sort_order: number;
  }[];
  const index = list.findIndex((c) => c.id === id);
  if (index < 0) return { error: "Categoría no encontrada." };

  const neighborIndex = direction === "up" ? index - 1 : index + 1;
  if (neighborIndex < 0 || neighborIndex >= list.length) {
    return { error: "No se puede mover más en esa dirección." };
  }

  // Swap de sort_order contra el vecino (tiro doble: asegurado en ambas filas).
  await supabase
    .from("annual_categories")
    .update({ sort_order: list[neighborIndex].sort_order })
    .eq("id", list[index].id);
  const { error } = await supabase
    .from("annual_categories")
    .update({ sort_order: list[index].sort_order })
    .eq("id", list[neighborIndex].id);

  revalidatePath("/bitacora", "layout");

  if (error) return { error: "No se pudo reordenar la categoría." };
  return { success: "Categoría reordenada." };
}

export async function deleteAnnualCategoryAction(id: string): Promise<ActionResult> {
  await requireAuth();

  const supabase = await createClient();
  // Las efemérides de la categoría pasan a "sin separar" (catálogo en NULL).
  await supabase
    .from("annual_reminders")
    .update({ category_id: null })
    .eq("category_id", id);

  const { error } = await supabase.from("annual_categories").delete().eq("id", id);

  revalidatePath("/bitacora", "layout");

  if (error) return { error: "No se pudo borrar la categoría." };
  return { success: "Categoría eliminada." };
}

// ---------------------------------------------------------------------------
// La Hoja (pensamientos del día): una fila por día; al quedar vacía se borra
// ---------------------------------------------------------------------------

export async function saveJournalAction(
  date: string,
  content: string
): Promise<ActionResult> {
  await requireAuth();
  if (!isValidISODate(date)) return { error: "La fecha es inválida." };

  const text = content.trim();
  const supabase = await createClient();

  if (!text) {
    const { error } = await supabase.from("journal").delete().eq("date", date);
    revalidatePath(`/bitacora/${date}`);
    if (error) return { error: "No se pudo limpiar la hoja." };
    return { success: "Hoja limpia." };
  }

  const { error } = await supabase
    .from("journal")
    .upsert(
      { date, content: text, updated_at: new Date().toISOString() },
      { onConflict: "date" }
    );

  revalidatePath(`/bitacora/${date}`);

  if (error) return { error: "No se pudo guardar la hoja." };
  return { success: "Hoja guardada." };
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
// Cuaderno (anotador libre): categorías → ítems de texto plano
// ---------------------------------------------------------------------------

export async function createAgendaCategoryAction(
  name: string,
  id: string
): Promise<ActionResult> {
  await requireAuth();

  const text = sanitizeCategoryName(name);
  if (!text) return { error: "Escribí el nombre de la categoría." };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("agenda_categories")
    .select("id")
    .ilike("name", text);

  if (((existing as Array<{ id: string }> | null)?.length ?? 0) > 0) {
    return { error: "Ya existe una categoría con ese nombre." };
  }

  const { data: last } = await supabase
    .from("agenda_categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = ((last as { sort_order: number } | null)?.sort_order ?? -1) + 1;

  const { error } = await supabase
    .from("agenda_categories")
    .insert({ id, name: text, sort_order: sortOrder });

  revalidatePath("/bitacora/agenda");

  if (error) return { error: "No se pudo crear la categoría." };
  return { success: "Categoría creada." };
}

export async function renameAgendaCategoryAction(
  id: string,
  name: string
): Promise<ActionResult> {
  await requireAuth();

  const text = sanitizeCategoryName(name);
  if (!text) return { error: "El nombre de la categoría está vacío." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("agenda_categories")
    .update({ name: text })
    .eq("id", id);

  revalidatePath("/bitacora/agenda");

  if (error) return { error: "No se pudo renombrar la categoría." };
  return { success: "Categoría renombrada." };
}

export async function moveAgendaCategoryAction(
  id: string,
  direction: "up" | "down"
): Promise<ActionResult> {
  await requireAuth();

  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("agenda_categories")
    .select("*")
    .order("sort_order", { ascending: true });

  const list = (categories ?? []) as { id: string; sort_order: number }[];
  const index = list.findIndex((c) => c.id === id);
  if (index < 0) return { error: "Categoría no encontrada." };

  const neighborIndex = direction === "up" ? index - 1 : index + 1;
  if (neighborIndex < 0 || neighborIndex >= list.length) {
    return { error: "No se puede mover más en esa dirección." };
  }

  await supabase
    .from("agenda_categories")
    .update({ sort_order: list[neighborIndex].sort_order })
    .eq("id", list[index].id);
  const { error } = await supabase
    .from("agenda_categories")
    .update({ sort_order: list[index].sort_order })
    .eq("id", list[neighborIndex].id);

  revalidatePath("/bitacora/agenda");

  if (error) return { error: "No se pudo reordenar la categoría." };
  return { success: "Categoría reordenada." };
}

export async function deleteAgendaCategoryAction(id: string): Promise<ActionResult> {
  await requireAuth();

  const supabase = await createClient();
  // Los ítems se borran en cascada (FK on delete cascade).
  const { error } = await supabase.from("agenda_categories").delete().eq("id", id);

  revalidatePath("/bitacora/agenda");

  if (error) return { error: "No se pudo borrar la categoría." };
  return { success: "Categoría eliminada." };
}

export async function createAgendaItemAction(
  categoryId: string,
  title: string,
  content: string,
  id: string
): Promise<ActionResult> {
  await requireAuth();

  const itemTitle = title.trim();
  if (!itemTitle) return { error: "El título del ítem está vacío." };

  const supabase = await createClient();
  const { error } = await supabase.from("agenda_items").insert({
    id,
    category_id: categoryId,
    title: itemTitle,
    content: content.trim(),
    updated_at: new Date().toISOString(),
  });

  revalidatePath("/bitacora/agenda");

  if (error) return { error: "No se pudo guardar el ítem." };
  return { success: "Ítem agregado." };
}

export async function updateAgendaItemAction(
  id: string,
  title: string,
  content: string
): Promise<ActionResult> {
  await requireAuth();

  const itemTitle = title.trim();
  if (!itemTitle) return { error: "El título del ítem está vacío." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("agenda_items")
    .update({ title: itemTitle, content: content.trim(), updated_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/bitacora/agenda");

  if (error) return { error: "No se pudo actualizar el ítem." };
  return { success: "Ítem actualizado." };
}

export async function deleteAgendaItemAction(id: string): Promise<ActionResult> {
  await requireAuth();

  const supabase = await createClient();
  const { error } = await supabase.from("agenda_items").delete().eq("id", id);

  revalidatePath("/bitacora/agenda");

  if (error) return { error: "No se pudo borrar el ítem." };
  return { success: "Ítem eliminado." };
}