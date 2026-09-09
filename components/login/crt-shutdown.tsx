"use client";

import { useEffect, useRef } from "react";

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function CrtShutdown({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const elem = canvasRef.current;
    if (!elem) return;
    const context = elem.getContext("2d");
    if (!context) return;
    const canvas = elem;
    const ctx = context;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth;
    const Hh = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = Hh * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${Hh}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const start = performance.now();
    let raf = 0;
    let notified = false;

    const FLASH = 130;
    const COLLAPSE = 620;
    const LINE = 300;

    function frame(now: number) {
      const t = now - start;
      const cy = Hh / 2;

      ctx.fillStyle = "rgb(0,0,0)";
      ctx.fillRect(0, 0, W, Hh);

      // ---- destello: pantalla encendida a 100% con scanlines, se corta pronto
      const flash = clamp(1 - t / FLASH, 0, 1);
      if (flash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${flash.toFixed(3)})`;
        ctx.fillRect(0, 0, W, Hh);
        if (flash > 0.35) {
          ctx.fillStyle = "rgba(0,0,0,0.24)";
          for (let i = 1; i < 11; i++) {
            const yy = (i / 11) * Hh;
            ctx.fillRect(0, yy - 1, W, 2);
          }
        }
      }

      // ---- colapso de la imagen: la banda brillante se aplasta al centro
      //      con curvatura (reloj de arena) y parpadeo de fósforo
      if (t >= FLASH) {
        const p = Math.min(1, Math.pow((t - FLASH) / COLLAPSE, 1.6));
        const bandH = Math.max(0, Hh * (1 - p));
        const bow = Hh * 0.075 * p;
        const delta = W * (1 - p * 0.55);
        const x0 = (W - delta) / 2;
        const flicker = Math.sin(t / 26) > 0 ? 0.96 : 0.5;

        if (bandH > 0.9) {
          const step = Math.max(4, delta / (delta / 3.5));
          for (let x = x0; x <= W - x0; x += step) {
            const shape = Math.sin(Math.PI * (x - x0) / delta);
            const yTop = cy - bandH / 2 + bow * shape;
            const yBot = cy + bandH / 2 - bow * shape;
            ctx.fillStyle = `rgba(255,255,255,${flicker.toFixed(3)})`;
            ctx.fillRect(x, yTop, Math.max(step, 3.5), Math.max(0.6, yBot - yTop));
          }
        }
      }

      // ---- línea final: se acorta y parpadea hasta apagarse
      if (t >= FLASH + COLLAPSE) {
        const lp = clamp((t - FLASH - COLLAPSE) / LINE, 0, 1);
        const lenW = Math.max(0, W * (1 - lp));
        const bright = (0.22 + 0.78 * Math.abs(Math.sin(t / 26))) * (1 - lp);
        if (lenW > 1) {
          ctx.fillStyle = `rgba(255,255,255,${clamp(bright, 0, 1).toFixed(3)})`;
          ctx.fillRect((W - lenW) / 2, cy - 1, lenW, 2);
        }
      }

      if (t >= FLASH + COLLAPSE + LINE) {
        if (!notified) {
          notified = true;
          ctx.fillStyle = "rgb(0,0,0)";
          ctx.fillRect(0, 0, W, Hh);
          onDoneRef.current();
        }
        cancelAnimationFrame(raf);
        return;
      }

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);

    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-auto fixed inset-0 z-50"
    />
  );
}