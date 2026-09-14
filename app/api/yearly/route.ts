import { isAuthenticated } from "@/lib/session";
import { todayISO } from "@/lib/utils";
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

const MONTH_SHORT = Array.from({ length: 12 }, (_, i) =>
  new Intl.DateTimeFormat("es-AR", { month: "short" })
    .format(new Date(2020, i, 1))
    .replace(/\./g, "")
);

function monthBreakdown(f: PeriodFacts): string {
  const elapsed = new Array(12).fill(0);
  const ratio = new Array(12).fill(0);
  for (const point of f.daily) {
    const m = Number(point.date.slice(5, 7)) - 1;
    elapsed[m]++;
    ratio[m] += point.ratio;
  }
  return MONTH_SHORT.map((label, m) => {
    const percent =
      elapsed[m] > 0 ? Math.round((ratio[m] / elapsed[m]) * 100) : 0;
    return `${label}: ${percent}% (${elapsed[m]}d)`;
  }).join(", ");
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
    "- RESUMEN: 3 a 4 líneas sobre cómo va el año en general, con números concretos."
  );
  lines.push(
    "- ALTOS: 2 a 4 puntos específicos de lo que funcionó (apoyado en los datos, podés nombrar meses puntuales)."
  );
  lines.push(
    "- BAJOS: 2 a 4 puntos concretos de lo que faltó o se estancó (también con datos, nombrá meses puntuales)."
  );
  lines.push(
    "- CIERRE: una sola recomendación accionable y realista para lo que queda del año."
  );
  lines.push("");
  lines.push(`DATOS DEL AÑO (hasta ${f.rangeLabel}):`);
  lines.push(`Rango: ${f.rangeLabel}`);
  lines.push(
    `Objetivos activos: ${f.objectives.length ? f.objectives.join(", ") : "ninguno"}`
  );
  lines.push(
    `Días con registro: ${f.daysWithData} de ${f.rangeDays} (${f.emptyDays} vacíos)`
  );
  lines.push(`Días con notas: ${f.daysWithNotes}`);
  lines.push(`Días con aprendizajes: ${f.daysWithLearnings}`);
  lines.push(`Mejor racha: ${f.longestStreak} día(s)`);
  lines.push(`Eficiencia anual: ${f.efficiency}%`);
  lines.push(
    `Mejores días: ${f.best.length ? f.best.map((d) => `${fmt(d.iso)} (${d.percent}%)`).join(", ") : "sin registros"}`
  );
  lines.push(
    `Peores días con registro: ${f.worst.length ? f.worst.map((d) => `${fmt(d.iso)} (${d.percent}%)`).join(", ") : "sin registros"}`
  );
  lines.push(`Eficiencia por mes: ${monthBreakdown(f)}`);
  lines.push("");
  if (f.notes.length) {
    lines.push("NOTAS (más recientes, tal cual escribió el usuario):");
    for (const note of f.notes) lines.push(`- [${fmt(note.iso)}] ${note.content}`);
    lines.push("");
  }
  if (f.learnings.length) {
    lines.push("APRENDIZAJES (más recientes):");
    for (const learning of f.learnings)
      lines.push(`- [${fmt(learning.iso)}] ${learning.content}`);
    lines.push("");
  }
  lines.push(
    "Usa las notas/aprendizajes solo como contexto para detectar altos y bajos; no los repitas textualmente. Responde únicamente el resumen, sin preámbulos."
  );

  return lines.join("\n");
}

export async function POST(req: Request): Promise<Response> {
  if (!(await isAuthenticated())) {
    return json({ error: "Fuera de alcance. 401." }, 401);
  }

  const body = (await req.json().catch(() => null)) as { year?: number } | null;
  const today = todayISO();
  const currentYear = Number(today.slice(0, 4));
  const requestedYear = body?.year;
  const year =
    typeof requestedYear === "number" &&
    Number.isInteger(requestedYear) &&
    requestedYear >= 2000 &&
    requestedYear <= 2100
      ? requestedYear
      : currentYear;

  const facts = await buildPeriodFacts(`${year}-01-01`, `${year}-12-31`);

  if (!facts.daysWithData) {
    return json({
      text: `No hay registros en ${year} todavía. Usá la bitácora unos días y volvé a preguntar.`,
    });
  }

  const result = await chatWithFallback({
    system: buildPrompt(facts),
    maxTokens: 800,
    temperature: 0.3,
    stream: false,
  });

  if (result.type === "error") {
    return json({ error: result.message }, result.status === 503 ? 503 : 502);
  }

  return json({ text: result.text });
}