import { SPLINE_ROBOT_SCENE } from "@/components/landing/copy";
import { loadSplineModule } from "@/lib/load-spline-module";
import { canUseWebGL } from "@/lib/webgl";

let preloadStarted = false;

/** Warm Spline runtime + scene while intro plays (homepage). Skips when WebGL is off. */
export function preloadSplineAssets(sceneUrl: string = SPLINE_ROBOT_SCENE): void {
  if (typeof window === "undefined" || preloadStarted) return;
  if (!canUseWebGL()) return;
  preloadStarted = true;

  void Promise.all([
    loadSplineModule(),
    import("@splinetool/runtime"),
    fetch(sceneUrl, { mode: "cors", credentials: "omit" }).catch(() => undefined),
  ]);
}
