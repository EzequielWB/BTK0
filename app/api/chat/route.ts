import { isAuthenticated } from "@/lib/session";
import { buildSystemPrompt } from "@/lib/dino-prompt";
import { getDinoById } from "@/lib/dinosaurs";
import { buildDayContext, buildMonthContext } from "@/lib/chat-context";

export const runtime = "nodejs";
export const maxDuration = 60;

type Msg = { role: "user" | "assistant"; content: string };

const DEFAULT_MODELS = [
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "dots-studio/dots-3-note-preview:free",
  "thinkingmachines/inkling-small:free",
];

const MODELS = (() => {
  const env = process.env.OPENROUTER_MODEL?.trim();
  if (!env) return DEFAULT_MODELS;
  return [env, ...DEFAULT_MODELS.filter((m) => m !== env)];
})();

const MAX_HISTORY = 20;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const ATTEMPT_TIMEOUT_MS = 25_000;

function streamError(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function readBody(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 300);
  } catch {
    return "";
  }
}

/**
 * Proba el modelo configurado y, si da 429/404/5xx (rate-limit del tier libre,
 * modelo no disponible, error de servidor), cae al siguiente modelo :free.
 */
async function completeWithFallback(
  system: string,
  history: Msg[],
  context?: string
): Promise<{ type: "ok"; res: Response; model: string } | { type: "error"; status: number; message: string }> {
  let sawRateLimit = false;
  let lastMessage = "";

  const contextMessage = context
    ? [
        {
          role: "system",
          content: `Datos actuales del usuario (leelos y comentá usando esa info, sin repetirlos textualmente ni enumerarlos, integrándola a tu respuesta):\n${context}`,
        } as const,
      ]
    : [];

  for (const model of MODELS) {
    let res: Response;
    try {
      res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": process.env.SITE_URL || "http://localhost:3000",
          "X-Title": "LA_BITAK0R4_",
        },
        body: JSON.stringify({
          model,
          max_tokens: 800,
          temperature: 0.5,
          stream: true,
          messages: [
            { role: "system", content: system },
            ...contextMessage,
            ...history,
          ],
        }),
        signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
      });
    } catch (e) {
      lastMessage = `Fuera de alcance: ${e instanceof Error ? e.message : String(e)}`;
      continue;
    }

    if (res.ok) {
      return { type: "ok", res, model };
    }

    const status = res.status;
    const detail = await readBody(res);
    lastMessage = `OpenRouter ${status} ${detail}`.trim();

    if (status === 429) sawRateLimit = true;
    if (status !== 429 && status !== 404 && status < 500) {
      return { type: "error", status, message: lastMessage };
    }

    if (MODELS.length > 1) await sleep(900);
  }

  const message = sawRateLimit
    ? "Todos los modelos gratis están saturados en este momento. Esperá un rato y volvé a intentarlo."
    : lastMessage || "Sin respuesta de OpenRouter.";
  return { type: "error", status: sawRateLimit ? 429 : 502, message };
}

export async function POST(req: Request): Promise<Response> {
  const authed = await isAuthenticated();
  if (!authed) return streamError("Fuera de alcance. 401.", 401);

  if (!process.env.OPENROUTER_API_KEY) {
    return streamError(
      "Falta OPENROUTER_API_KEY en .env.local. Sin clave no hay chat.",
      503
    );
  }

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

  const attempt = await completeWithFallback(system, history, context || undefined);

  if (attempt.type === "error") {
    return streamError(attempt.message, attempt.status);
  }

  const upstream = attempt.res;
  if (!upstream.body) return streamError("Sin respuesta de OpenRouter. 502.", 502);

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder("utf-8");
  const encoder = new TextEncoder();
  let buffer = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const json = JSON.parse(payload) as {
                choices?: Array<{ delta?: { content?: string } }>;
              };
              const delta = json.choices?.[0]?.delta?.content ?? "";
              if (delta) controller.enqueue(encoder.encode(delta));
            } catch {
              /* chunk parcial, se ignora */
            }
          }
        }
      } catch (error) {
        try {
          controller.error(error);
        } catch {
          /* ya cerrado */
        }
      } finally {
        try {
          controller.close();
        } catch {
          /* ya cerrado */
        }
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}