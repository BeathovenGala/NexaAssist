"use client";

import { useRef, useState } from "react";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

export interface PricingPlan {
  name: string;
  price: string;
  yearlyPrice: string;
  period: string;
  features: string[];
  description: string;
  buttonText: string;
  href: string;
  isPopular: boolean;
  onCtaClick?: () => void;
}

interface PricingProps {
  plans: PricingPlan[];
  title?: string;
  description?: string;
}

function parsePrice(value: string): number | null {
  const n = parseFloat(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function Pricing({
  plans,
  title = "Simple, Transparent Pricing",
  description = "Choose the plan that works for you.",
}: PricingProps) {
  const [isMonthly, setIsMonthly] = useState(true);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const switchRef = useRef<HTMLButtonElement>(null);

  const handleToggle = (checked: boolean) => {
    setIsMonthly(!checked);
    if (checked && switchRef.current) {
      const rect = switchRef.current.getBoundingClientRect();
      confetti({
        particleCount: 50,
        spread: 60,
        origin: {
          x: (rect.left + rect.width / 2) / window.innerWidth,
          y: (rect.top + rect.height / 2) / window.innerHeight,
        },
        colors: ["#ffffff", "#111111", "#333333", "#888888"],
        ticks: 200,
        gravity: 1.2,
        decay: 0.94,
        startVelocity: 30,
        shapes: ["circle"],
      });
    }
  };

  return (
    <div className="marketing-container py-20">
      <div className="mb-12 space-y-4 text-center">
        <h2 className="marketing-display text-4xl font-bold tracking-tight sm:text-5xl">
          {title}
        </h2>
        <p className="text-lg whitespace-pre-line text-[var(--mk-muted)]">{description}</p>
      </div>

      <div className="mb-10 flex items-center justify-center">
        <label className="relative inline-flex cursor-pointer items-center">
          <Label>
            <Switch
              ref={switchRef}
              checked={!isMonthly}
              onCheckedChange={handleToggle}
            />
          </Label>
        </label>
        <span className="ml-2 font-semibold text-white">
          Annual billing <span className="text-neutral-400">(Save 20%)</span>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {plans.map((plan, index) => {
          const displayRaw = isMonthly ? plan.price : plan.yearlyPrice;
          const numeric = parsePrice(displayRaw);

          return (
            <motion.div
              key={plan.name}
              initial={{ y: 50, opacity: 1 }}
              whileInView={
                isDesktop
                  ? {
                      y: plan.isPopular ? -20 : 0,
                      opacity: 1,
                      x: index === 2 ? -30 : index === 0 ? 30 : 0,
                      scale: index === 0 || index === 2 ? 0.94 : 1.0,
                    }
                  : {}
              }
              viewport={{ once: true }}
              transition={{
                duration: 1.6,
                type: "spring",
                stiffness: 100,
                damping: 30,
                delay: 0.4,
                opacity: { duration: 0.5 },
              }}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-neutral-950 p-6 text-center lg:flex lg:flex-col lg:justify-center",
                plan.isPopular ? "border-2 border-white/40" : "border-white/10",
                !plan.isPopular && "mt-5",
              )}
            >
              {plan.isPopular && (
                <div className="absolute top-0 right-0 flex items-center rounded-bl-xl rounded-tr-xl bg-white py-0.5 px-2">
                  <Star className="h-4 w-4 fill-current text-black" />
                  <span className="ml-1 font-semibold text-black">Popular</span>
                </div>
              )}
              <div className="flex flex-1 flex-col">
                <p className="text-base font-semibold text-neutral-400">{plan.name}</p>
                <div className="mt-6 flex items-center justify-center gap-x-2">
                  <span className="text-5xl font-bold tracking-tight text-white">
                    {numeric === null && !displayRaw.match(/^\d/)
                      ? displayRaw
                      : numeric !== null
                        ? `$${displayRaw}`
                        : displayRaw}
                  </span>
                  {numeric !== null && plan.period && (
                    <span className="text-sm leading-6 font-semibold tracking-wide text-neutral-400">
                      / {plan.period}
                    </span>
                  )}
                </div>
                {numeric !== null && (
                  <p className="text-xs leading-5 text-neutral-400">
                    {isMonthly ? "billed monthly" : "billed annually"}
                  </p>
                )}
                <ul className="mt-5 flex flex-col gap-2">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="mt-1 h-4 w-4 shrink-0 text-white" />
                      <span className="text-left text-sm text-neutral-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <hr className="my-4 w-full border-white/10" />
                {plan.onCtaClick ? (
                  <button
                    type="button"
                    onClick={plan.onCtaClick}
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "group relative w-full gap-2 overflow-hidden text-lg font-semibold tracking-tighter transition-all duration-300",
                      plan.isPopular
                        ? "bg-white text-black hover:bg-white/90"
                        : "border-white/20 bg-transparent text-white hover:bg-white hover:text-black",
                    )}
                  >
                    {plan.buttonText}
                  </button>
                ) : (
                  <a
                    href={plan.href}
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "group relative w-full gap-2 overflow-hidden text-lg font-semibold tracking-tighter",
                      plan.isPopular
                        ? "bg-white text-black"
                        : "border-white/20 text-white",
                    )}
                  >
                    {plan.buttonText}
                  </a>
                )}
                <p className="mt-6 text-xs leading-5 text-neutral-500">{plan.description}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
