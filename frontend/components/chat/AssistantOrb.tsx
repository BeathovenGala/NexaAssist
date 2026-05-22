"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";

function OrbMesh() {
  const ref = useRef<Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.4;
    ref.current.position.y = Math.sin(state.clock.elapsedTime * 1.2) * 0.06;
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.42, 32, 32]} />
      <meshStandardMaterial
        color="#6366f1"
        emissive="#818cf8"
        emissiveIntensity={0.85}
        metalness={0.35}
        roughness={0.25}
      />
    </mesh>
  );
}

type Props = {
  className?: string;
};

export function AssistantOrb({ className = "h-14 w-14" }: Props) {
  return (
    <div className={`${className} overflow-hidden rounded-full`}>
      <Canvas
        camera={{ position: [0, 0, 1.4], fov: 45 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.6} />
        <pointLight position={[2, 2, 2]} intensity={1.2} color="#a5b4fc" />
        <pointLight position={[-2, -1, 1]} intensity={0.5} color="#4f46e5" />
        <OrbMesh />
      </Canvas>
    </div>
  );
}
