"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DINOSAURS, getDinoById } from "@/lib/dinosaurs";
import type { Dino } from "@/lib/dinosaurs";

type Msg = { role: "user" | "assistant"; content: string };

type DataQuery =
  | { kind: "day" }
  | { kind: "month"; year: number; month: number };

type Store = Record<string, Msg[]>;

const STORE_KEY = "db_dino_chat_v1";
const DEFAULT_DINO = "nod0";
const MAX_THREAD = 40;

function loadStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    const data: unknown = raw ? JSON.parse(raw) : null;
    if (data && typeof data === "object" && !Array.isArray(data)) {
      return data as Store;
    }
  } catch {
    /* almacen corrupto, se ignora */
  }
  return {};
}

function currentMonth(): string {
  return String(new Date().getMonth() + 1).padStart(2, "0");
}

function currentYearYY(): string {
  return String(new Date().getFullYear()).slice(-2);
}

export default function DinoChat() {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>(DEFAULT_DINO);
  const [store, setStore] = useState<Store>(() => loadStore());
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [received, setReceived] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monthPart, setMonthPart] = useState(currentMonth);
  const [yearPart, setYearPart] = useState(currentYearYY);
  const [askingMonth, setAskingMonth] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  const active: Dino = getDinoById(activeId) ?? DINOSAURS[0];
  const messages: Msg[] = useMemo(
    () => store[active.code] ?? [],
    [store, active.code]
  );

  useEffect(() => {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch {
      /* almacen lleno o bloqueado */
    }
  }, [store]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy, open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (askingMonth) monthRef.current?.focus();
  }, [askingMonth]);

  function switchTo(id: string) {
    setActiveId(id);
    setError(null);
  }

  function clearThread() {
    setStore((prev) => {
      const next = { ...prev };
      delete next[active.code];
      return next;
    });
    setError(null);
  }

  function quickDay() {
    setAskingMonth(false);
    void send("¿Cómo va el día?", { kind: "day" });
  }

  function askMonth() {
    if (busy) return;
    setMonthPart(currentMonth());
    setYearPart(currentYearYY());
    setError(null);
    setAskingMonth(true);
  }

  function confirmMonth(e: { preventDefault: () => void }) {
    e.preventDefault();
    const mm = monthPart.trim();
    const aa = yearPart.trim();
    if (mm.length === 0 || !/^\d{2}$/.test(aa)) {
      setError("Mes en formato mm/aa, ej. 09/26");
      return;
    }
    const month = Number(mm);
    const year = 2000 + Number(aa);
    if (month < 1 || month > 12) {
      setError("El mes va de 01 a 12, ej. 09/26");
      return;
    }
    const value = `${mm}/${aa}`;
    setAskingMonth(false);
    void send(`¿Cómo va el mes (${value})?`, { kind: "month", month, year });
  }

  function cancelMonth() {
    setAskingMonth(false);
    setMonthPart(currentMonth());
    setYearPart(currentYearYY());
    setError(null);
  }

  async function send(text: string, dataQuery?: DataQuery) {
    const content = text.trim();
    if (!content || busy) return;

    const prevThread = store[active.code] ?? [];
    const nextThread: Msg[] = [
      ...prevThread,
      { role: "user" as const, content },
    ].slice(-MAX_THREAD);

    setStore((prev) => ({ ...prev, [active.code]: nextThread }));
    setInput("");
    setBusy(true);
    setReceived(false);
    setError(null);

    let acc = "";

    const appendDelta = (delta: string) => {
      acc += delta;
      setStore((prev) => ({
        ...prev,
        [active.code]: [
          ...nextThread,
          { role: "assistant" as const, content: acc },
        ],
      }));
    };

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dinoId: active.code,
          messages: nextThread,
          dataQuery,
        }),
        signal: AbortSignal.timeout(60_000),
      });

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => `HTTP ${res.status}`);
        throw new Error(text.trim() || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        if (buffer) setReceived(true);
        appendDelta(buffer);
        buffer = "";
      }
    } catch (e) {
      const message =
        e instanceof Error && e.name === "TimeoutError"
          ? "Se cortó. El modelo fue lento en responder; probá de nuevo."
          : e instanceof Error && e.message
            ? e.message
            : "Algo se cortó en el medio.";
      setError(message);
      if (!acc) {
        setStore((prev) => ({ ...prev, [active.code]: nextThread }));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          className="cyb-dock"
          aria-label="Abrir chat de dinosaurios"
          onClick={() => setOpen(true)}
        >
          <pre className="cyb-dock-art">{active.art}</pre>
        </button>
      )}

      {open && (
        <section className="cyb-dchat" aria-label="Chat de dinosaurios">
          <header className="cyb-dchat-head">
            <div className="cyb-dchat-head-top">
              <pre className="cyb-dchat-art">{active.art}</pre>
              <div className="cyb-dchat-meta">
                <h2>{active.code}</h2>
                <span>{active.species}</span>
              </div>
              <div className="cyb-dchat-headacts">
                <button
                  type="button"
                  className="cyb-dchat-act"
                  title="Borrar conversación"
                  onClick={clearThread}
                >
                  BORRAR
                </button>
                <button
                  type="button"
                  className="cyb-dchat-act cyb-dchat-close"
                  aria-label="Cerrar"
                  onClick={() => setOpen(false)}
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="cyb-dchat-quick">
              {askingMonth ? (
                <form className="cyb-dchat-month" onSubmit={confirmMonth}>
                  <span className="cyb-dchat-month-label">MES</span>
                  <input
                    ref={monthRef}
                    value={monthPart}
                    onChange={(e) => {
                      setMonthPart(
                        e.target.value.replace(/\D/g, "").slice(0, 2)
                      );
                      setError(null);
                    }}
                    placeholder="mm"
                    inputMode="numeric"
                    maxLength={2}
                    aria-label="Mes (mm)"
                  />
                  <span aria-hidden className="cyb-dchat-month-label">/</span>
                  <input
                    value={yearPart}
                    onChange={(e) => {
                      setYearPart(
                        e.target.value.replace(/\D/g, "").slice(0, 2)
                      );
                      setError(null);
                    }}
                    placeholder="aa"
                    inputMode="numeric"
                    maxLength={2}
                    aria-label="Año (aa)"
                  />
                  <button type="submit" disabled={busy}>
                    OK
                  </button>
                  <button
                    type="button"
                    onClick={cancelMonth}
                    title="Cancelar"
                  >
                    ✕
                  </button>
                </form>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={quickDay}
                    title="El bot mira la hora y lo que registraste hoy"
                  >
                    CÓMO VA EL DÍA
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={askMonth}
                    title="El bot resume cómo viene el mes elegido"
                  >
                    CÓMO VA EL MES
                  </button>
                </>
              )}
            </div>
          </header>

          <div className="cyb-dchat-body">
            <aside className="cyb-dchat-list">
              {DINOSAURS.map((dino) => {
                const count = (store[dino.code] ?? []).length;
                const isActive = dino.code === active.code;
                return (
                  <button
                    key={dino.id}
                    type="button"
                    className={"cyb-dchat-item" + (isActive ? " on" : "")}
                    onClick={() => switchTo(dino.code)}
                  >
                    <pre>{dino.art}</pre>
                    <span className="cyb-dchat-code">{dino.code}</span>
                    {count > 0 && <span className="cyb-dchat-count">{count}</span>}
                  </button>
                );
              })}
            </aside>

            <div className="cyb-dchat-thread">
              <div className="cyb-dchat-msgs" ref={threadRef}>
                {messages.length === 0 && (
                  <p className="cyb-dchat-empty">
                    {active.code}·{active.species}
                    <br />
                    Escribile lo que pasó hoy.
                  </p>
                )}

                {messages.map((m, i) =>
                  m.role === "user" ? (
                    <div key={i} className="cyb-msg user">
                      {m.content}
                    </div>
                  ) : (
                    <div key={i} className="cyb-msg dino">
                      <span className="cyb-msg-src">{active.code}</span>
                      {m.content}
                    </div>
                  )
                )}

                {busy && !received && (
                  <div className="cyb-msg dino typing">
                    <span className="cyb-msg-src">{active.code}</span>
                    TRANSMITIENDO···
                  </div>
                )}

                {error && <div className="cyb-msg err">{error}</div>}
              </div>

              <form
                className="cyb-dchat-input"
                onSubmit={(e) => {
                  e.preventDefault();
                  void send(input);
                }}
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={"Escribile a " + active.code + "…"}
                  maxLength={2000}
                  aria-label="Mensaje"
                />
                <button type="submit" disabled={busy || !input.trim()}>
                  ENVIAR
                </button>
              </form>
            </div>
          </div>
        </section>
      )}
    </>
  );
}