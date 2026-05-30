/** Probe whether the browser can create a usable WebGL context for Spline/Three.js. */
export function canUseWebGL(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: false }) ??
      canvas.getContext("webgl", { failIfMajorPerformanceCaveat: false }) ??
      canvas.getContext("experimental-webgl" as "webgl", { failIfMajorPerformanceCaveat: false });

    if (!gl) return false;

    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    if (debug) {
      const renderer = gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) as string;
      const vendor = gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) as string;
      if (/disabled/i.test(renderer) || /disabled/i.test(vendor)) return false;
    }

    return true;
  } catch {
    return false;
  }
}
