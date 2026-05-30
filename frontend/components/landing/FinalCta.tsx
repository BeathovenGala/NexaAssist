"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";

import { AuthModalTrigger } from "@/components/auth/AuthModalTrigger";
import { FINAL_CTA } from "./copy";
import { MarketingReveal } from "./MarketingReveal";
import { cn } from "@/lib/utils";

export function FinalCta() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reducedMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ rx: -y * 10, ry: x * 12 });
  };

  const onLeave = () => setTilt({ rx: 0, ry: 0 });

  return (
    <section className="marketing-section overflow-hidden bg-[var(--bg-section-3)] pb-28 pt-8">
      <div className="marketing-container" style={{ perspective: "1200px" }}>
        <MarketingReveal>
          <div
            ref={cardRef}
            onPointerMove={onMove}
            onPointerLeave={onLeave}
            className="relative mx-auto max-w-3xl"
            style={{
              transform: reducedMotion
                ? undefined
                : `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
              transformStyle: "preserve-3d",
              transition: reducedMotion ? undefined : "transform 0.35s ease-out",
            }}
          >
            <div
              className="pointer-events-none absolute -inset-4 rounded-[2rem] opacity-70 blur-2xl"
              style={{
                background:
                  "linear-gradient(135deg, rgba(46,212,199,0.35), rgba(78,231,213,0.2), rgba(29,181,169,0.15))",
                transform: "translateZ(-40px)",
              }}
              aria-hidden
            />

            <div
              className={cn(
                "ocean-glass-card relative overflow-hidden rounded-[1.75rem] p-10 text-center sm:p-12 md:p-14",
              )}
              style={{ transform: "translateZ(24px)" }}
            >
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[80%] -translate-x-1/2 rounded-full bg-teal-500/20 blur-3xl"
                aria-hidden
              />

              <p
                className="marketing-display text-3xl text-white sm:text-4xl md:text-[2.5rem] md:leading-tight"
                style={{ transform: "translateZ(32px)" }}
              >
                {FINAL_CTA.title}
              </p>
              <p
                className="mx-auto mt-4 max-w-lg text-base text-neutral-400 md:text-lg"
                style={{ transform: "translateZ(20px)" }}
              >
                {FINAL_CTA.body}
              </p>

              <div
                className="mt-10 flex flex-wrap justify-center gap-4"
                style={{ transform: "translateZ(40px)" }}
              >
                <AuthModalTrigger modal="register" className="ocean-glass-btn flex h-11 items-center justify-center rounded-3xl px-7 text-sm font-semibold">
                  {FINAL_CTA.primary.label}
                </AuthModalTrigger>
                <AuthModalTrigger modal="login" className="ocean-glass-btn flex h-11 items-center justify-center rounded-3xl px-7 text-sm font-semibold">
                  {FINAL_CTA.secondary.label}
                </AuthModalTrigger>
              </div>

              <ul
                className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-3"
                style={{ transform: "translateZ(16px)" }}
              >
                {FINAL_CTA.trustBullets.map((b) => (
                  <li
                    key={b}
                    className="flex items-center gap-2 text-xs tracking-wide text-neutral-500 uppercase"
                  >
                    <Check className="h-3.5 w-3.5 text-emerald-500/80" strokeWidth={2.5} />
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            <div
              className="pointer-events-none absolute -bottom-6 left-[8%] right-[8%] h-8 rounded-[100%] bg-teal-900/40 blur-xl"
              style={{ transform: "translateZ(-20px) rotateX(90deg)" }}
              aria-hidden
            />
          </div>
        </MarketingReveal>
      </div>
    </section>
  );
}
