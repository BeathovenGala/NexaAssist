import { SPLINE_ROBOT_SCENE } from "@/components/landing/copy";
import { canUseWebGL } from "@/lib/webgl";

let preloadStarted = false;

/** Warm Spline runtime + scene while intro plays (homepage). Skips when WebGL is off. */
export function preloadSplineAssets(sceneUrl: string = SPLINE_ROBOT_SCENE): void {
  if (typeof window === "undefined" || preloadStarted) return;
  if (!canUseWebGL()) return;
  preloadStarted = true;

  void Promise.all([
    import("@splinetool/react-spline"),
    import("@splinetool/runtime"),
    fetch(sceneUrl, { mode: "cors", credentials: "omit" }).catch(() => undefined),
  ]);
}
