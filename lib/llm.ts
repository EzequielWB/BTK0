// lib/llm.ts — Proveedores de IA con fallback (OpenRouter -> Groq).
// Uso exclusivo del lado del servidor (guardan claves en el entorno).
//
// Orden de intentos:
//   1) OpenRouter (modelos env + lista `:free` + router gratuito).
//   2) Groq (openai/gpt-oss-120b, tier gratuito) si hay GROQ_API_KEY.
// Solo si ambos se agotan (429/403/404/5xx) se devuelve el mensaje de
// saturación. Sirve para streaming SSE (chat) o para respuesta completa
// (resumen mensual).

type Msg = { role: "user" | "assistant" | "system"; content: string };

type Params = {
  system: string;
  context?: string;
  history?: Msg[];
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
};

export type LlmResult =
  | {
      type: "ok";
      stream?: ReadableStream<Uint8Array>;
      text?: string;
      model: string;
      provider: "openrouter" | "groq";
    }
  | { type: "error"; status: number; message: string };

export const ATTEMPT_TIMEOUT_MS = 25_000;

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const OPENROUTER_DEFAULT_MODELS = [
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "dots-studio/dots-3-note-preview:free",
  // Router gratuito de OpenRouter: deriva a cualquier modelo :free que pueda
  // atender el pedido. Último respaldo dentro de OpenRouter.
  "openrouter/free",
];

const GROQ_DEFAULT_MODEL = "openai/gpt-oss-120b";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function openrouterModels(): string[] {
  const env = process.env.OPENROUTER_MODEL?.trim();
  if (!env) return OPENROUTER_DEFAULT_MODELS;
  return [env, ...OPENROUTER_DEFAULT_MODELS.filter((m) => m !== env)];
}

function buildMessages(p: Params): Msg[] {
  const messages: Msg[] = [{ role: "system", content: p.system }];
  if (p.context) {
    messages.push({
      role: "system",
      content: `Datos actuales del usuario (leelos y comentá usando esa info, sin repetirlos textualmente ni enumerarlos, integrándola a tu respuesta):\n${p.context}`,
    });
  }
  messages.push(...(p.history ?? []));
  return messages;
}

type ProviderResult =
  | { ok: true; res: Response; model: string }
  | { ok: false; error: { status: number; message: string } | null; sawRateLimit: boolean };

async function tryOpenRouter(
  messages: Msg[],
  opts: { maxTokens: number; temperature: number; stream: boolean }
): Promise<ProviderResult> {
  if (!process.env.OPENROUTER_API_KEY) return { ok: false, error: null, sawRateLimit: false };

  const models = openrouterModels();
  let sawRateLimit = false;
  let lastMessage = "";

  for (const model of models) {
    let res: Response;
    try {
      res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": process.env.SITE_URL || "http://localhost:3000",
          "X-Title": "BitAK0R4_",
        },
        body: JSON.stringify({
          model,
          max_tokens: opts.maxTokens,
          temperature: opts.temperature,
          stream: opts.stream,
          messages,
        }),
        signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
      });
    } catch (e) {
      lastMessage = `Fuera de alcance: ${e instanceof Error ? e.message : String(e)}`;
      continue;
    }

    if (res.ok) return { ok: true, res, model };

    const status = res.status;
    const detail = (await res.text().catch(() => "")).slice(0, 300);
    lastMessage = `OpenRouter ${status} ${detail}`.trim();

    if (status === 429) sawRateLimit = true;
    // 403/404 también se saltan: hay modelos que solo corren en agentic
    // harnesses o ya no existen; un error real (no transitorio) corta acá.
    if (status !== 429 && status !== 403 && status !== 404 && status < 500) {
      return { ok: false, error: { status, message: lastMessage }, sawRateLimit };
    }

    if (models.length > 1) await sleep(900);
  }

  return { ok: false, error: null, sawRateLimit };
}

async function tryGroq(
  messages: Msg[],
  opts: { maxTokens: number; temperature: number; stream: boolean }
): Promise<ProviderResult> {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) return { ok: false, error: null, sawRateLimit: false };

  const model = GROQ_DEFAULT_MODEL;

  let res: Response;
  try {
    res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: opts.maxTokens,
        temperature: opts.temperature,
        stream: opts.stream,
        messages,
      }),
      signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
    });
  } catch {
    return { ok: false, error: null, sawRateLimit: false };
  }

  if (res.ok) return { ok: true, res, model };

  const status = res.status;
  const detail = (await res.text().catch(() => "")).slice(0, 300);
  const message = `Groq ${status} ${detail}`.trim();
  const skipAble = status === 429 || status === 401 || status === 403 || status === 404;
  if (skipAble || status >= 500) {
    return { ok: false, error: null, sawRateLimit: status === 429 };
  }
  return { ok: false, error: { status, message }, sawRateLimit: status === 429 };
}

/** Re-alimenta un body de SSE generado por cualquier proveedor OpenAI-compatible. */
function pipeOpenAISSE(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
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
}

async function consumeOk(
  result: { res: Response; model: string; provider: "openrouter" | "groq" },
  stream: boolean
): Promise<LlmResult | null> {
  if (stream) {
    if (!result.res.body) return null;
    return {
      type: "ok",
      provider: result.provider,
      model: result.model,
      stream: pipeOpenAISSE(result.res.body),
    };
  }

  let data: { choices?: Array<{ message?: { content?: string } }> };
  try {
    data = (await result.res.json()) as typeof data;
  } catch {
    return null;
  }
  const text = (data.choices?.[0]?.message?.content ?? "").trim();
  if (!text) return null;
  return { type: "ok", provider: result.provider, model: result.model, text };
}

export async function chatWithFallback(p: Params): Promise<LlmResult> {
  const maxTokens = p.maxTokens ?? 800;
  const temperature = p.temperature ?? 0.5;
  const stream = p.stream ?? true;
  const messages = buildMessages(p);

  const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY);
  const hasGroq = Boolean(process.env.GROQ_API_KEY);
  if (!hasOpenRouter && !hasGroq) {
    return {
      type: "error",
      status: 503,
      message: "Falta una clave de IA (OPENROUTER_API_KEY o GROQ_API_KEY) en el entorno.",
    };
  }

  let sawRateLimit = false;
  let lastMessage = "";

  const or = await tryOpenRouter(messages, { maxTokens, temperature, stream });
  if (or.ok) {
    const done = await consumeOk({ res: or.res, model: or.model, provider: "openrouter" }, stream);
    if (done) return done;
    lastMessage = "El modelo devolvió una respuesta vacía.";
  } else {
    if (or.error) lastMessage = or.error.message;
    if (or.sawRateLimit) sawRateLimit = true;
  }

  const gq = await tryGroq(messages, { maxTokens, temperature, stream });
  if (gq.ok) {
    const done = await consumeOk({ res: gq.res, model: gq.model, provider: "groq" }, stream);
    if (done) return done;
    lastMessage = "El modelo devolvió una respuesta vacía.";
  } else {
    if (gq.error) lastMessage = gq.error.message;
    if (gq.sawRateLimit) sawRateLimit = true;
  }

  const message = sawRateLimit
    ? "Los modelos gratis están saturados en este momento. Esperá un rato y volvé a intentarlo."
    : lastMessage || "Sin respuesta de los proveedores de IA.";
  return { type: "error", status: sawRateLimit ? 429 : 502, message };
}