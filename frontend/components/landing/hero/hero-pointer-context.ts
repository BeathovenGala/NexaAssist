"use client";

import { createContext, type MutableRefObject } from "react";

export type HeroPointer = { x: number; y: number };

export const HeroPointerContext = createContext<MutableRefObject<HeroPointer>>({
  current: { x: 0, y: 0 },
});
