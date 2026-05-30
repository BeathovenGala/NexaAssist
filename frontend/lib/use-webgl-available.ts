"use client";

import { useEffect, useState } from "react";

import { canUseWebGL } from "@/lib/webgl";

/** `null` while probing on the client; then `true` / `false`. */
export function useWebGLAvailable(): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    setAvailable(canUseWebGL());
  }, []);

  return available;
}
