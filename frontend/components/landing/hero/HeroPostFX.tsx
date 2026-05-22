"use client";

import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Component, type ReactNode } from "react";

class PostFxErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export function HeroPostFX() {
  return (
    <PostFxErrorBoundary>
      <EffectComposer multisampling={0}>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          intensity={1.1}
          mipmapBlur
        />
      </EffectComposer>
    </PostFxErrorBoundary>
  );
}
