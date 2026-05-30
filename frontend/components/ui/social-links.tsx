"use client";

import * as React from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

interface Social {
  name: string;
  href: string;
}

interface SocialLinksProps extends React.HTMLAttributes<HTMLDivElement> {
  socials: Social[];
}

export function SocialLinks({ socials, className, ...props }: SocialLinksProps) {
  const [hoveredSocial, setHoveredSocial] = React.useState<string | null>(null);

  return (
    <div
      className={cn("flex items-center justify-center gap-0", className)}
      {...props}
    >
      {socials.map((social) => (
        <a
          key={social.name}
          href={social.href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "relative cursor-pointer px-4 py-2 text-xs font-medium tracking-widest uppercase transition-opacity duration-200",
            hoveredSocial && hoveredSocial !== social.name && "opacity-30",
          )}
          onMouseEnter={() => setHoveredSocial(social.name)}
          onMouseLeave={() => setHoveredSocial(null)}
        >
          <motion.span
            className="text-[var(--mk-muted)] hover:text-[var(--mk-ink)]"
            animate={{
              scale: hoveredSocial === social.name ? 1.05 : 1,
            }}
          >
            {social.name}
          </motion.span>
        </a>
      ))}
    </div>
  );
}
