"use client";

import { useEffect, useRef, useState } from "react";

export function Typewriter({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [steps, setSteps] = useState(0);
  const prevRef = useRef(text);

  const shown = Math.min(steps, text.length);
  const done = shown >= text.length;

  useEffect(() => {
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = window.setInterval(() => {
      if (prevRef.current !== text) {
        prevRef.current = text;
        setSteps(0);
        return;
      }
      setSteps((s) => (s >= text.length ? text.length : s + 1));
    }, reduceMotion ? 2 : 18);
    return () => window.clearInterval(id);
  }, [text]);

  return (
    <h1 className={className} data-phrase-src={text}>
      <span>{text.slice(0, shown)}</span>
      {!done && (
        <span aria-hidden className="tw-caret">
          ▌
        </span>
      )}
    </h1>
  );
}