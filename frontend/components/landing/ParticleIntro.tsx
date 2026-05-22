"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useCallback, useEffect, useRef, useState } from "react";
import { INTRO } from "./copy";
import { markIntroSeen, MOTION } from "@/lib/landing/motion";

type ParticleIntroProps = {
  onComplete: () => void;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  depth: number;
};

const REVEAL_ORDER = [
  "[data-reveal='gradients']",
  "[data-reveal='nav']",
  "[data-reveal='badge']",
  "[data-reveal='headline']",
  "[data-reveal='subcopy']",
  "[data-reveal='ctas']",
  "[data-reveal='scroll-hint']",
  "[data-reveal='feature-card']",
];

export function ParticleIntro({ onComplete }: ParticleIntroProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef(0);
  const startRef = useRef(0);
  const revealedRef = useRef(false);
  const finishedRef = useRef(false);
  const [visible, setVisible] = useState(true);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    markIntroSeen();
    setVisible(false);
    onComplete();
  }, [onComplete]);

  useGSAP(
    () => {
      const label = overlayRef.current?.querySelector(".na-intro-label");
      if (label) {
        gsap.fromTo(
          label,
          { opacity: 0, y: 8 },
          { opacity: 0.7, y: 0, duration: 0.4, ease: MOTION.easeOut },
        );
        gsap.to(label, {
          opacity: 0,
          duration: 0.35,
          delay: 0.55,
          ease: MOTION.easeOut,
        });
      }
    },
    { scope: overlayRef },
  );

  const revealDom = useCallback(() => {
    if (revealedRef.current) return;
    revealedRef.current = true;
    gsap.to(REVEAL_ORDER.join(","), {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      stagger: MOTION.revealStagger,
      duration: 0.55,
      ease: MOTION.easeOut,
    });
  }, []);

  useEffect(() => {
    if (!visible) return;

    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const count = 1000;
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    particlesRef.current = Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4.5;
      const depth = Math.random();
      return {
        x: cx + (Math.random() - 0.5) * 120,
        y: cy + (Math.random() - 0.5) * 80,
        vx: Math.cos(angle) * speed * (0.6 + depth),
        vy: Math.sin(angle) * speed * (0.6 + depth),
        size: 0.6 + Math.random() * 1.8,
        alpha: 0.5 + Math.random() * 0.5,
        depth,
      };
    });

    startRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const t = Math.min(elapsed / MOTION.introMaxMs, 1);

      if (t > 0.4) revealDom();

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const fade = 1 - Math.pow(t, 1.4);
      overlay.style.opacity = String(Math.max(0, 1 - t * 1.1));

      for (const p of particlesRef.current) {
        p.x += p.vx * (1 + p.depth);
        p.y += p.vy * (1 + p.depth);
        p.alpha *= 0.985;
        ctx.globalAlpha = p.alpha * fade;
        ctx.fillStyle = p.depth > 0.5 ? "#a4c9ff" : "#46eaed";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (elapsed >= MOTION.introMaxMs) {
        window.removeEventListener("resize", resize);
        cancelAnimationFrame(rafRef.current);
        finish();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [visible, finish, revealDom]);

  if (!visible) return null;

  return (
    <div
      ref={overlayRef}
      className="na-particle-intro fixed inset-0 z-50 flex items-center justify-center bg-black"
      aria-hidden={!visible}
    >
      <div className="na-intro-grain pointer-events-none absolute inset-0" />
      <p className="na-intro-label relative z-10 font-mono text-sm tracking-widest text-[var(--na-cyan)]">
        {INTRO.label}
      </p>
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" />
    </div>
  );
}
