"use client";

import { useEffect, useRef } from "react";

const VERT = `
  attribute vec2 a_pos;
  varying vec2 vUv;
  void main() {
    vUv = a_pos * 0.5 + 0.5;
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }
`;

/** Vertical flowing light/water pillar that scatters at the hero base */
const FRAG = `
  precision highp float;
  uniform float uTime;
  uniform vec2  uRes;
  varying vec2  vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = p * 2.05 + vec2(1.4, 2.1);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    float asp = uRes.x / max(uRes.y, 1.0);
    vec2 p = vec2(uv.x * asp, uv.y);
    float t = uTime * 0.22;

    float beamX = 0.68 * asp
      + 0.018 * sin(uv.y * 14.0 + t * 2.4)
      + 0.012 * sin(uv.y * 7.0 - t * 1.6);

    float flow = fbm(vec2(p.x * 1.6 + t * 0.35, p.y * 5.0 - t * 1.8));
    float ripple = sin(p.y * 28.0 - t * 4.0 + flow * 6.0) * 0.012;
    float dx = (p.x - beamX - ripple) / 0.11;

    float heightMask = smoothstep(0.0, 0.12, uv.y) * smoothstep(1.0, 0.38, uv.y);
    float pillar = exp(-dx * dx * 1.8) * heightMask;
    float core = exp(-dx * dx * 14.0) * heightMask;

    float stream = fbm(vec2(dx * 3.0, p.y * 8.0 - t * 2.2));
    pillar *= 0.75 + 0.35 * stream;

    float bottomZone = smoothstep(0.28, 0.0, uv.y);
    float spreadX = (p.x - beamX) / max(0.08, 0.02 + bottomZone * 0.35);
    float spreadY = (uv.y + 0.02) / 0.22;
    float scatterDist = length(vec2(spreadX, spreadY * 0.85));
    float scatter = exp(-scatterDist * scatterDist * 1.15) * bottomZone;
    scatter += fbm(p * 5.0 + vec2(t * 0.5, -t * 0.3)) * bottomZone * 0.55 * exp(-scatterDist * 0.9);

    float pool = exp(-abs(dx) * 3.5) * bottomZone * (1.0 - smoothstep(0.0, 0.12, uv.y));

    vec3 col = vec3(0.008, 0.012, 0.035);
    col += pillar * vec3(0.35, 0.55, 1.0) * 1.85;
    col += core * vec3(1.0, 0.98, 1.0) * 2.4;
    col += scatter * vec3(0.45, 0.72, 1.0) * 1.6;
    col += scatter * vec3(0.55, 0.28, 0.95) * 0.65;
    col += pool * vec3(0.25, 0.45, 0.95) * 0.9;

    col += fbm(uv * 2.0 + t * 0.08) * vec3(0.03, 0.05, 0.12) * 0.35;

    vec2 vc = vUv * 2.0 - 1.0;
    col *= 1.0 - dot(vc, vc) * 0.22;
    col *= smoothstep(0.0, 0.06, uv.y);

    gl_FragColor = vec4(col, 1.0);
  }
`;

function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error("[HeroBeam] shader:", gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

type HeroBeamCanvasProps = {
  paused?: boolean;
};

export function HeroBeamCanvas({ paused = false }: HeroBeamCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);

  pausedRef.current = paused;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
    if (!gl) return;

    const vert = compileShader(gl, gl.VERTEX_SHADER, VERT);
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vert || !frag) return;

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vert);
    gl.attachShader(prog, frag);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("[HeroBeam] link:", gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const aPos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, "uTime");
    const uRes = gl.getUniformLocation(prog, "uRes");

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w < 1 || h < 1) return;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf = 0;
    const start = performance.now();
    const tick = () => {
      if (!pausedRef.current) {
        gl.uniform1f(uTime, (performance.now() - start) / 1000);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      gl.deleteProgram(prog);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
      gl.deleteBuffer(buf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="landing-hero-beam__canvas"
      aria-hidden
    />
  );
}
