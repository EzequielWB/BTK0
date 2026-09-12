"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AsciiEye } from "./ascii-eye";
import { RainBackdrop } from "./rain-backdrop";
import { CrtShutdown } from "./crt-shutdown";
import { BootLog } from "./boot-log";
import { OsdFrame } from "./osd-frame";
import { Typewriter } from "./typewriter";
import { PasswordGate } from "@/components/password-gate";
import { getRandomLoginPhrase } from "@/lib/login-phrases";
import { grantSessionAction } from "@/lib/actions";

type Phase = "boot" | "idle" | "wrong" | "flash" | "off" | "granted";

export function LoginScreen({
  showDefaultHint = false,
}: {
  showDefaultHint?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("boot");
  const phaseRef = useRef<Phase>("boot");
  const [reading, setReading] = useState(false);
  const [phrase, setPhrase] = useState("¿Sos el que tiene\nque ser?");
  const router = useRouter();

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

  const handleSuccess = useCallback(() => {
    setPhase((p) => (p === "idle" ? "granted" : p));
  }, []);

  useEffect(() => {
    if (phase !== "granted") return;
    let cancelled = false;
    const t = window.setTimeout(async () => {
      await grantSessionAction();
      if (!cancelled) router.push("/bitacora");
    }, 1100);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [phase, router]);

  useEffect(() => {
    if (phase !== "wrong") return;
    const t = window.setTimeout(() => {
      if (phaseRef.current === "wrong") setPhase("flash");
    }, 420);
    return () => window.clearTimeout(t);
  }, [phase]);

  if (phase === "off") {
    return <div aria-hidden className="fixed inset-0 z-50 bg-black" />;
  }

  const eyeMode =
    phase === "wrong" || phase === "flash"
      ? "stare"
      : reading && phase !== "granted"
        ? "read"
        : "idle";

  const success = phase === "granted";

  return (
    <>
      <RainBackdrop />
      <OsdFrame />
      {phase === "boot" && <BootLog onDone={() => setPhase("idle")} />}
      {success && (
        <div aria-hidden className="granted-flash pointer-events-none fixed inset-0 z-[45]" />
      )}
      <div
        className={`relative z-10 flex flex-col items-center gap-5 text-center transition-all duration-700 sm:gap-7 ${
          phase === "boot" ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100"
        }`}
      >
        <div
          className={`transition-opacity duration-700 ${
            phase === "boot" ? "opacity-0" : "opacity-100"
          }`}
        >
          <AsciiEye mode={eyeMode} />
        </div>
        <Typewriter
          text={success ? "IDENTIDAD\nVERIFICADA" : phrase}
          className={
            success
              ? "font-pixel text-sm leading-relaxed whitespace-pre-line text-[#00ff9d] [text-shadow:0_0_12px_rgba(0,255,157,0.55)] sm:text-base"
              : "font-pixel text-sm leading-relaxed whitespace-pre-line text-zinc-200 [text-shadow:0_0_8px_rgba(255,255,255,0.35)] sm:text-base"
          }
        />
        <PasswordGate
          showDefaultHint={showDefaultHint}
          onError={handleError}
          onReading={setReading}
          onSuccess={handleSuccess}
          disabled={phase !== "idle"}
        />
      </div>
      {phase === "flash" && <CrtShutdown onDone={handleShutdown} />}
    </>
  );
}