"use client";

import { useEffect, useRef, useState } from "react";

const LINES = ["Iniciando BitAK0R4_"];

export function BootLog({ onDone }: { onDone: () => void }) {
  const [lineIdx, setLineIdx] = useState(0);
  const [charLen, setCharLen] = useState(0);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let line = 0;
    let chars = 0;
    const id = window.setInterval(() => {
      const full = LINES[line];
      chars += 1;
      if (chars > full.length) {
        line += 1;
        chars = 0;
        if (line >= LINES.length) {
          setLineIdx(line);
          setCharLen(0);
          window.clearInterval(id);
          window.setTimeout(() => onDoneRef.current(), 200);
          return;
        }
      }
      setLineIdx(line);
      setCharLen(chars);
    }, reduceMotion ? 4 : 26);
    return () => window.clearInterval(id);
  }, [onDoneRef]);

  useEffect(() => {
    const onKey = () => onDoneRef.current();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDoneRef]);

  return (
    <div
      data-testid="boot-log"
      onClick={() => onDoneRef.current()}
      className="boot-log fixed inset-0 z-30 flex cursor-pointer flex-col items-center justify-center gap-2"
    >
      {LINES.map((line, i) => {
        const active = i === lineIdx;
        const full = i < lineIdx;
        const text = full
          ? line
          : active
            ? line.slice(0, charLen)
            : "";
        return (
          <p
            key={line}
            className="font-mono text-xs tracking-widest text-zinc-500 sm:text-sm"
          >
            <span className="text-zinc-600">&gt; </span>
            {text}
            {active && <span className="tw-caret">▌</span>}
          </p>
        );
      })}
    </div>
  );
}