"use client";

import Link from "next/link";
import { Calendar, CreditCard, LayoutGrid, Shield } from "lucide-react";

import { AuthModalTrigger } from "@/components/auth/AuthModalTrigger";
import { AnimeNavBar } from "@/components/ui/anime-navbar";

import { BRAND } from "./copy";

const ANIME_NAV_ITEMS = [
  { name: "Product", url: "#orbit", icon: LayoutGrid },
  { name: "Features", url: "#orbit", icon: Calendar },
  { name: "Pricing", url: "#pricing", icon: CreditCard },
  { name: "Security", url: "#security", icon: Shield },
] as const;

export function SiteNav() {
  return (
    <>
      <div className="fixed top-5 right-5 z-[10000] flex items-center gap-2 sm:gap-3">
        <AuthModalTrigger modal="login" star size="sm">
          Sign in
        </AuthModalTrigger>
        <AuthModalTrigger modal="register" star size="sm">
          Get started
        </AuthModalTrigger>
      </div>

      <Link
        href="#top"
        className="marketing-display fixed top-7 left-6 z-[10000] text-lg tracking-tight text-white md:left-10"
      >
        {BRAND.name}
      </Link>

      <AnimeNavBar items={[...ANIME_NAV_ITEMS]} defaultActive="Product" />
    </>
  );
}
