"use client";

import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

const cardClass = (hover: boolean, className?: string) =>
  cn(
    "na-card block rounded-2xl border border-white/[0.08] bg-[rgba(12,12,18,0.72)] p-5 backdrop-blur-xl",
    hover && "transition hover:-translate-y-0.5",
    className,
  );

type DashboardCardProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
  hover?: boolean;
};

/** Glass panel aligned with marketing home (dark orbit theme) */
export function DashboardCard({
  children,
  className,
  hover = true,
  ...props
}: DashboardCardProps) {
  return (
    <div className={cardClass(hover, className)} {...props}>
      {children}
    </div>
  );
}

export function DashboardCardLink({
  href,
  children,
  className,
  hover = true,
}: {
  href: string;
  children?: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <Link href={href} className={cardClass(hover, className)}>
      {children}
    </Link>
  );
}
