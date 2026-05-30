"use client";

import { SPLINE_ORBIT_SCENE } from "@/components/landing/copy";
import { GradientGlowFrame } from "@/components/ui/gradient-glow-frame";
import { InteractiveRobotSpline } from "@/components/ui/interactive-3d-robot";
import { cn } from "@/lib/utils";

type OrbitRobotCoreProps = {
  scene?: string;
  size?: number;
  className?: string;
};

/**
 * Layered orbit hub: decorative rings + circular glow card + Spline robot on top (hero_robot.txt).
 */
export function OrbitRobotCore({
  scene = SPLINE_ORBIT_SCENE,
  size = 280,
  className,
}: OrbitRobotCoreProps) {
  return (
    <div
      className={cn(
        "relative z-30 flex shrink-0 items-center justify-center",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
        <div
          className="absolute rounded-full border border-white/20 opacity-70 motion-reduce:animate-none animate-ping"
          style={{ width: size * 0.72, height: size * 0.72 }}
        />
        <div
          className="absolute rounded-full border border-white/10 opacity-50 motion-reduce:animate-none animate-ping"
          style={{
            width: size * 0.86,
            height: size * 0.86,
            animationDelay: "0.5s",
          }}
        />
      </div>

      <div
        className="pointer-events-none absolute rounded-full bg-gradient-to-br from-purple-500/35 via-blue-500/25 to-teal-500/35 motion-reduce:animate-none animate-pulse"
        style={{ width: size * 1.06, height: size * 1.06 }}
        aria-hidden
      />

      <GradientGlowFrame
        className="relative z-10 h-full w-full rounded-full shadow-[0_0_80px_rgba(139,92,246,0.28)] ring-1 ring-white/20"
        innerClassName="relative h-full w-full overflow-hidden rounded-full bg-black p-0"
      >
        <div className="pointer-events-none absolute inset-0 z-0 rounded-full bg-[radial-gradient(circle_at_50%_40%,rgba(139,92,246,0.12),transparent_65%)]" aria-hidden />
        <div className="relative z-10 flex h-full w-full items-center justify-center">
          <div
            className="absolute origin-center"
            style={{ width: "2000px", height: "2000px", transform: "scale(0.2) translateY(5%)" }}
          >
            <InteractiveRobotSpline scene={scene} className="w-full h-full pointer-events-auto" />
          </div>
        </div>
      </GradientGlowFrame>
    </div>
  );
}
