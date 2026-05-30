"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";

import { SpiralAnimation } from "@/components/ui/spiral-animation";
import { BRAND } from "@/components/landing/copy";
import { markIntroSeen } from "@/lib/intro-storage";
import { preloadSplineAssets } from "@/lib/spline-preload";
import { cn } from "@/lib/utils";

const SplineWarmup = dynamic(
  () => import("@/components/ui/spline-warmup").then((m) => m.SplineWarmup),
  { ssr: false },
);

// Increase auto-dismiss so users can read the intro comfortably
const AUTO_DISMISS_MS = 2500;

/**
 * Intro gate that auto-dismisses after timeout or on click.
 * Home content loads in background while intro overlay is visible (z-10000).
 */
export function SiteIntroGate({ children }: { children: React.ReactNode }) {
  const [showOverlay, setShowOverlay] = useState(true);
  const [copyVisible, setCopyVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [zoomExit, setZoomExit] = useState(false);
  const dismissedRef = useRef(false);

  useEffect(() => {
    preloadSplineAssets();
    const copyTimer = window.setTimeout(() => setCopyVisible(true), 600);
    return () => window.clearTimeout(copyTimer);
  }, []);

  const dismiss = useCallback((mode: "auto" | "manual") => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setExiting(true);
    if (mode === "auto") setZoomExit(true);
    markIntroSeen();

    const duration = mode === "auto" ? 1100 : 650;
    window.setTimeout(() => {
      setShowOverlay(false);
    }, duration);
  }, []);

  useEffect(() => {
    if (!showOverlay) return;

    const autoTimer = window.setTimeout(() => dismiss("auto"), AUTO_DISMISS_MS);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") dismiss("manual");
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.clearTimeout(autoTimer);
      window.removeEventListener("keydown", onKey);
    };
  }, [showOverlay, dismiss]);

  return (
    <>
      <SplineWarmup />
      {children}
      {showOverlay && (
        <div
          className={cn(
            "fixed inset-0 z-[10000] overflow-hidden bg-teal-950/80 backdrop-blur-3xl will-change-transform",
            exiting
              ? cn(
                  "pointer-events-none transition-all ease-in",
                  zoomExit ? "scale-[1.2] opacity-0 duration-[1100ms]" : "opacity-0 duration-700",
                )
              : "opacity-100",
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Welcome"
          onClick={() => dismiss("manual")}
        >
          <div className="absolute inset-0">
            <SpiralAnimation />
          </div>

          <div
            className={cn(
              "absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center transition-opacity duration-700 ease-out",
              copyVisible ? "opacity-100" : "opacity-0",
              exiting && zoomExit && "scale-110 opacity-0",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="marketing-display text-2xl tracking-[0.12em] text-white sm:text-3xl md:text-4xl">
              {BRAND.name}
            </p>
            <button
              type="button"
              onClick={() => dismiss("manual")}
              className="mt-8 text-xs tracking-widest text-white/40 uppercase transition-colors hover:text-white/70"
            >
              Skip intro
            </button>
          </div>
        </div>
      )}
    </>
  );
}