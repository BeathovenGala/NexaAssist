"use client";

import { useId } from "react";

/** Unique id for `backdrop-filter: url(#id)` — safe for multiple instances on one page */
export function useGlassFilterId(): string {
  const reactId = useId();
  return `container-glass-${reactId.replace(/:/g, "")}`;
}

type GlassFilterSvgProps = {
  filterId: string;
  /** Animate turbulence for the liquid “line wave” displacement */
  animate?: boolean;
};

export function GlassFilterSvg({ filterId, animate = true }: GlassFilterSvgProps) {
  return (
    <svg className="absolute h-0 w-0 overflow-hidden" aria-hidden>
      <defs>
        <filter
          id={filterId}
          x="0%"
          y="0%"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.05 0.05"
            numOctaves={1}
            seed={1}
            result="turbulence"
          >
            {animate ? (
              <animate
                attributeName="baseFrequency"
                dur="12s"
                values="0.04 0.06;0.08 0.04;0.05 0.07;0.04 0.06"
                repeatCount="indefinite"
              />
            ) : null}
          </feTurbulence>
          <feGaussianBlur in="turbulence" stdDeviation={2} result="blurredNoise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="blurredNoise"
            scale={70}
            xChannelSelector="R"
            yChannelSelector="B"
            result="displaced"
          />
          <feGaussianBlur in="displaced" stdDeviation={4} result="finalBlur" />
          <feComposite in="finalBlur" in2="finalBlur" operator="over" />
        </filter>
      </defs>
    </svg>
  );
}
