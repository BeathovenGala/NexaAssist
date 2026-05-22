"use client";

import { create } from "zustand";

type ToastState = {
  message: string | null;
  variant: "info" | "error";
  show: (message: string, variant?: "info" | "error") => void;
  clear: () => void;
};

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  variant: "info",
  show: (message, variant = "info") => set({ message, variant }),
  clear: () => set({ message: null }),
}));
