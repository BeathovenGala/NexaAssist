"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useState, type ReactNode } from "react";

import { AnimatedRobotFallback } from "@/components/ui/animated-robot-fallback";
import { cn } from "@/lib/utils";
import { loadSplineModule } from "@/lib/load-spline-module";
import { canUseWebGL } from "@/lib/webgl";

export interface InteractiveRobotSplineProps {
  scene: string;
  className?: string;
}

function RobotSplineLoader({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center bg-gray-950 text-white",
        className,
      )}
    >
      <svg
        className="mr-3 h-5 w-5 animate-spin text-white"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l2-2.647z"
        />
      </svg>
      <span className="sr-only">Loading 3D robot…</span>
    </div>
  );
}

const Spline = dynamic(() => loadSplineModule(), {
  ssr: false,
  loading: () => <RobotSplineLoader />,
});

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

/** hero_robot.txt — direct Spline embed for orbit / hero layers */
export function InteractiveRobotSpline({ scene, className }: InteractiveRobotSplineProps) {
  const [failed, setFailed] = useState(false);
  const [webglOk, setWebglOk] = useState<boolean | null>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || !canUseWebGL()) {
      setWebglOk(false);
    } else {
      setWebglOk(true);
    }
  }, []);

  if (failed || webglOk === false) {
    return <AnimatedRobotFallback className={cn("h-full w-full", className)} />;
  }

  if (webglOk === null) {
    return <RobotSplineLoader className={className} />;
  }

  return (
    <SplineErrorBoundary onError={() => setFailed(true)}>
      <Spline scene={scene} className={cn("h-full w-full", className)} />
    </SplineErrorBoundary>
  );
}
