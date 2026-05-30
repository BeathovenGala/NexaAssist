"use client";

import { useEffect, useState } from "react";

import { SPLINE_ORBIT_SCENE } from "@/components/landing/copy";
import { canUseWebGL } from "@/lib/webgl";
import { InteractiveRobotSpline } from "@/components/ui/interactive-3d-robot";

/** Hidden mount during intro — only when WebGL is available. */
export function SplineWarmup() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(canUseWebGL());
  }, []);

  if (!enabled) return null;

  return (
    <div
      // keep mounted for warmup but ensure it never shows visually
      className="pointer-events-none fixed top-0 left-0 z-0 h-[480px] w-[480px] overflow-hidden opacity-0 hidden"
      aria-hidden
    >
      <InteractiveRobotSpline scene={SPLINE_ORBIT_SCENE} className="h-full w-full" />
    </div>
  );
}
