"use client";

import { useEffect, useState } from "react";

import { useWebGLAvailable } from "@/lib/use-webgl-available";
import { cn } from "@/lib/utils";

import { AnimatedRobotFallback } from "./animated-robot-fallback";
import { SplineScene } from "./splite";

type RobotCoreProps = {
  scene: string;
  className?: string;
};

/**
 * hero.txt Spline robot when WebGL works; animated metallic fallback otherwise.
 * (Cursor Simple Browser / sandbox often has WebGL disabled — not a site bug.)
 */
export function RobotCore({ scene, className }: RobotCoreProps) {
  const webgl = useWebGLAvailable();
  const [splineFailed, setSplineFailed] = useState(false);

  useEffect(() => {
    if (webgl === false) setSplineFailed(true);
  }, [webgl]);

  if (webgl === null) {
    return (
      <div className={cn("flex h-full w-full items-center justify-center", className)}>
        <span className="loader" aria-hidden />
      </div>
    );
  }

  if (webgl === false || splineFailed) {
    return <AnimatedRobotFallback className={className} />;
  }

  return (
    <SplineScene
      scene={scene}
      className={className}
      showFallbackOnError={false}
      onError={() => setSplineFailed(true)}
    />
  );
}
