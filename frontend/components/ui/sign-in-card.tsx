"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { GlowCard } from "@/components/ui/glow-card";
import { GradientGlowFrame } from "@/components/ui/gradient-glow-frame";
import { cn } from "@/lib/utils";

type SignInCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  onClose?: () => void;
};

/** Dark NexaAssist auth panel — gradient + pointer glow (3dmk sign-in / gradient / spotlight) */
export function SignInCard({
  title,
  description,
  children,
  className,
  onClose,
}: SignInCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.24, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
      className="w-full"
    >
    <GlowCard customSize glowColor="purple" className={cn("w-full max-w-md p-0", className)}>
      <GradientGlowFrame className="w-full" innerClassName="bg-black/90 p-6 sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight text-white">{title}</h2>
            {description ? (
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">{description}</p>
            ) : null}
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-neutral-400 transition hover:border-white/30 hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden>
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          ) : null}
        </div>
        <div className="marketing-auth-form text-white [&_label]:text-neutral-300 [&_input]:border-white/15 [&_input]:bg-white/5 [&_input]:text-white">
          {children}
        </div>
      </GradientGlowFrame>
    </GlowCard>
    </motion.div>
  );
}
