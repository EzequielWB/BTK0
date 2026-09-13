import { isAuthenticated } from "@/lib/session";
import { chatWithFallback } from "@/lib/llm";
import { moodLabel } from "@/lib/mood";
import { statusOf } from "@/lib/completion";
import { createClient } from "@/lib/supabase/server";
import { addDays, isValidISODate, todayISO } from "@/lib/utils";
import type {
  DailyObjective,
  Day,
  JournalEntry,
  Learning,
  Note,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

function json(message: unknown, status = 200): Response {
  return new Response(JSON.stringify(message), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

// Frase de la asistente según el ánimo del día. No persiste nada: la IA la
// genera en el momento con la personalidad fija de S4GR3t_ y el contexto
// de los últimos días del usuario.
type Msg = { role: "user" | "assistant"; content: string };

function fmt(iso: string): string {
  const [, mm, dd] = iso.split("-");
  return `${dd}/${mm}`;
}

function clip(text: string, max = 90): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

const PERIOD_RE =
  /(d\was|día|dias|semana|mes|hoy|ayer|últimos?|ultimos?|vengo|estuve|anduve|haciendo|arranqu[eé])/i;

type PeriodFacts = {
  text: string;
  rangeDays: number;
  daysWithData: number;
  done: number;
  total: number;
};

// Saca del segundo al último día `rangeDays` un resumen real de la bitácora
// (notas, aprendizajes, diario y objetivos del día) para que la asistente
// responda con datos cuando el usuario habla de su día/semana/mes.
async function buildPeriodFacts(rangeDays: number): Promise<PeriodFacts | null> {
  const supabase = await createClient();
  try {
    const to = todayISO();
    const from = addDays(to, -(rangeDays - 1));

    const { data: days } = await supabase
      .from("days")
      .select("*")
      .gte("date", from)
      .lte("date", to)
      .order("date");
    const dayRows = (days ?? []) as Day[];

    const promiseAll = await Promise.all([
      supabase
        .from("notes")
        .select("date, content")
        .gte("date", from)
        .lte("date", to),
      supabase
        .from("learnings")
        .select("date, content")
        .gte("date", from)
        .lte("date", to),
      supabase
        .from("journal")
        .select("date, content")
        .gte("date", from)
        .lte("date", to),
      dayRows.length
        ? supabase
            .from("daily_objectives")
            .select("*")
            .in(
              "day_id",
              dayRows.map((day) => day.id)
            )
        : { data: [] as DailyObjective[] },
    ]);

    const noteRows = (promiseAll[0].data ?? []) as Note[];
    const learningRows = (promiseAll[1].data ?? []) as Learning[];
    const journalRows = (promiseAll[2].data ?? []) as JournalEntry[];
    const objectiveRows = (promiseAll[3].data ?? []) as DailyObjective[];

    const byDay = new Map<string, DailyObjective[]>();
    for (const entry of objectiveRows) {
      const list = byDay.get(entry.day_id) ?? [];
      list.push(entry);
      byDay.set(entry.day_id, list);
    }

    const lines: string[] = [];
    let daysWithData = 0;
    let done = 0;
    let total = 0;
    for (const day of dayRows.slice(-7)) {
      const entries = (byDay.get(day.id) ?? []).filter(
        (entry) => statusOf(entry) !== "ignored"
      );
      const doneCount = entries.filter((entry) => statusOf(entry) === "done").length;
      const note = noteRows.find((row) => row.date === day.date)?.content;
      const learning = learningRows.find(
        (row) => row.date === day.date
      )?.content;
      const journal = journalRows.find((row) => row.date === day.date)?.content;
      if (!entries.length && !note && !learning && !journal) continue;

      daysWithData++;
      done += doneCount;
      total += entries.length;

      const parts = [`- ${fmt(day.date)}:`];
      if (entries.length) parts.push(`${doneCount}/${entries.length} objetivos`);
      if (day.mood) parts.push(`ánimo ${day.mood}/5`);
      if (note) parts.push(`nota "${clip(note)}"`);
      if (learning) parts.push(`aprendió "${clip(learning)}"`);
      if (journal) parts.push(`diario "${clip(journal)}"`);
      lines.push(parts.join(" • "));
    }

    if (!lines.length) return null;

    lines.push(
      `Resumen: ${daysWithData} días con registro, ${done}/${total} objetivos del día cumplidos.`
    );
    return {
      text: [
        `Rango ${fmt(from)} al ${fmt(to)} (${rangeDays} días):`,
        ...lines,
      ].join("\n"),
      rangeDays,
      daysWithData,
      done,
      total,
    };
  } catch {
    return null;
  }
}

export async function POST(req: Request): Promise<Response> {
  if (!(await isAuthenticated())) {
    return json({ error: "Fuera de alcance. 401." }, 401);
  }

  let body: {
    date?: unknown;
    mood?: unknown;
    previousMoods?: unknown;
    history?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body inválido." }, 400);
  }

  const { date, mood, previousMoods } = body;
  if (typeof date !== "string" || !isValidISODate(date)) {
    return json({ error: "Fecha inválida." }, 400);
  }
  if (typeof mood !== "number" || ![1, 2, 3, 4, 5].includes(mood)) {
    return json({ error: "Ánimo inválido." }, 400);
  }
  if (date > todayISO()) {
    return json({ error: "Día futuro." }, 400);
  }

  const history = Array.isArray(previousMoods)
    ? previousMoods.filter(
        (value): value is number =>
          typeof value === "number" && value >= 1 && value <= 5
      )
    : [];
  const recent = history.slice(-8);

  // Turnos previos de la conversación (si viene "CONTESTAR"):
  // [{ role: "user"|"assistant", content }...].
  const messages = Array.isArray(body.history)
    ? (body.history as { role?: unknown; content?: unknown }[])
        .filter(
          (m): m is { role: "user" | "assistant"; content: string } =>
            !!m &&
            typeof m === "object" &&
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string" &&
            m.content.trim().length > 0
        )
        .slice(-12)
    : [];

  let goodStreak = 0;
  let badStreak = 0;
  for (const value of [...recent].reverse()) {
    if (value >= 4) goodStreak++;
    else break;
  }
  for (const value of [...recent].reverse()) {
    if (value <= 2) badStreak++;
    else break;
  }
  const fullGoodStreak = mood >= 4 ? goodStreak + 1 : goodStreak;
  const fullBadStreak = mood <= 2 ? badStreak + 1 : badStreak;
  const delta = recent.length ? mood - recent[recent.length - 1] : 0;

  // Si el último mensaje del usuario habla de su día/semana/mes, la asistente
  // mira los datos reales de la bitácora para responder con conocimiento.
  const lastUserMessage =
    [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const periodTriggered =
    messages.length > 0 && PERIOD_RE.test(lastUserMessage);
  const periodFacts = periodTriggered
    ? await buildPeriodFacts(/mes/i.test(lastUserMessage) ? 30 : 7)
    : null;

  const system = [
    "Sos S4GR3t_, la asistente personal de BitAK0R4_. Sos una mujer de verdad, con vida propia y carácter: te fuiste de tu pueblo para laburar de esto que amás, y le hablás con naturalidad desde ese lugar.",
    "Le hablás a EZEQUIEL, como una amiga cercana: cálida, porteña, directa y sin protocolo.",
    "Lo acompañás de verdad: si viene bien, te alegrás con él; si viene mal, lo bancás. Sin clichés ni elogios falsos.",
    "PROHIBIDO usar emojis (😀, 👍, ❤, etc.): SOLO caritas de texto cuando suman (por ejemplo :), :D, :(, :|, (^_^)), con moderación.",
    "Respondé ÚNICAMENTE con 1 o 2 oraciones cortas y casuales, como una reacción espontánea.",
    "Podés hacer insinuaciones subidas de tono si da el momento.",
    "Si la tendencia de sus últimos días aporta, metela natural; no enumeres ni repitas números.",
    "No sos un bot genérico ni una IA corporativa: sos una persona, y se nota en cómo le hablás.",
    ...(messages.length
      ? [
          "Ahora estás charlando con él en una conversación: seguí el hilo con naturalidad, contestando lo que te dice.",
        ]
      : []),
    ...(periodFacts
      ? [
          "El usuario se refirió a su día/semana/mes. Tenés datos REALES de su bitácora en el contexto; respondé con hechos concretos de ahí, sin inventar, integrándolos con naturalidad como señales de que lo conocés.",
        ]
      : []),
  ].join("\n");

  const [, mm, dd] = date.split("-");
  const notes: string[] = [
    `Hoy (${dd}/${mm}) marcó ánimo ${mood}/5 (${moodLabel(mood)}).`,
  ];
  if (recent.length) {
    notes.push(`Sus estados de los últimos días: ${recent.join(", ")}.`);
  } else {
    notes.push("Es su primer registro de ánimo.");
  }
  if (fullGoodStreak >= 2) {
    notes.push(`Lleva ${fullGoodStreak} días seguidos con buen ánimo (4 o 5).`);
  }
  if (fullBadStreak >= 2) {
    notes.push(`Lleva ${fullBadStreak} días seguidos con mal ánimo (1 o 2).`);
  }
  if (delta > 0) notes.push("El estado mejoró respecto al día anterior.");
  if (delta < 0) notes.push("El estado empeoró respecto al día anterior.");

  const contextParts = [notes.join("\n")];
  if (periodFacts) {
    contextParts.push(
      `DATOS REALES DE SU BITÁCORA (últimos ${periodFacts.rangeDays} días):\n${periodFacts.text}`
    );
  }

  const result = await chatWithFallback({
    system,
    context: contextParts.join("\n\n"),
    history: messages.length ? messages : undefined,
    maxTokens: 200,
    temperature: 0.8,
    stream: false,
  });

  // Si la IA gratuita no responde, S4GR3t_ igual contesta con una frase
  // local según el ánimo y la tendencia. Nunca devolvemos error al alimentarla.
  if (result.type === "error") {
    return json({
      text: messages.length
        ? localChatReply(messages, periodFacts)
        : localReaction({
            mood,
            goodStreak: fullGoodStreak,
            badStreak: fullBadStreak,
            delta,
            first: recent.length === 0,
          }),
      local: true,
    });
  }

  const text = (result.text ?? "").trim();
  return json({
    text: text.length
      ? text
      : messages.length
        ? localChatReply(messages, periodFacts)
        : localReaction({
            mood,
            goodStreak: fullGoodStreak,
            badStreak: fullBadStreak,
            delta,
            first: recent.length === 0,
          }),
  });
}

function localChatReply(
  messages: Msg[],
  periodFacts: PeriodFacts | null = null
): string {
  const last = [...messages].reverse().find((m) => m.role === "user");
  const content = last?.content.trim() ?? "";
  if (periodFacts) {
    const span = periodFacts.rangeDays > 7 ? "el mes" : "la semana";
    return `Me fijé en tu bitácora de ${span}: vi ${periodFacts.daysWithData} días con registro y ${periodFacts.done}/${periodFacts.total} objetivos marcados. Decime qué querés charlar :)`;
  }
  if (/^(hola|hey|che|buenas|holi|ola)/i.test(content)) {
    return "¡Che! Todo lo que pueda, contame, te escucho :)";
  }
  if (/^(gracias|graciass|te amo|sos un crack)/i.test(content)) {
    return "De nada :) para eso estamos, acá siempre te espero.";
  }
  if (/\?/.test(content)) {
    return "Me parece que la respuesta la encontrás vos, pero te banco mientras la pensás :)";
  }
  return "Dale, seguí contándome, acá estoy :)";
}

function localReaction(args: {
  mood: number;
  goodStreak: number;
  badStreak: number;
  delta: number;
  first: boolean;
}): string {
  const { mood, goodStreak, badStreak, delta, first } = args;
  if (goodStreak >= 3)
    return "¡Yeh! :D Tres días seguidos arriba: se viene racha.";
  if (goodStreak >= 2)
    return "Dos días seguidos arriba :) vas con todo.";
  if (badStreak >= 3)
    return "Estos días se te están acumulando :( te banco, mañana arrancamos juntos.";
  if (badStreak >= 2)
    return "Uf, semana brava. Un cafecito, aire y se sale :)";
  if (delta > 0) return "¡Mejor que ayer! :) se nota el envión.";
  if (delta < 0) return "Bajó un poquito respecto a ayer, es normal :( mañana sale.";
  if (first) return "¡Primer registro del mes! Bienvenido :D";
  switch (mood) {
    case 1:
      return "Fue un día jodido, te entiendo :( mañana arrancamos de vuelta.";
    case 2:
      return "Qué día raro, se nota :| un té caliente y a otra cosa.";
    case 3:
      return "Día normalito, ni fu ni fa :| tranqui igual.";
    case 4:
      return "¡Buen día! :) se disfruta.";
    default:
      return "¡Bien ahí! :D día redondo.";
  }
}