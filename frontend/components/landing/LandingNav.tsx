"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthModalTrigger } from "@/components/auth/AuthModalTrigger";
import { BRAND, NAV_LINKS } from "./copy";

function NavChevron() {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-3 w-3 opacity-70"
      aria-hidden
    >
      <path d="M3 4.5L6 7.5L9 4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <header className="landing-nav-shell">
      <div className="landing-nav-shell__inner">
        <div
          className={`landing-nav-micro landing-nav-pill is-visible ${scrolled ? "is-expanded" : ""}`}
        >
          <Link href="#top" className="landing-nav-micro__brand" aria-label={`${BRAND.name} home`}>
            <span className="landing-nav-micro__logo" aria-hidden />
          </Link>

          <span className="landing-nav-micro__divider" aria-hidden />

          <nav className="landing-nav-micro__links hidden md:flex" aria-label="Main navigation">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="landing-nav-micro__link">
                {link.label}
                {link.hasMenu ? <NavChevron /> : null}
              </a>
            ))}
          </nav>

          <div className="landing-nav-micro__actions hidden md:flex">
            <AuthModalTrigger modal="login" className="landing-nav-micro__signin">
              Sign in
            </AuthModalTrigger>
            <AuthModalTrigger modal="register" className="landing-nav-micro__signup">
              Sign up
            </AuthModalTrigger>
          </div>

          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            className="landing-nav-micro__menu-btn md:hidden"
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? (
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4" aria-hidden>
                <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4" aria-hidden>
                <path d="M2 4h12M2 8h12M2 12h12" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div
          className="landing-nav-mobile fixed inset-x-4 top-[4.75rem] z-50 rounded-xl border p-5 md:hidden"
          role="dialog"
          aria-label="Mobile menu"
        >
          <nav className="flex flex-col gap-0.5">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--landing-text)] hover:bg-white/5"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4">
            <AuthModalTrigger
              modal="login"
              className="landing-btn-secondary w-full"
              onClick={() => setMobileOpen(false)}
            >
              Sign in
            </AuthModalTrigger>
            <AuthModalTrigger modal="register" className="landing-btn-primary w-full">
              Sign up
            </AuthModalTrigger>
          </div>
        </div>
      ) : null}
    </header>
  );
}
