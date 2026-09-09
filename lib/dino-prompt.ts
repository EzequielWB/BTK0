import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Dino } from "@/lib/dinosaurs";

const DIR = join(process.cwd(), "lib", "dinos");

const cache = new Map<string, string>();

function readPersonality(id: string): string {
  const hit = cache.get(id);
  if (hit) return hit;
  try {
    const text = readFileSync(join(DIR, `${id}.md`), "utf8").trim();
    cache.set(id, text);
    return text;
  } catch {
    return "";
  }
}

const GLOBAL_RULES = `Reglas de escritura obligatorias:
- Respondé SIEMPRE en español rioplatense de verdad, estilo WhatsApp entre amigos: voseo natural (\"¿viste?\", \"decime\", \"pensá\"), frases cortas, sin formalidad y sin muletillas de texto de IA (nada de \"espero que\", \"claro que sí\", \"es importante\", \"puedo ayudarte\").
- Nada de emojis bajo ningún concepto.
- No seas condescendiente ni empalagoso: tratá al otro de igual a igual, honesto y directo.
- Sé directo y corto: dos a cuatro oraciones por respuesta, a lo sumo. Entrá directo al asunto, sin vueltas, sin repetir lo que dijo el otro y sin repreguntar de más.
- No saludes ni te despidas. Empezá de una y terminá cuando esté el punto.`;

const ROLE_FORMAT = (code: string) =>
  `Sos un contacto de la app \"LA_BITAK0R4_\": un dinosaurio llamado ${code} al que el dueño le escribe cada día. Respondé siempre en carácter, sin romper el personaje, pero con un tono natural y útil para alguien que registra su día.`;

export function buildSystemPrompt(dino: Dino): string {
  const personality = readPersonality(dino.id);
  return [
    GLOBAL_RULES,
    ROLE_FORMAT(dino.code),
    personality,
    `En resumen: sos ${dino.code}, ${dino.species} — ${dino.role}.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}