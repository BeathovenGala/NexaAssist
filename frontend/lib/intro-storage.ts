export const INTRO_STORAGE_KEY = "nexaassist:intro-seen";

export function hasSeenIntro(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const stored = localStorage.getItem(INTRO_STORAGE_KEY);
    if (!stored) return false;
    return !Number.isNaN(Number.parseInt(stored, 10));
  } catch {
    return true;
  }
}

export function markIntroSeen(): void {
  try {
    localStorage.setItem(INTRO_STORAGE_KEY, Date.now().toString());
  } catch {
    /* private mode / quota */
  }
}
