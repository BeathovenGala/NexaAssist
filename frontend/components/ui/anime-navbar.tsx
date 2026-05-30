"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export interface AnimeNavItem {
  name: string;
  url: string;
  icon: LucideIcon;
}

interface AnimeNavBarProps {
  items: AnimeNavItem[];
  className?: string;
  defaultActive?: string;
}

function scrollToHash(url: string) {
  if (!url.startsWith("#")) return;
  const id = url.slice(1);
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export function AnimeNavBar({ items, className, defaultActive }: AnimeNavBarProps) {
  const [mounted, setMounted] = useState(false);
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>(
    defaultActive ?? items[0]?.name ?? "",
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className={cn("pointer-events-none fixed top-5 left-0 right-0 z-[9999]", className)}>
      <div className="flex justify-center pt-2">
        <motion.div
          className="pointer-events-auto relative flex items-center gap-1 rounded-full border border-white/10 bg-[#1E1245]/50 px-2 py-2 shadow-lg backdrop-blur-lg"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
          }}
        >
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.name;
            const isHovered = hoveredTab === item.name;

            return (
              <Link
                key={item.name}
                href={item.url}
                onClick={(e) => {
                  if (item.url.startsWith("#")) {
                    e.preventDefault();
                    setActiveTab(item.name);
                    scrollToHash(item.url);
                  }
                }}
                onMouseEnter={() => setHoveredTab(item.name)}
                onMouseLeave={() => setHoveredTab(null)}
                className={cn(
                  "relative cursor-pointer rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-300 md:px-6 md:py-3",
                  "text-white/70 hover:text-white",
                  isActive && "text-white",
                )}
              >
                {isActive && (
                  <motion.div
                    className="absolute inset-0 -z-10 overflow-hidden rounded-full"
                    initial={{ opacity: 0 }}
                    animate={{
                      opacity: [0.3, 0.5, 0.3],
                      scale: [1, 1.03, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <div className="absolute inset-0 rounded-full bg-white/20 blur-md" />
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
                      style={{ animation: "shine 3s ease-in-out infinite" }}
                    />
                  </motion.div>
                )}

                <span className="relative z-10 hidden md:inline">{item.name}</span>
                <motion.span className="relative z-10 md:hidden" whileTap={{ scale: 0.9 }}>
                  <Icon size={18} strokeWidth={2.5} />
                </motion.span>

                <AnimatePresence>
                  {isHovered && !isActive && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute inset-0 -z-10 rounded-full bg-white/10"
                    />
                  )}
                </AnimatePresence>

                {isActive && (
                  <motion.div
                    layoutId="anime-mascot"
                    className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2"
                    initial={false}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                    }}
                  >
                    <div className="relative h-12 w-12">
                      <motion.div
                        className="absolute left-1/2 h-10 w-10 -translate-x-1/2 rounded-full bg-white"
                        animate={
                          hoveredTab
                            ? {
                                scale: [1, 1.1, 1],
                                rotate: [0, -5, 5, 0],
                                transition: { duration: 0.5, ease: "easeInOut" },
                              }
                            : {
                                y: [0, -3, 0],
                                transition: {
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                },
                              }
                        }
                      >
                        <motion.div
                          className="absolute h-2 w-2 rounded-full bg-[#1E1245]"
                          style={{ left: "25%", top: "40%" }}
                          animate={
                            hoveredTab
                              ? {
                                  scaleY: [1, 0.2, 1],
                                  transition: { duration: 0.2, times: [0, 0.5, 1] },
                                }
                              : {}
                          }
                        />
                        <motion.div
                          className="absolute h-2 w-2 rounded-full bg-[#1E1245]"
                          style={{ right: "25%", top: "40%" }}
                          animate={
                            hoveredTab
                              ? {
                                  scaleY: [1, 0.2, 1],
                                  transition: { duration: 0.2, times: [0, 0.5, 1] },
                                }
                              : {}
                          }
                        />
                        <motion.div
                          className="absolute h-1.5 w-2 rounded-full bg-pink-300"
                          style={{ left: "15%", top: "55%" }}
                        />
                        <motion.div
                          className="absolute h-1.5 w-2 rounded-full bg-pink-300"
                          style={{ right: "15%", top: "55%" }}
                        />
                        <motion.div
                          className="absolute h-2 w-4 rounded-full border-b-2 border-black"
                          style={{ left: "30%", top: "60%" }}
                          animate={hoveredTab ? { scaleY: 1.5, y: -1 } : { scaleY: 1, y: 0 }}
                        />
                      </motion.div>
                      <motion.div
                        className="absolute -bottom-1 left-1/2 h-4 w-4 -translate-x-1/2"
                        animate={
                          hoveredTab
                            ? {
                                y: [0, -4, 0],
                                transition: {
                                  duration: 0.3,
                                  repeat: Infinity,
                                  repeatType: "reverse",
                                },
                              }
                            : {
                                y: [0, 2, 0],
                                transition: {
                                  duration: 1,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                  delay: 0.5,
                                },
                              }
                        }
                      >
                        <div className="h-full w-full origin-center rotate-45 bg-white" />
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </Link>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
