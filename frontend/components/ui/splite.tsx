"use client";

import dynamic from "next/dynamic";

import { cn } from "@/lib/utils";

import type { SplineSceneInnerProps } from "./spline-scene-inner";

const SplineSceneInner = dynamic(
  () => import("./spline-scene-inner").then((m) => m.SplineSceneInner),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center">
        <span className="loader" aria-hidden />
      </div>
    ),
  },
);

export type SplineSceneProps = SplineSceneInnerProps;

export function SplineScene({ scene, className, showFallbackOnError, onError }: SplineSceneProps) {
  return (
    <SplineSceneInner
      scene={scene}
      className={cn(className)}
      showFallbackOnError={showFallbackOnError}
      onError={onError}
    />
  );
}
