import type { ComponentType } from "react";

export function loadSplineModule(): Promise<{ default: ComponentType<Record<string, unknown>> }> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const splineModule = require("../node_modules/@splinetool/react-spline/dist/react-spline-next.js");
  return Promise.resolve({ default: splineModule.default ?? splineModule });
}
