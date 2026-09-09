"use client";

import { useEffect, useRef } from "react";

const CHARS =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz" +
  "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ" +
  "▓▒░█▄▀■▪◈☰☉Σ∇○◎◐◑◘◙♠♣•τπλ#$%&@?¡!";

type Column = {
  x: number;
  y: number;
  speed: number;
  chars: string[];
  headIdx: number;
  length: number;
  scale: number;
};

function pick(s: string): string {
  return s[Math.floor(Math.random() * s.length)];
}

export function RainBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const elem = canvasRef.current;
    if (!elem) return;
    const context = elem.getContext("2d");
    if (!context) return;
    const canvas = elem;
    const ctx = context;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let width = 0;
    let height = 0;
    let cols: Column[] = [];
    let raf = 0;
    let last = 0;
    let hidden = false;

    const FONT = 13;
    const GAP = 11;

    function build() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = `${FONT}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.textBaseline = "top";

      const n = Math.ceil(width / GAP);
      cols = [];
      for (let i = 0; i < n; i++) {
        const length = 15 + Math.floor(Math.random() * 22);
        const chars: string[] = [];
        for (let c = 0; c < length; c++) chars.push(pick(CHARS));
        cols.push({
          x: i * GAP + (Math.random() * GAP) / 2,
          y: Math.random() * height * -1.2,
          speed: 2.1 + Math.random() * 3.2,
          chars,
          headIdx: 0,
          length,
          scale: 0.45 + Math.random() * 0.45,
        });
      }
    }

    function tick(now: number) {
      raf = requestAnimationFrame(tick);
      if (hidden) return;
      if (now - last < 1000 / 28) return;
      last = now;

      ctx.fillStyle = "rgba(0,0,0,0.16)";
      ctx.fillRect(0, 0, width, height);

      for (const col of cols) {
        col.y += col.speed * 1.15;

        for (let i = 0; i < col.length; i++) {
          const cy = col.y - i * FONT;
          if (cy < -FONT || cy > height) continue;
          const t = i / col.length;
          const alpha = (1 - t) * col.scale * 0.9;
          if (alpha <= 0.02) continue;
          const l = Math.max(0.04, 1 - t);
          const g = Math.round(225 * l);
          ctx.fillStyle = `rgba(${g},${g},${g},${alpha})`;
          const ch = col.chars[(col.headIdx - i + col.length * 4) % col.length];
          ctx.fillText(ch, col.x, cy);
        }

        if (col.y > height + col.length * FONT) {
          col.y = -Math.random() * 100;
          col.chars = col.chars.map(() => pick(CHARS));
        } else if (Math.random() < 0.018) {
          col.chars[col.headIdx % col.length] = pick(CHARS);
        }
      }
    }

    function start() {
      ctx.fillStyle = "rgba(0,0,0,1)";
      ctx.fillRect(0, 0, width, height);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    }

    const onVisibility = () => {
      hidden = document.hidden;
      if (hidden) return;
      // limpiar el rastro al volver
      ctx.fillStyle = "rgba(0,0,0,1)";
      ctx.fillRect(0, 0, width, height);
    };

    const onResize = () => {
      build();
      start();
    };

    build();
    if (reduceMotion) {
      ctx.fillStyle = "rgba(0,0,0,1)";
      ctx.fillRect(0, 0, width, height);
      for (const col of cols) {
        for (let i = 0; i < col.length; i++) {
          const cy = 0 - i * FONT + col.y;
          if (cy < -FONT || cy > height) continue;
          const t = i / col.length;
          const alpha = (1 - t) * col.scale * 0.8;
          if (alpha <= 0.02) continue;
          const l = 1 - t;
          ctx.fillStyle = `rgba(${Math.round(255 * l)},${Math.round(
            255 * l
          )},${Math.round(255 * l)},${alpha})`;
          ctx.fillText(col.chars[i % col.chars.length], col.x, cy);
        }
      }
    } else {
      start();
    }

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 opacity-70 blur-[2px]"
    />
  );
}