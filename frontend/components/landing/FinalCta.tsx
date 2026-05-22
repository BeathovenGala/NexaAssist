"use client";

import { AuthModalTrigger } from "@/components/auth/AuthModalTrigger";
import { FINAL_CTA } from "./copy";

export function FinalCta() {
  return (
    <section
      id="cta"
      aria-labelledby="cta-heading"
      className="relative"
      style={{ background: "rgba(3,5,18,0.98)" }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(80,110,200,0.22), transparent)" }}
        aria-hidden
      />

      <div className="mx-auto max-w-[1280px] px-6 py-24 sm:px-12 sm:py-32">
        <div className="na-glass-card relative overflow-hidden rounded-3xl px-8 py-20 text-center sm:px-16">
          <div
            className="pointer-events-none absolute -top-20 left-1/4 h-80 w-80 rounded-full opacity-30 blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(70,110,255,0.6), transparent 70%)" }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-20 right-1/4 h-72 w-72 rounded-full opacity-20 blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(120,60,220,0.6), transparent 70%)" }}
            aria-hidden
          />

          <div className="relative">
            <p
              className="font-mono text-[11px] font-medium uppercase tracking-[0.22em]"
              style={{ color: "rgba(100,180,255,0.7)" }}
            >
              {FINAL_CTA.eyebrow}
            </p>

            <h2
              id="cta-heading"
              className="na-display mt-4 text-3xl tracking-tight text-white sm:text-5xl"
              style={{ textShadow: "0 0 60px rgba(80,130,255,0.3)" }}
            >
              {FINAL_CTA.title}
            </h2>

            <p
              className="mx-auto mt-5 max-w-xl text-base leading-relaxed sm:text-lg"
              style={{ color: "rgba(175,200,240,0.62)" }}
            >
              {FINAL_CTA.body}
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <AuthModalTrigger
                modal="register"
                className="group relative inline-flex min-h-[48px] items-center justify-center overflow-hidden rounded-full px-10 py-4 text-sm font-semibold text-white transition-all duration-300 hover:scale-[1.03]"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(60,110,230,0.9) 0%, rgba(90,50,210,0.9) 100%)",
                  border: "1px solid rgba(120,160,255,0.3)",
                  boxShadow: "0 0 30px rgba(70,130,230,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
                }}
              >
                <span className="relative z-10">{FINAL_CTA.primary.label}</span>
                <span
                  className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(85,145,255,0.9) 0%, rgba(110,65,235,0.9) 100%)",
                  }}
                />
              </AuthModalTrigger>

              <AuthModalTrigger
                modal="login"
                className="inline-flex min-h-[48px] items-center justify-center rounded-full border px-10 py-4 text-sm font-semibold transition-all duration-300 hover:scale-[1.03] hover:bg-white/[0.06]"
                style={{
                  borderColor: "rgba(150,185,255,0.28)",
                  color: "rgba(200,220,255,0.82)",
                  backdropFilter: "blur(8px)",
                }}
              >
                {FINAL_CTA.secondary.label}
              </AuthModalTrigger>
            </div>

            <div
              className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs"
              style={{ color: "rgba(140,165,220,0.45)" }}
            >
              {["Tenant-isolated by default", "Invite-only onboarding", "Audit trails included", "RBAC on every action"].map(
                (item) => (
                  <span key={item} className="flex items-center gap-1.5">
                    <span style={{ color: "rgba(80,160,255,0.6)" }}>✓</span>
                    {item}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
