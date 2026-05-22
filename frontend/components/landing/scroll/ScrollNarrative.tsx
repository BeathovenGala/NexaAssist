"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";
import { MOTION } from "@/lib/landing/motion";
import { NARRATIVE_CHAPTERS, SCROLL_NARRATIVE } from "../copy";
import { PinnedChapter } from "./PinnedChapter";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const SCROLL_PROGRESS_VAR = "--na-scroll-progress";

const PINNED_COUNT = 3;

type ScrollNarrativeProps = {
  reducedMotion: boolean;
  overlayMode?: boolean;
};

export function ScrollNarrative({
  reducedMotion,
  overlayMode = false,
}: ScrollNarrativeProps) {
  const rootRef = useRef<HTMLElement>(null);
  const pinnedChapters = NARRATIVE_CHAPTERS.slice(0, PINNED_COUNT);
  const flowChapters = NARRATIVE_CHAPTERS.slice(PINNED_COUNT);

  useGSAP(
    () => {
      if (reducedMotion) return;

      const chapters = gsap.utils.toArray<HTMLElement>(".na-pinned-chapter");
      chapters.forEach((chapter) => {
        const inner = chapter.querySelector(".na-pinned-inner");
        const label = chapter.querySelector(".na-chapter-label");
        const title = chapter.querySelector(".na-chapter-title");
        const body = chapter.querySelector(".na-chapter-body");
        const ask = chapter.querySelector(".na-chapter-ask");
        const canvas = chapter.querySelector("canvas");

        gsap.set([label, title, body, ask].filter(Boolean), {
          opacity: 0,
          y: 40,
          filter: "blur(8px)",
        });
        chapter.style.setProperty(SCROLL_PROGRESS_VAR, "0");

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: chapter,
            start: "top top",
            end: "bottom top",
            pin: inner,
            pinSpacing: true,
            scrub: 0.5,
            anticipatePin: 1,
            onUpdate: (self) => {
              chapter.style.setProperty(
                SCROLL_PROGRESS_VAR,
                self.progress.toFixed(4),
              );
            },
          },
        });

        tl.to(
          [label, title, body, ask].filter(Boolean),
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            stagger: MOTION.revealStagger,
            duration: 0.6,
            ease: MOTION.easeInOut,
          },
          0.08,
        );

        if (canvas && !overlayMode) {
          tl.fromTo(
            canvas,
            { opacity: 0.25 },
            { opacity: 0.95, duration: 0.8, ease: MOTION.easeOut },
            0,
          );
        }
      });

      const onResize = () => ScrollTrigger.refresh();
      window.addEventListener("resize", onResize);
      requestAnimationFrame(() => ScrollTrigger.refresh());

      return () => window.removeEventListener("resize", onResize);
    },
    { scope: rootRef, dependencies: [reducedMotion, overlayMode], revertOnUpdate: true },
  );

  return (
    <section
      ref={rootRef}
      id={SCROLL_NARRATIVE.sectionId}
      aria-label="Platform narrative"
      className={`${overlayMode ? "bg-transparent" : "border-b border-[var(--na-border-subtle)] bg-[var(--na-bg-deep)]"}`}
      data-scroll-narrative-root
    >
      {pinnedChapters.map((chapter, index) => (
        <PinnedChapter
          key={chapter.id}
          chapter={{
            id: chapter.id,
            anchor: chapter.anchor,
            label: chapter.label,
            title: chapter.title,
            body: chapter.body,
            askPlaceholder: chapter.askPlaceholder,
          }}
          index={index}
          reducedMotion={reducedMotion}
          overlayMode={overlayMode}
        />
      ))}

      {flowChapters.map((chapter) => (
        <article
          key={chapter.id}
          id={chapter.anchor}
          className={`relative ${overlayMode ? "" : "border-t border-[var(--na-border-subtle)]"}`}
          aria-labelledby={`chapter-title-${chapter.id}`}
        >
          <div className="mx-auto max-w-[1280px] px-6 py-20 sm:px-12 sm:py-24">
            <p
              className={`font-mono text-xs ${overlayMode ? "text-[var(--na-cyan)]" : "text-[var(--na-cyan)]"}`}
            >
              {chapter.label}
            </p>
            <h2
              id={`chapter-title-${chapter.id}`}
              className="na-display na-hero-headline mt-6 max-w-3xl text-2xl leading-tight sm:text-3xl"
            >
              {chapter.title}
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--na-muted)]">
              {chapter.body}
            </p>
            {chapter.askPlaceholder ? (
              <div
                className={`mt-8 flex max-w-md items-center gap-3 rounded-full border border-[var(--na-border-subtle)] px-5 py-3 backdrop-blur-sm ${overlayMode ? "bg-[var(--na-surface)]/35" : "bg-[var(--na-surface)]/80"}`}
                aria-hidden
              >
                <span className="font-mono text-[var(--na-cyan)] opacity-60">›</span>
                <span className="truncate font-mono text-xs text-[var(--na-muted)] opacity-60">
                  {chapter.askPlaceholder}
                </span>
              </div>
            ) : null}
          </div>
        </article>
      ))}
    </section>
  );
}
