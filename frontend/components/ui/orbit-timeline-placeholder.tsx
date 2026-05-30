/** SSR / loading shell for orbital section — no animated inline styles (avoids hydration mismatch). */
export function OrbitTimelinePlaceholder() {
  return (
    <div
      className="flex h-[min(100vh,920px)] min-h-[min(100vh,920px)] w-full flex-col items-center justify-center bg-black py-12"
      aria-hidden
    >
      <div className="relative flex h-[min(88vw,48rem)] w-[min(88vw,48rem)] items-center justify-center">
        <div className="absolute h-full w-full rounded-full border border-white/[0.06]" />
        <div className="absolute h-[88%] w-[88%] rounded-full border border-white/10" />
        <div className="absolute h-[76%] w-[76%] rounded-full border border-white/[0.07]" />
        <div className="h-[min(72vw,380px)] w-[min(72vw,380px)] animate-pulse rounded-full bg-white/5 ring-1 ring-white/20" />
      </div>
    </div>
  );
}
