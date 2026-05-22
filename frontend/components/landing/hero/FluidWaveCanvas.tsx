"use client";

import { useEffect, useRef } from "react";

/* ──────────────────────────────────────────────
   Plain WebGL fullscreen-quad fluid shader.
   No R3F / camera issues — we own the GL context.
────────────────────────────────────────────── */

const VERT = `
  attribute vec2 a_pos;
  varying vec2 vUv;
  void main() {
    vUv = a_pos * 0.5 + 0.5;
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }
`;

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
      mix(hash(i),             hash(i + vec2(1,0)), f.x),
      mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x),
      f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p  = p * 1.9 + vec2(1.7, 9.2);
      a *= 0.5;
    }
    return v;
  }
  float glow(float d, float s) {
    return exp(-d * d * s);
  }

  void main() {
    vec2 uv = vUv;
    float asp = uRes.x / max(uRes.y, 1.0);
    vec2 p = vec2(uv.x * asp, uv.y);

    float t = uTime * 0.14;

    /* domain distortion */
    float qx = fbm(p + vec2(0.0, 0.0));
    float qy = fbm(p + vec2(5.2, 1.3));
    float rx = fbm(p + 4.0 * vec2(qx, qy) + vec2(1.7, 9.2) + 0.15 * t);
    float ry = fbm(p + 4.0 * vec2(qx, qy) + vec2(8.3, 2.8) + 0.12 * t);
    vec2 d = p + 0.13 * vec2(rx, ry);

    vec3 col = vec3(0.006, 0.009, 0.028);

    /* ribbon 1 – electric blue */
    float c1 = d.y - (0.50 + 0.07*sin(d.x*1.4 + t*0.85) + 0.04*sin(d.x*3.1 + t*1.3));
    col += glow(c1, 1100.0) * vec3(0.28, 0.55, 1.0) * 3.2;
    col += glow(c1, 90.0)   * vec3(0.28, 0.55, 1.0) * 0.35 * 3.2;

    /* ribbon 2 – cobalt */
    float c2 = d.y - (0.43 + 0.055*sin(d.x*1.9 + t*0.7 + 1.2) + 0.09*fbm(d*1.8));
    col += glow(c2, 600.0) * vec3(0.1, 0.28, 0.92) * 2.2;
    col += glow(c2, 55.0)  * vec3(0.1, 0.28, 0.92) * 0.35 * 2.2;

    /* ribbon 3 – indigo/violet */
    float c3 = d.y - (0.57 + 0.065*sin(d.x*2.3 + t*0.62 + 2.0) + 0.03*sin(d.x*4.8 + t*1.7));
    col += glow(c3, 700.0) * vec3(0.38, 0.16, 0.88) * 1.9;
    col += glow(c3, 65.0)  * vec3(0.38, 0.16, 0.88) * 0.35 * 1.9;

    /* ribbon 4 – wide background glow */
    float c4 = d.y - (0.50 + 0.03*sin(d.x*1.1 + t*0.45));
    col += glow(c4, 120.0) * vec3(0.08, 0.14, 0.58) * 1.1;

    /* ribbon 5 – thin cyan highlight */
    float c5 = d.y - (0.47 + 0.025*sin(d.x*3.5 + t*1.2 + 1.7));
    col += glow(c5, 3200.0) * vec3(0.42, 0.80, 1.0) * 2.6;
    col += glow(c5, 250.0)  * vec3(0.42, 0.80, 1.0) * 0.35 * 2.6;

    /* ribbon 6 – purple accent */
    float c6 = d.y - (0.54 + 0.08*sin(d.x*2.7 + t*0.55 + 3.1) + 0.04*fbm(d*2.2));
    col += glow(c6, 400.0) * vec3(0.55, 0.1, 0.75) * 1.4;
    col += glow(c6, 40.0)  * vec3(0.55, 0.1, 0.75) * 0.35 * 1.4;

    /* ambient nebula */
    col += fbm(uv * 1.2 + t * 0.025) * vec3(0.04, 0.06, 0.20) * 0.55;

    /* bottom fade */
    col *= 0.35 + 0.65 * smoothstep(0.0, 0.28, uv.y);

    /* vignette */
    vec2 vc = vUv * 2.0 - 1.0;
    col *= 1.0 - dot(vc, vc) * 0.18;

    gl_FragColor = vec4(col, 1.0);
  }
`;

function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error("[FluidWave] shader error:", gl.getShaderInfoLog(s));
  }
  return s;
}

export function FluidWaveCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
    if (!gl) return;

    /* compile program */
    const vert = compileShader(gl, gl.VERTEX_SHADER, VERT);
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vert);
    gl.attachShader(prog, frag);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("[FluidWave] link error:", gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    /* fullscreen quad: 2 triangles */
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

    /* resize handler */
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    /* render loop */
    let raf = 0;
    const start = performance.now();
    const tick = () => {
      const t = (performance.now() - start) / 1000;
      gl.uniform1f(uTime, t);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
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
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
      }}
      aria-hidden
    />
  );
}
