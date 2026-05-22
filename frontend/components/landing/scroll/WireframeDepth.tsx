"use client";

import { useEffect, useRef } from "react";

const SCROLL_PROGRESS_VAR = "--na-scroll-progress";

type WireframeDepthProps = {
  chapterIndex: number;
};

function readScrollProgress(canvas: HTMLCanvasElement): number {
  const host = canvas.closest(".na-pinned-chapter");
  if (!host) return 0;
  const raw = getComputedStyle(host).getPropertyValue(SCROLL_PROGRESS_VAR).trim();
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function WireframeDepth({ chapterIndex }: WireframeDepthProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let lastProgress = -1;
    let lastSize = "";

    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w === 0 || h === 0) return;

      const progress = readScrollProgress(canvas);
      const sizeKey = `${w}x${h}`;
      if (progress === lastProgress && sizeKey === lastSize && canvas.width > 0) return;
      lastProgress = progress;
      lastSize = sizeKey;

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const cyan =
        getComputedStyle(document.documentElement).getPropertyValue("--na-cyan").trim() ||
        "#46eaed";

      const offset = progress * 80 + chapterIndex * 40;
      const horizon = h * 0.55 + Math.sin(progress * Math.PI) * 24;

      ctx.strokeStyle = cyan;
      ctx.globalAlpha = 0.12;

      for (let i = 0; i < 14; i++) {
        const y = horizon + i * 18 + offset * 0.15;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      const vanishX = w * 0.72;
      for (let i = -8; i <= 8; i++) {
        ctx.beginPath();
        ctx.moveTo(vanishX, horizon - 40);
        ctx.lineTo(vanishX + i * 48, h + 40);
        ctx.stroke();
      }

      ctx.globalAlpha = 0.22;
      const rings = 6;
      const towerCx = vanishX + chapterIndex * 14;
      for (let r = 0; r < rings; r++) {
        const radius = 24 + r * 20 + progress * 36;
        const cy = horizon + 16 + r * 10 - progress * 12;
        ctx.beginPath();
        ctx.ellipse(towerCx, cy, radius * 1.5, radius * 0.32, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.globalAlpha = 0.35;
      for (let t = 0; t < 3; t++) {
        const stackY = horizon + 8 + t * (14 + progress * 10);
        ctx.beginPath();
        ctx.ellipse(towerCx, stackY, 18 + t * 6, 5 + t * 2, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    };

    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };
    loop();

    const onResize = () => {
      lastProgress = -1;
      lastSize = "";
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [chapterIndex]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full opacity-90"
      aria-hidden
    />
  );
}
