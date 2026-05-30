"use client";

import { Fingerprint, History, Server, ShieldCheck, Users } from "lucide-react";

import { SECURITY_BAND } from "./copy";
import { MarketingReveal } from "./MarketingReveal";
import { cn } from "@/lib/utils";

const BULLET_META = [
  { icon: Server, accent: "from-sky-500/25 to-cyan-500/5", ring: "ring-sky-400/35" },
  { icon: Users, accent: "from-violet-500/25 to-purple-500/5", ring: "ring-violet-400/35" },
  { icon: Fingerprint, accent: "from-emerald-500/25 to-teal-500/5", ring: "ring-emerald-400/35" },
  { icon: History, accent: "from-amber-500/25 to-orange-500/5", ring: "ring-amber-400/30" },
] as const;

export function SecurityBand() {
  return (
    <section
      id="security"
      aria-labelledby="security-heading"
      className="relative overflow-hidden bg-black py-20 md:py-28"
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background: `
            radial-gradient(ellipse 55% 45% at 20% 40%, rgba(139, 92, 246, 0.14), transparent 60%),
            radial-gradient(ellipse 50% 40% at 80% 60%, rgba(56, 189, 248, 0.1), transparent 55%),
            linear-gradient(180deg, #000000 0%, #050508 50%, #000000 100%)
          `,
        }}
      />

      <div className="marketing-container relative">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 lg:items-start">
          <MarketingReveal>
            <div className="max-w-lg lg:sticky lg:top-28">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 backdrop-blur-md">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" strokeWidth={2} />
                {SECURITY_BAND.eyebrow}
              </div>
              <h2
                id="security-heading"
                className="marketing-display text-3xl text-white sm:text-4xl md:text-[2.65rem] md:leading-[1.12]"
              >
                {SECURITY_BAND.title}
              </h2>
              <p className="mt-5 text-base leading-relaxed text-white/65 md:text-lg">
                {SECURITY_BAND.body}
              </p>
            </div>
          </MarketingReveal>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {SECURITY_BAND.bullets.map((bullet, index) => {
              const meta = BULLET_META[index % BULLET_META.length];
              const Icon = meta.icon;
              return (
                <MarketingReveal key={bullet}>
                  <article
                    className={cn(
                      "group relative overflow-hidden rounded-2xl border border-white/10 p-5 backdrop-blur-md transition duration-300",
                      "hover:border-white/20 hover:-translate-y-0.5",
                      `bg-gradient-to-br ${meta.accent}`,
                    )}
                  >
                    <div
                      className={cn(
                        "mb-4 flex h-11 w-11 items-center justify-center rounded-xl border bg-black/40 ring-1",
                        meta.ring,
                      )}
                    >
                      <Icon className="h-5 w-5 text-white/90" strokeWidth={1.75} />
                    </div>
                    <p className="text-sm leading-relaxed text-white/90">{bullet}</p>
                  </article>
                </MarketingReveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
