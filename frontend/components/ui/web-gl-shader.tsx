"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

import { cn } from "@/lib/utils";
import { canUseWebGL } from "@/lib/webgl";

import { WebGLFallback } from "./webgl-fallback";

type WebGLShaderProps = {
  className?: string;
};

export function WebGLShader({ className }: WebGLShaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [useFallback, setUseFallback] = useState(false);
  const sceneRef = useRef<{
    scene: THREE.Scene | null;
    camera: THREE.OrthographicCamera | null;
    renderer: THREE.WebGLRenderer | null;
    mesh: THREE.Mesh | null;
    uniforms: {
      resolution: { value: number[] };
      time: { value: number };
      xScale: { value: number };
      yScale: { value: number };
      distortion: { value: number };
    } | null;
    animationId: number | null;
  }>({
    scene: null,
    camera: null,
    renderer: null,
    mesh: null,
    uniforms: null,
    animationId: null,
  });

  useEffect(() => {
    if (!canvasRef.current) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setUseFallback(true);
      return;
    }

    if (!canUseWebGL()) {
      setUseFallback(true);
      return;
    }

    const canvas = canvasRef.current;
    const { current: refs } = sceneRef;

    const vertexShader = `
      attribute vec3 position;
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      precision highp float;
      uniform vec2 resolution;
      uniform float time;
      uniform float xScale;
      uniform float yScale;
      uniform float distortion;

      void main() {
        vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
        float d = length(p) * distortion;
        float rx = p.x * (1.0 + d);
        float gx = p.x;
        float bx = p.x * (1.0 - d);
        float r = 0.05 / abs(p.y + sin((rx + time) * xScale) * yScale);
        float g = 0.05 / abs(p.y + sin((gx + time) * xScale) * yScale);
        float b = 0.05 / abs(p.y + sin((bx + time) * xScale) * yScale);
        gl_FragColor = vec4(r, g, b, 1.0);
      }
    `;

    let disposed = false;

    const initScene = (): boolean => {
      try {
        refs.renderer = new THREE.WebGLRenderer({
          canvas,
          powerPreference: "low-power",
          failIfMajorPerformanceCaveat: false,
        });

        if (!refs.renderer.getContext()) {
          refs.renderer.dispose();
          refs.renderer = null;
          return false;
        }

        refs.scene = new THREE.Scene();
        refs.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        refs.renderer.setClearColor(new THREE.Color(0x000000));

        refs.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, -1);

        refs.uniforms = {
          resolution: { value: [window.innerWidth, window.innerHeight] },
          time: { value: 0.0 },
          xScale: { value: 1.0 },
          yScale: { value: 0.5 },
          distortion: { value: 0.05 },
        };

        const position = [
          -1.0, -1.0, 0.0, 1.0, -1.0, 0.0, -1.0, 1.0, 0.0, 1.0, -1.0, 0.0, -1.0,
          1.0, 0.0, 1.0, 1.0, 0.0,
        ];

        const positions = new THREE.BufferAttribute(new Float32Array(position), 3);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", positions);

        const material = new THREE.RawShaderMaterial({
          vertexShader,
          fragmentShader,
          uniforms: refs.uniforms,
          side: THREE.DoubleSide,
        });

        refs.mesh = new THREE.Mesh(geometry, material);
        refs.scene.add(refs.mesh);

        handleResize();
        return true;
      } catch {
        refs.renderer?.dispose();
        refs.renderer = null;
        refs.scene = null;
        refs.camera = null;
        refs.mesh = null;
        refs.uniforms = null;
        return false;
      }
    };

    if (!initScene()) {
      setUseFallback(true);
      return;
    }

    let paused = false;
    const onVisibility = () => {
      paused = document.hidden;
    };
    document.addEventListener("visibilitychange", onVisibility);

    const animate = () => {
      if (disposed) return;
      if (!paused && refs.uniforms) refs.uniforms.time.value += 0.01;
      if (refs.renderer && refs.scene && refs.camera) {
        refs.renderer.render(refs.scene, refs.camera);
      }
      refs.animationId = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      if (!refs.renderer || !refs.uniforms) return;
      const width = window.innerWidth;
      const height = window.innerHeight;
      refs.renderer.setSize(width, height, false);
      refs.uniforms.resolution.value = [width, height];
    };

    animate();
    window.addEventListener("resize", handleResize);

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisibility);
      if (refs.animationId) cancelAnimationFrame(refs.animationId);
      window.removeEventListener("resize", handleResize);
      if (refs.mesh) {
        refs.scene?.remove(refs.mesh);
        refs.mesh.geometry.dispose();
        if (refs.mesh.material instanceof THREE.Material) {
          refs.mesh.material.dispose();
        }
      }
      refs.renderer?.dispose();
      refs.renderer = null;
      refs.scene = null;
      refs.camera = null;
      refs.mesh = null;
      refs.uniforms = null;
    };
  }, []);

  if (useFallback) {
    return <WebGLFallback className={cn("absolute inset-0 h-full w-full", className)} />;
  }

  return (
    <canvas
      ref={canvasRef}
      className={cn("pointer-events-none absolute inset-0 block h-full w-full", className)}
      aria-hidden
    />
  );
}
