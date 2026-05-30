"use client";

import { Component, Suspense, lazy, type ReactNode } from "react";

import { cn } from "@/lib/utils";

const Spline = lazy(() => import("@splinetool/react-spline"));

export interface SplineSceneInnerProps {
  scene: string;
  className?: string;
  showFallbackOnError?: boolean;
  onError?: () => void;
}

class SplineErrorBoundary extends Component<
  { children: ReactNode; onError?: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onError?.();
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

function SplineLoader({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-full w-full items-center justify-center", className)}>
      <span className="loader" aria-hidden />
      <span className="sr-only">Loading 3D…</span>
    </div>
  );
}

export function SplineSceneInner({
  scene,
  className,
  onError,
}: SplineSceneInnerProps) {
  return (
    <SplineErrorBoundary onError={onError}>
      <Suspense fallback={<SplineLoader className={className} />}>
        <Spline scene={scene} className={cn("h-full w-full", className)} />
      </Suspense>
    </SplineErrorBoundary>
  );
}
