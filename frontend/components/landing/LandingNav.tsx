"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AuthModalTrigger } from "@/components/auth/AuthModalTrigger";
import { BRAND, NAV_LINKS } from "./copy";

type LandingNavProps = {
  cinematic?: boolean;
};

export function LandingNav({ cinematic = false }: LandingNavProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Close mobile menu on resize to desktop */
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const navBg = scrolled || !cinematic
    ? "border-b border-white/[0.06] backdrop-blur-2xl"
    : "border-b border-transparent";

  const navBgColor = scrolled || !cinematic
    ? "bg-[rgba(6,9,24,0.82)]"
    : "bg-transparent";

  return (
    <header
      ref={navRef}
      data-reveal="nav"
      className={`sticky top-0 z-40 transition-all duration-300 ${navBg} ${navBgColor}`}
    >
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-6 sm:px-10">
        {/* Logo */}
        <Link
          href="#top"
          className="flex items-center gap-2.5 text-base font-bold tracking-tight text-white transition hover:opacity-90"
        >
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-black text-[#010308]"
            style={{
              background: "linear-gradient(135deg, #6090ff 0%, #a060ff 100%)",
              boxShadow: "0 0 12px rgba(100,150,255,0.5)",
            }}
          >
            N
          </span>
          {BRAND.name}
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden items-center gap-7 text-sm md:flex" aria-label="Main navigation">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-medium transition-colors duration-200"
              style={{ color: "rgba(200,215,255,0.65)" }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.color = "rgba(220,235,255,0.95)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.color = "rgba(200,215,255,0.65)")
              }
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop auth — Sign in + Register */}
        <div className="hidden items-center gap-2.5 md:flex">
          <AuthModalTrigger
            modal="login"
            className="min-h-[40px] rounded-full border px-5 py-2 text-sm font-semibold transition-all duration-200 hover:bg-white/[0.08]"
            style={{
              borderColor: "rgba(160,185,255,0.32)",
              color: "rgba(210,225,255,0.9)",
              backdropFilter: "blur(8px)",
            }}
          >
            Sign in
          </AuthModalTrigger>
          <AuthModalTrigger
            modal="register"
            className="min-h-[40px] rounded-full px-5 py-2 text-sm font-semibold text-[#020618] transition-all duration-200 hover:brightness-110"
            style={{
              background: "rgba(220,230,255,0.92)",
              boxShadow: "0 2px 12px rgba(80,120,255,0.3)",
            }}
          >
            Register
          </AuthModalTrigger>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label="Toggle menu"
          className="flex h-9 w-9 items-center justify-center rounded-full border md:hidden"
          style={{
            borderColor: "rgba(160,185,255,0.2)",
            color: "rgba(200,220,255,0.8)",
          }}
          onClick={() => setMobileOpen((o) => !o)}
        >
          {mobileOpen ? (
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
              <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
              <path d="M2 4h12M2 8h12M2 12h12" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="border-t px-6 pb-6 pt-4 md:hidden"
          style={{
            borderColor: "rgba(160,185,255,0.1)",
            background: "rgba(6,9,24,0.97)",
          }}
        >
          <nav className="flex flex-col gap-4 text-sm">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                style={{ color: "rgba(200,215,255,0.7)" }}
                className="font-medium transition hover:text-white"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex gap-3 border-t pt-4" style={{ borderColor: "rgba(160,185,255,0.1)" }}>
              <AuthModalTrigger
                modal="login"
                className="flex-1 rounded-full border py-2.5 text-center text-sm font-semibold transition hover:bg-white/[0.06]"
                style={{
                  borderColor: "rgba(160,185,255,0.28)",
                  color: "rgba(210,225,255,0.85)",
                }}
                onClick={() => setMobileOpen(false)}
              >
                Sign in
              </AuthModalTrigger>
              <AuthModalTrigger
                modal="register"
                className="flex-1 rounded-full py-2.5 text-center text-sm font-semibold text-[#020618] hover:brightness-110"
                style={{ background: "rgba(220,230,255,0.92)" }}
                onClick={() => setMobileOpen(false)}
              >
                Register
              </AuthModalTrigger>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
