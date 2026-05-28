"use client";

import { INTRO } from "@/components/landing/copy";

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function hasSeenIntro(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(INTRO.sessionKey) === "1";
  } catch {
    return false;
  }
}

export function markIntroSeen(): void {
  try {
    sessionStorage.setItem(INTRO.sessionKey, "1");
  } catch {
    /* ignore */
  }
}

export function shouldPlayIntro(): boolean {
  if (prefersReducedMotion()) return false;
  return !hasSeenIntro();
}

export const MOTION = {
  easeOut: "power2.out",
  easeInOut: "power3.inOut",
  heroEase: "power3.out",
  scrubEase: "none",
  introMaxMs: 2800,
  revealStagger: 0.08,
  heroStagger: 0.09,
  heroDuration: 0.85,
  navDuration: 0.5,
  stageScrubStart: "top 85%",
  stageScrubEnd: "top 25%",
} as const;
