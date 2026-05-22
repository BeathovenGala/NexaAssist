"use client";

import gsap from "gsap";
import { useCallback, useEffect, useRef, useState } from "react";

const SESSION_KEY = "nexaassist_site_intro_v1";

function hasSeenIntro(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return true;
  }
}

function markSeen(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
}

function shouldSkip(): boolean {
  if (typeof window === "undefined") return true;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
  /* skip on very low-end mobile */
  const mobile = window.innerWidth < 768;
  const weak =
    typeof navigator !== "undefined" &&
    "hardwareConcurrency" in navigator &&
    navigator.hardwareConcurrency <= 2;
  return mobile && weak;
}

type Particle = {
  x: number; y: number;
  vx: number; vy: number;
  r: number; a: number; hue: number;
};

type Props = { onComplete: () => void };

export function SiteIntroOverlay({ onComplete }: Props) {
  /* Always mount; visibility controlled via opacity / pointer-events */
  const [visible, setVisible] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const rafRef     = useRef(0);
  const doneRef    = useRef(false);

  const exit = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    markSeen();
    cancelAnimationFrame(rafRef.current);

    if (overlayRef.current) {
      gsap.to(overlayRef.current, {
        scale: 1.07,
        filter: "blur(16px)",
        opacity: 0,
        duration: 0.65,
        ease: "power2.in",
        onComplete: () => {
          setVisible(false);
          onComplete();
        },
      });
    } else {
      setVisible(false);
      onComplete();
    }
  }, [onComplete]);

  /* ── Decide whether to play ── */
  useEffect(() => {
    if (hasSeenIntro() || shouldSkip()) {
      /* skip entirely — call onComplete on next tick so state is settled */
      const id = setTimeout(onComplete, 0);
      setVisible(false);
      return () => clearTimeout(id);
    }
    /* else: visible=true, animations start below */
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Text / timeline animation ── */
  useEffect(() => {
    if (!visible || !overlayRef.current) return;

    const root   = overlayRef.current;
    const chars  = root.querySelectorAll<HTMLElement>(".ic");
    const sub    = root.querySelector<HTMLElement>(".intro-sub");
    const status = root.querySelector<HTMLElement>(".intro-status");
    const bar    = root.querySelector<HTMLElement>(".intro-bar-fill");

    /* set initial states */
    gsap.set(chars,  { opacity: 0, y: 18, filter: "blur(6px)", rotateX: -40 });
    gsap.set(sub,    { opacity: 0, y: 10 });
    gsap.set(status, { opacity: 0 });
    if (bar) gsap.set(bar, { scaleX: 0, transformOrigin: "left center" });

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.to(chars, {
      opacity: 1, y: 0, filter: "blur(0px)", rotateX: 0,
      duration: 0.45, stagger: 0.048,
    })
    .to(sub,    { opacity: 1, y: 0, duration: 0.4 }, "-=0.15")
    .to(status, { opacity: 1, duration: 0.3 },       "+=0.05");

    if (bar) {
      tl.to(bar, { scaleX: 1, duration: 1.1, ease: "power1.inOut" }, "+=0.0")
        .call(exit, [], "+=0.05");
    } else {
      tl.call(exit, [], "+=1.2");
    }

    return () => { tl.kill(); };
  }, [visible, exit]);

  /* ── Constellation particle canvas ── */
  useEffect(() => {
    if (!visible || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    if (!ctx) return;

    const COUNT    = window.innerWidth < 768 ? 55 : 110;
    const LINK     = 130;
    const FADE_START  = 650;
    const FADE_DUR    = 900;
    const startMs  = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
      canvas.width  = window.innerWidth  * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width  = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const ps: Particle[] = Array.from({ length: COUNT }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.38,
      vy: (Math.random() - 0.5) * 0.38,
      r:  0.8 + Math.random() * 1.9,
      a:  0.3 + Math.random() * 0.6,
      hue: 210 + Math.random() * 75,
    }));

    const tick = (now: number) => {
      const elapsed = now - startMs;
      const ga = Math.min(1, Math.max(0, (elapsed - FADE_START) / FADE_DUR));

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      for (const p of ps) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < -10) p.x = window.innerWidth + 10;
        else if (p.x > window.innerWidth + 10) p.x = -10;
        if (p.y < -10) p.y = window.innerHeight + 10;
        else if (p.y > window.innerHeight + 10) p.y = -10;
      }

      /* links */
      for (let i = 0; i < ps.length; i++) {
        for (let j = i + 1; j < ps.length; j++) {
          const dx = ps[i].x - ps[j].x, dy = ps[i].y - ps[j].y;
          const d2 = dx * dx + dy * dy;
          if (d2 < LINK * LINK) {
            const prox = 1 - Math.sqrt(d2) / LINK;
            ctx.globalAlpha = prox * 0.22 * ga;
            ctx.strokeStyle = `hsl(${(ps[i].hue + ps[j].hue) / 2},80%,65%)`;
            ctx.lineWidth = 0.55;
            ctx.beginPath();
            ctx.moveTo(ps[i].x, ps[i].y);
            ctx.lineTo(ps[j].x, ps[j].y);
            ctx.stroke();
          }
        }
      }

      /* dots */
      for (const p of ps) {
        const col = `hsl(${p.hue},85%,68%)`;
        ctx.globalAlpha = p.a * ga;
        ctx.shadowBlur  = 7;
        ctx.shadowColor = col;
        ctx.fillStyle   = col;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur  = 0;

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [visible]);

  if (!visible) return null;

  const BRAND = "NexaAssist";

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black will-change-transform"
      style={{ perspective: "900px" }}
      aria-live="polite"
    >
      {/* Grain */}
      <div className="na-intro-grain pointer-events-none absolute inset-0 opacity-30" aria-hidden />

      {/* Radial vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 65% 55% at 50% 50%, transparent 25%, rgba(0,0,0,0.7) 100%)",
        }}
        aria-hidden
      />

      {/* Particle canvas */}
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" aria-hidden />

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center gap-5 text-center">
        {/* Brand name */}
        <h1
          className="text-[clamp(2.5rem,7vw,4.8rem)] font-bold tracking-[0.14em] text-white"
          aria-label={BRAND}
          style={{ textShadow: "0 0 60px rgba(100,160,255,0.55), 0 0 120px rgba(80,100,255,0.22)" }}
        >
          {BRAND.split("").map((ch, i) => (
            <span key={i} className="ic inline-block" style={{ willChange: "transform, opacity, filter" }}>
              {ch}
            </span>
          ))}
        </h1>

        {/* Subtitle */}
        <p
          className="intro-sub font-mono text-[11px] uppercase tracking-[0.28em]"
          style={{ color: "rgba(100,170,255,0.62)" }}
        >
          Unified intelligence platform
        </p>

        {/* Progress bar */}
        <div
          className="mt-1 h-px w-48 overflow-hidden rounded-full"
          style={{ background: "rgba(80,120,255,0.14)" }}
        >
          <div
            className="intro-bar-fill h-full"
            style={{
              background: "linear-gradient(90deg, #3060ff, #8040ff, #30c0ff)",
              boxShadow: "0 0 8px rgba(80,140,255,0.7)",
            }}
          />
        </div>

        {/* Status */}
        <div
          className="intro-status flex items-center gap-2 font-mono text-[10px] tracking-wider"
          style={{ color: "rgba(80,160,255,0.48)" }}
        >
          <span
            className="h-1.5 w-1.5 animate-pulse rounded-full"
            style={{ background: "#5cc8ff", boxShadow: "0 0 6px #5cc8ff" }}
            aria-hidden
          />
          Initializing secure workspace
          <span className="animate-pulse">_</span>
        </div>
      </div>

      {/* Corner brackets */}
      <div
        className="pointer-events-none absolute left-8 top-8 h-8 w-8"
        style={{ border: "1px solid rgba(80,120,255,0.2)", borderRight: "none", borderBottom: "none" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-8 right-8 h-8 w-8"
        style={{ border: "1px solid rgba(80,120,255,0.2)", borderLeft: "none", borderTop: "none" }}
        aria-hidden
      />

      {/* Skip */}
      <button
        type="button"
        onClick={exit}
        className="absolute bottom-8 right-20 font-mono text-[11px] opacity-25 transition-opacity hover:opacity-60"
        style={{ color: "rgba(150,175,230,1)" }}
        aria-label="Skip intro"
      >
        skip ↵
      </button>
    </div>
  );
}
