"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { HeroMockup } from "./HeroMockup";

const Hero3DSlot = dynamic(
  () => import("./hero/Hero3DSlot").then((m) => m.Hero3DSlot),
  {
    ssr: false,
    loading: () => (
      <div
        className="absolute inset-0 animate-pulse rounded-2xl opacity-30"
        style={{ background: "rgba(18, 20, 28, 0.8)" }}
        aria-hidden
      />
    ),
  },
);

export function HeroVisualStage() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [show3d, setShow3d] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShow3d(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={wrapRef}
      className="landing-hero-stage-wrap relative mx-auto mt-12 w-full max-w-[1100px] px-4 sm:mt-16"
    >
      <div className="landing-hero-stage relative">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[min(40vh,320px)] overflow-hidden rounded-2xl opacity-40"
          aria-hidden
        >
          {show3d ? (
            <div className="h-full w-full scale-110">
              <Hero3DSlot introComplete />
            </div>
          ) : null}
        </div>

        <div className="relative z-10 pt-[min(18vh,140px)]">
          <HeroMockup variant="dark" />
        </div>
      </div>
    </div>
  );
}
