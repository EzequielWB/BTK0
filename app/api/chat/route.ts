import { isAuthenticated } from "@/lib/session";
import { buildSystemPrompt } from "@/lib/dino-prompt";
import { getDinoById } from "@/lib/dinosaurs";
import { buildDayContext, buildMonthContext } from "@/lib/chat-context";
import { chatWithFallback } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 60;

type Msg = { role: "user" | "assistant"; content: string };

const MAX_HISTORY = 20;

function streamError(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function POST(req: Request): Promise<Response> {
  const authed = await isAuthenticated();
  if (!authed) return streamError("Fuera de alcance. 401.", 401);

  let body: {
    dinoId?: unknown;
    messages?: unknown;
    dataQuery?: { kind?: unknown; month?: unknown; year?: unknown };
  };
  try {
    body = await req.json();
  } catch {
    return streamError("Ese mensaje no se entendió. 400.", 400);
  }

  const dino = getDinoById(typeof body.dinoId === "string" ? body.dinoId : "");
  if (!dino) return streamError("Dinosaurio no reconocido. 400.", 400);

  const history: Msg[] = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m): m is Msg => {
      if (typeof m !== "object" || m === null) return false;
      const msg = m as Record<string, unknown>;
      return (
        (msg.role === "user" || msg.role === "assistant") &&
        typeof msg.content === "string" &&
        msg.content.trim().length > 0
      );
    })
    .slice(-MAX_HISTORY);

  // Contexto en memoria: SOLO para esta consulta (botón "cómo va el día / mes").
  // Se regenera en cada request y sobrescribe el slot anterior; no entra al
  // historial guardado en el cliente (así no se gastan tokens en turnos futuros).
  let context = "";
  const rawQuery = body.dataQuery;
  if (rawQuery && typeof rawQuery === "object") {
    if (rawQuery.kind === "day") {
      context = await buildDayContext();
    } else if (
      rawQuery.kind === "month" &&
      typeof rawQuery.month === "number" &&
      typeof rawQuery.year === "number"
    ) {
      const { month, year } = rawQuery;
      if (Number.isInteger(month) && month >= 1 && month <= 12 && Number.isInteger(year) && year >= 2000 && year <= 2099) {
        context = await buildMonthContext(month, year);
      }
    }
  }

  const system = buildSystemPrompt(dino);

  const result = await chatWithFallback({
    system,
    context: context || undefined,
    history,
    maxTokens: 800,
    temperature: 0.5,
    stream: true,
  });

  if (result.type === "error") {
    return streamError(result.message, result.status);
  }

  return new Response(result.stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}