"use client";

import { WireframeDepth } from "./WireframeDepth";

export type PinnedChapterData = {
  id: string;
  anchor?: string;
  label: string;
  title: string;
  body: string;
  askPlaceholder?: string;
};

type PinnedChapterProps = {
  chapter: PinnedChapterData;
  index: number;
  reducedMotion: boolean;
  overlayMode?: boolean;
};

export function PinnedChapter({
  chapter,
  index,
  reducedMotion,
  overlayMode = false,
}: PinnedChapterProps) {
  if (reducedMotion) {
    return (
      <section
        id={chapter.anchor ?? `chapter-${chapter.id}`}
        className="border-t border-[var(--na-border-subtle)] py-20"
        aria-labelledby={`chapter-title-${chapter.id}`}
      >
        <ChapterContent chapter={chapter} />
      </section>
    );
  }

  return (
    <section
      id={chapter.anchor ?? `chapter-${chapter.id}`}
      className="na-pinned-chapter relative h-[120vh]"
      data-chapter-index={index}
      aria-labelledby={`chapter-title-${chapter.id}`}
    >
      <div className="na-pinned-inner flex h-screen items-center overflow-hidden">
        {!overlayMode ? <WireframeDepth chapterIndex={index} /> : null}
        <div className="relative z-10 mx-auto w-full max-w-[1280px] px-6 sm:px-12">
          <ChapterContent chapter={chapter} animated overlayMode={overlayMode} />
        </div>
      </div>
    </section>
  );
}

function ChapterContent({
  chapter,
  animated = false,
  overlayMode = false,
}: {
  chapter: PinnedChapterData;
  animated?: boolean;
  overlayMode?: boolean;
}) {
  return (
    <div className="max-w-2xl">
      <p
        className={`font-mono text-xs text-[var(--na-cyan)] ${animated ? "na-chapter-label" : ""}`}
      >
        {chapter.label}
      </p>
      <h2
        id={`chapter-title-${chapter.id}`}
        className={`na-display mt-6 text-3xl leading-tight tracking-tight sm:text-4xl lg:text-[2.75rem] ${
          overlayMode ? "na-hero-headline" : ""
        } ${animated ? "na-chapter-title" : ""}`}
      >
        {chapter.title}
      </h2>
      <p
        className={`mt-6 text-base leading-relaxed text-[var(--na-muted)] sm:text-lg ${animated ? "na-chapter-body" : ""}`}
      >
        {chapter.body}
      </p>
      {chapter.askPlaceholder ? (
        <div
          className={`mt-10 flex max-w-md items-center gap-3 rounded-full border border-[var(--na-border-subtle)] px-5 py-3 backdrop-blur-sm ${
            overlayMode ? "bg-[var(--na-surface)]/35" : "bg-[var(--na-surface)]/80"
          } ${animated ? "na-chapter-ask" : ""}`}
          aria-hidden
        >
          <span className="font-mono text-[var(--na-cyan)] opacity-60">›</span>
          <span className="truncate font-mono text-xs text-[var(--na-muted)] opacity-60">
            {chapter.askPlaceholder}
          </span>
        </div>
      ) : null}
    </div>
  );
}
