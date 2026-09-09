"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AsciiEye } from "./ascii-eye";
import { RainBackdrop } from "./rain-backdrop";
import { CrtShutdown } from "./crt-shutdown";
import { PasswordGate } from "@/components/password-gate";
import { getRandomLoginPhrase } from "@/lib/login-phrases";

type Phase = "idle" | "wrong" | "flash" | "off";

export function LoginScreen({
  showDefaultHint = false,
}: {
  showDefaultHint?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const phaseRef = useRef<Phase>("idle");
  const [phrase, setPhrase] = useState("¿Sos el que tiene\nque ser?");

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    const id = window.setTimeout(() => setPhrase(getRandomLoginPhrase()), 0);
    return () => window.clearTimeout(id);
  }, []);

  const handleError = useCallback(() => {
    setPhase((p) => (p === "idle" ? "wrong" : p));
    setPhrase(getRandomLoginPhrase());
  }, []);

  const handleShutdown = useCallback(() => {
    setPhase((p) => (p === "flash" ? "off" : p));
  }, []);

  useEffect(() => {
    if (phase !== "wrong") return;
    const t = window.setTimeout(() => {
      if (phaseRef.current === "wrong") setPhase("flash");
    }, 320);
    return () => window.clearTimeout(t);
  }, [phase]);

  if (phase === "off") {
    return <div aria-hidden className="fixed inset-0 z-50 bg-black" />;
  }

  return (
    <>
      <RainBackdrop />
      <div className="relative z-10 flex flex-col items-center gap-7 text-center">
        <AsciiEye stare={phase === "wrong" || phase === "flash"} />
        <h1 className="font-pixel text-sm leading-relaxed whitespace-pre-line text-zinc-200 [text-shadow:0_0_8px_rgba(255,255,255,0.35)] sm:text-base">
          {phrase}
        </h1>
        <PasswordGate
          showDefaultHint={showDefaultHint}
          onError={handleError}
          disabled={phase !== "idle"}
        />
      </div>
      {phase === "flash" && <CrtShutdown onDone={handleShutdown} />}
    </>
  );
}