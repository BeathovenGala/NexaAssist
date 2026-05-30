"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

import { AuthModalTrigger } from "@/components/auth/AuthModalTrigger";
import { AnimatedGroup } from "@/components/ui/animated-group";
import { SpotlightAceternity } from "@/components/ui/spotlight-aceternity";
import { StarButton } from "@/components/ui/star-button";

import { WebGLFallback } from "@/components/ui/webgl-fallback";
import { useWebGLAvailable } from "@/lib/use-webgl-available";

import { HeroDashboardPreview } from "./HeroDashboardPreview";
import { HERO } from "./copy";
import { loginDemo } from "@/lib/demo-auth";
import { useAuth } from "@/lib/auth";
import { useToastStore } from "@/lib/store/toast";

const WebGLShader = dynamic(
  () => import("@/components/ui/web-gl-shader").then((m) => m.WebGLShader),
  { ssr: false },
);

import { Warp } from "@paper-design/shaders-react";

const transitionVariants = {
  item: {
    hidden: {
      opacity: 0,
      filter: "blur(12px)",
      y: 12,
    },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: {
        type: "spring" as const,
        bounce: 0.3,
        duration: 1.5,
      },
    },
  },
};

export function MarketingHero() {
  const router = useRouter();
  const [reducedMotion, setReducedMotion] = useState(false);
  const [exploreLoading, setExploreLoading] = useState(false);
  const { refreshMe } = useAuth();
  const showToast = useToastStore((state) => state.show);
  const webglAvailable = useWebGLAvailable();

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const showWebGLShader = !reducedMotion && webglAvailable === true;
  const showShaderFallback =
    reducedMotion || webglAvailable === false || webglAvailable === null;

  const handleExploreClick = () => {
    const el = document.getElementById("orbit");
    el?.scrollIntoView({ behavior: "smooth" });
  };

  const handleDemoClick = async () => {
    setExploreLoading(true);
    try {
      const success = await loginDemo();
      if (!success) {
        showToast("Demo access is temporarily unavailable.", "error");
        return;
      }
      await refreshMe();
      router.replace("/dashboard");
    } catch (error) {
      console.error("Demo login failed:", error);
      showToast("Demo access is temporarily unavailable.", "error");
    } finally {
      setExploreLoading(false);
    }
  };

  return (
    <section
      id="hero"
      aria-labelledby="hero-heading"
      className="relative w-full overflow-hidden bg-transparent"
    >
      <div className="absolute inset-0 z-0">
        <div className="absolute -top-[10%] -left-[10%] h-[40rem] w-[40rem] rounded-full bg-[hsl(200,100%,20%)] opacity-25 blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] h-[40rem] w-[40rem] rounded-full bg-[hsl(160,100%,75%)] opacity-25 blur-[120px]" />
        <div className="absolute top-[40%] left-[60%] h-[30rem] w-[30rem] rounded-full bg-[hsl(180,90%,30%)] opacity-20 blur-[100px]" />
        {showWebGLShader ? (
          <div className="absolute inset-0 opacity-100 pointer-events-none">
            <Warp
              style={{ height: "100%", width: "100%" }}
              proportion={0.45}
              softness={1}
              distortion={0.25}
              swirl={0.8}
              swirlIterations={10}
              shape="checks"
              shapeScale={0.1}
              scale={1}
              rotation={0}
              speed={1}
              colors={["hsl(200, 100%, 20%)", "hsl(160, 100%, 75%)", "hsl(180, 90%, 30%)", "hsl(170, 100%, 80%)"]}
            />
          </div>
        ) : null}
        {showShaderFallback ? (
          <WebGLFallback className="h-full w-full" />
        ) : null}
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 isolate z-[1] hidden opacity-40 contain-strict lg:block"
      >
        <div className="absolute top-0 left-0 h-[80rem] w-[35rem] -translate-y-[350px] -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,85%,0.08)_0,hsla(0,0%,55%,0.02)_50%,hsla(0,0%,45%,0)_80%)]" />
        <div className="absolute top-0 left-0 h-[80rem] w-56 -translate-y-1/2 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(280,60%,50%,0.08)_0,transparent_80%)]" />
      </div>

      <SpotlightAceternity className="-top-40 left-0 md:-top-20 md:left-60" fill="white" />

      <div className="relative z-10 pt-24 md:pt-32">
        <div className="marketing-container px-6">
          <div className="mx-auto max-w-4xl text-center">
            <AnimatedGroup variants={transitionVariants}>
              {HERO.statusLine ? (
                <div className="mx-auto flex w-fit items-center gap-3 rounded-full border border-white/10 bg-white/[0.06] py-1 pr-1 pl-4 shadow-lg shadow-black/20 backdrop-blur-md">
                  <span className="text-sm text-white/80">{HERO.statusLine}</span>
                  <span className="h-4 w-px bg-white/20" aria-hidden />
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white">
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </span>
                </div>
              ) : null}

              <p className="marketing-eyebrow mt-6 text-white/50">{HERO.eyebrow}</p>
              <h1
                id="hero-heading"
                className="mt-4 text-balance text-[clamp(2.25rem,5.5vw,4.25rem)] leading-[1.08] font-semibold tracking-[-0.04em] text-white"
              >
                {HERO.headline}
              </h1>
              {HERO.headlineLine2 ? (
                <p className="mt-3 text-balance text-[clamp(1.25rem,3vw,1.75rem)] font-medium tracking-[-0.02em] text-white/75">
                  {HERO.headlineLine2}
                </p>
              ) : null}
              <p className="mx-auto mt-6 max-w-2xl text-balance text-base leading-relaxed text-white/65 md:text-lg">
                {HERO.subcopy}
              </p>
            </AnimatedGroup>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <AuthModalTrigger modal="register" star={false} className="px-8 py-4 bg-white/20 backdrop-blur-md border border-white/30 rounded-full text-white font-medium hover:bg-white/30 transition-all duration-300 hover:scale-105">
                {HERO.ctas.primary.label}
              </AuthModalTrigger>
              <AuthModalTrigger modal="login" star={false} className="px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white font-medium hover:bg-white/20 transition-all duration-300 hover:scale-105">
                {HERO.ctas.secondary.label}
              </AuthModalTrigger>
              <button
                className="px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white font-medium hover:bg-white/20 transition-all duration-300 hover:scale-105"
                onClick={handleExploreClick}
                disabled={exploreLoading}
              >
                Explore Product
              </button>
              <button
                className="px-8 py-4 bg-white/20 backdrop-blur-md border border-white/30 rounded-full text-white font-medium hover:bg-white/30 transition-all duration-300 hover:scale-105"
                onClick={handleDemoClick}
                disabled={exploreLoading}
              >
                Try Demo Now
              </button>
            </div>
          </div>
        </div>

        <AnimatedGroup
          variants={{
            container: {
              visible: {
                transition: {
                  staggerChildren: 0.05,
                  delayChildren: 0.55,
                },
              },
            },
            ...transitionVariants,
          }}
          className="marketing-container relative mt-10 px-4 sm:mt-14 md:mt-16"
        >
          <div className="relative mx-auto max-w-6xl overflow-hidden px-1 sm:px-2">
            <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/10 backdrop-blur-lg p-2 shadow-2xl shadow-teal-900/40 ring-1 ring-white/10 sm:p-3 md:rounded-3xl md:p-4">
              <div className="overflow-hidden rounded-xl border border-white/[0.06] md:rounded-2xl">
                <HeroDashboardPreview />
              </div>
            </div>
          </div>
        </AnimatedGroup>
      </div>
    </section>
  );
}
