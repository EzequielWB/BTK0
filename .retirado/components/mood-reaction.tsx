"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

// S4GR3t_, la asistente, reacciona al ánimo recién guardado: aparece abajo a
// la derecha, vibra un segundo y abre un globo donde la IA le escribe una frase
// al día. En el globo se puede CONTESTAR y sigue la conversación. No persiste
// nada localmente; se cierra con la ✕ (sin timeout).
export function MoodReaction({
  date,
  mood,
  previousMoods,
  onClose,
}: {
  date: string;
  mood: number;
  previousMoods: number[];
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [shown, setShown] = useState("");
  const [busy, setBusy] = useState(true);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const requestReplyRef = useRef<(history: Msg[]) => void>(() => {});

  const commit = useCallback((content: string) => {
    setShown("");
    setPending(null);
    setBusy(false);
    setError(null);
    setMessages((prev) => [...prev, { role: "assistant", content }]);
  }, []);

  const requestReply = useCallback(
    async (history: Msg[]) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/mood", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date, mood, previousMoods, history }),
        });
        const data = (await res.json()) as { text?: string };
        if (res.ok && typeof data.text === "string" && data.text.trim()) {
          setPending(data.text);
          setShown("");
          setBusy(false);
          return;
        }
        setError("No pude contestar. Señal perdida.");
        setBusy(false);
      } catch {
        setError("No pude contestar. Señal perdida.");
        setBusy(false);
      }
    },
    [date, mood, previousMoods]
  );

  useEffect(() => {
    const open = setTimeout(() => setVisible(true), 850);
    return () => clearTimeout(open);
  }, []);

  useEffect(() => {
    requestReplyRef.current = requestReply;
  });

  // La reacción inicial se pide UNA sola vez al montar el globo (refiere al
  // handler actual vía ref). Así, si el padre se re-renderiza con otras props
  // (ej. otra server action revalida previousMoods), NO se vuelve a pedir la
  // respuesta: solo se responde al tocar un estado de ánimo o al enviar.
  useEffect(() => {
    const t = setTimeout(() => {
      requestReplyRef.current([]);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // Typewriter de la respuesta en curso. `shown` siempre arranca en "" cuando
  // se setea `pending`, así que el contador parte de 0.
  useEffect(() => {
    if (pending === null || pending.length === 0) return;
    const lenRef = { value: 0 };
    const iv = setInterval(() => {
      lenRef.value += 2;
      if (lenRef.value >= pending.length) {
        clearInterval(iv);
        setShown(pending);
        commit(pending);
        return;
      }
      setShown(pending.slice(0, lenRef.value));
    }, 18);
    return () => clearInterval(iv);
  }, [pending, commit]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || busy || pending !== null) return;
    setDraft("");
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    requestReply(next);
  }

  return (
    <div className="cyb-mood-bot" role="region" aria-label="Asistente de ánimo">
      <div
        className={`cyb-mood-balloon ${visible ? "" : "hidden"}`}
        role="dialog"
        aria-label="Mensaje de la asistente"
      >
        <button
          type="button"
          className="cyb-mood-close"
          onClick={onClose}
          aria-label="Cerrar"
        >
          ✕
        </button>
        <div className="cyb-mood-list" ref={listRef} aria-live="polite">
          {messages.map((m, i) => (
            <p
              key={i}
              className={m.role === "user" ? "cyb-mood-you" : "cyb-mood-msg"}
            >
              {m.content}
            </p>
          ))}
          {pending !== null && (
            <p className="cyb-mood-msg">
              {shown}
              {shown.length < pending.length && (
                <span className="cyb-mood-caret">▌</span>
              )}
            </p>
          )}
          {busy && pending === null && (
            <p className="cyb-mood-typing">TRANSMITIENDO…</p>
          )}
          {error && <p className="cyb-mood-error">{error}</p>}
        </div>
        {messages.length > 0 && (
          <form className="cyb-mood-in" onSubmit={submit}>
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="CONTESTAR…"
              aria-label="Contestar"
              disabled={busy || pending !== null}
            />
            <button
              type="submit"
              disabled={busy || pending !== null || !draft.trim()}
              aria-label="Enviar"
            >
              ▲
            </button>
          </form>
        )}
      </div>
      <div className="cyb-mood-char">
        <div
          className={`cyb-mood-avatar ${visible ? "" : "shaking"}`}
          aria-hidden="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/munieco.png"
            alt=""
            width={84}
            height={84}
            draggable={false}
            className="cyb-mood-img"
          />
        </div>
        <span className="cyb-mood-name">S4GR3t_</span>
      </div>
    </div>
  );
}