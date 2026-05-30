import { cn } from "@/lib/utils";

type WebGLFallbackProps = {
  className?: string;
  variant?: "hero" | "panel";
};

/** CSS-only stand-in when WebGL / Three.js cannot run */
export function WebGLFallback({ className, variant = "hero" }: WebGLFallbackProps) {
  return (
    <div
      className={cn(
        variant === "hero" && "marketing-hero-shader-fallback",
        variant === "panel" &&
          "bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.15),transparent_70%)]",
        className,
      )}
      aria-hidden
    />
  );
}
