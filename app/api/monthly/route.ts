import { isAuthenticated } from "@/lib/session";
import { monthLabel, monthRangeISO, todayISO } from "@/lib/utils";
import { buildPeriodFacts, type PeriodFacts } from "@/lib/analytics";
import { chatWithFallback } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 60;

function json(message: unknown, status = 200): Response {
  return new Response(JSON.stringify(message), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function fmt(iso: string): string {
  const [, mm, dd] = iso.split("-");
  return `${dd}/${mm}`;
}

function buildPrompt(f: PeriodFacts): string {
  const lines: string[] = [];

  lines.push(
    "Eres un analista objetivo que revisa la bitácora personal del usuario. Trabajas SOLO con los datos que te dan: no inventes cifras, fechas ni situaciones. Estilo sobrio, directo y neutral, en español; nada de elogios vacíos ni dramatismo. Sin emojis ni caritas de texto."
  );
  lines.push("");
  lines.push("Estructura EXACTA de tu respuesta (encabezados textuales):");
  lines.push("RESUMEN");
  lines.push("ALTOS");
  lines.push("BAJOS");
  lines.push("CIERRE");
  lines.push("");
  lines.push(
    "- RESUMEN: 3 a 4 líneas sobre cómo estuvo el período en general, con números concretos."
  );
  lines.push(
    "- ALTOS: 2 a 4 puntos específicos de lo que funcionó (apoyado en los datos)."
  );
  lines.push(
    "- BAJOS: 2 a 4 puntos concretos de lo que faltó o se estancó (también con datos)."
  );
  lines.push(
    "- CIERRE: una sola recomendación accionable y realista para el próximo período."
  );
  lines.push("");
  lines.push(
    `DATOS DEL PERÍODO (hasta ${f.rangeLabel}):`
  );
  lines.push(`Rango: ${f.rangeLabel}`);
  lines.push(
    `Objetivos activos: ${f.objectives.length ? f.objectives.join(", ") : "ninguno"}`
  );
  lines.push(
    `Días con registro: ${f.daysWithData} de ${f.rangeDays} (${f.emptyDays} vacíos)`
  );
  lines.push(`Días con hoja: ${f.daysWithJournal}`);
  lines.push(`Racha actual: ${f.streak} día(s)`);
  lines.push(`Eficiencia: ${f.efficiency}%`);
  lines.push(
    `Mejores días: ${f.best.length ? f.best.map((d) => `${fmt(d.iso)} (${d.percent}%)`).join(", ") : "sin registros"}`
  );
  lines.push(
    `Peores días con registro: ${f.worst.length ? f.worst.map((d) => `${fmt(d.iso)} (${d.percent}%)`).join(", ") : "sin registros"}`
  );
  lines.push(
    `% por día (solo días con registro): ${f.daily
      .filter((d) => d.hasData)
      .map((d) => `${fmt(d.date)}: ${d.percent}%`)
      .join(", ") || "ninguno"}`
  );
  lines.push("");
  if (f.journal.length) {
    lines.push("LA HOJA (más recientes, tal cual escribió el usuario):");
    for (const entry of f.journal)
      lines.push(`- [${fmt(entry.iso)}] ${entry.content}`);
    lines.push("");
  }
  if (f.dayGoals.length) {
    const total = f.dayGoals.length;
    const done = f.dayGoals.filter((g) => g.content.includes("completado")).length;
    lines.push(
      `Objetivos del día (muestra ${done}/${total} completados):`
    );
    for (const goal of f.dayGoals)
      lines.push(`- [${fmt(goal.iso)}] ${goal.content}`);
    lines.push("");
  }
  lines.push(
    "Usa las anotaciones de la hoja y los objetivos del día solo como contexto para detectar altos y bajos; no los repitas textualmente. Responde únicamente el resumen, sin preámbulos."
  );

  return lines.join("\n");
}

export async function POST(req: Request): Promise<Response> {
  if (!(await isAuthenticated())) {
    return json({ error: "Fuera de alcance. 401." }, 401);
  }

  const body = (await req.json().catch(() => null)) as {
    year?: number;
    month?: number;
  } | null;
  const today = todayISO();
  const currentYear = Number(today.slice(0, 4));
  const currentMonth = Number(today.slice(5, 7));
  const requestedYear = body?.year;
  const requestedMonth = body?.month;
  const year =
    typeof requestedYear === "number" &&
    Number.isInteger(requestedYear) &&
    requestedYear >= 2000 &&
    requestedYear <= 2100
      ? requestedYear
      : currentYear;
  const month =
    typeof requestedMonth === "number" &&
    Number.isInteger(requestedMonth) &&
    requestedMonth >= 1 &&
    requestedMonth <= 12
      ? requestedMonth
      : currentMonth;

  const { start, end } = monthRangeISO(
    `${year}-${String(month).padStart(2, "0")}-01`
  );
  const facts = await buildPeriodFacts(start, end);

  if (!facts.daysWithData) {
    const monthName = monthLabel(year, month - 1);
    return json({
      text: `No hay registros en ${monthName} todavía. Usá la bitácora unos días y volvé a preguntar.`,
    });
  }

  const result = await chatWithFallback({
    system: buildPrompt(facts),
    maxTokens: 700,
    temperature: 0.3,
    stream: false,
  });

  if (result.type === "error") {
    return json({ error: result.message }, result.status === 503 ? 503 : 502);
  }

  return json({ text: result.text });
}