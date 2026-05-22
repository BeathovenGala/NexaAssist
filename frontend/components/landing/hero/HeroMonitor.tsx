"use client";

import { ContactShadows, OrthographicCamera, RenderTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { RefObject } from "react";
import * as THREE from "three";
import { MonitorScreenScene } from "./MonitorScreenScene";

const SCREEN_W = 640;
const SCREEN_H = 440;

type HeroMonitorProps = {
  groupRef?: RefObject<THREE.Group | null>;
};

/** Procedural retro workstation; screen uses RenderTexture for live 3D UI. */
export function HeroMonitor({ groupRef }: HeroMonitorProps) {
  const chassis = "#d4cfc4";
  const chassisDark = "#b8b3a8";
  const keys = "#2a2d30";

  useFrame((state) => {
    if (!groupRef?.current) return;
    groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.6) * 0.015;
  });

  return (
    <group ref={groupRef} rotation={[0, -0.38, 0]}>
      <mesh position={[0, -0.08, 0.12]} receiveShadow>
        <boxGeometry args={[1.55, 0.06, 1.05]} />
        <meshStandardMaterial color="#1a1c1e" metalness={0.2} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.02, 0.18]} castShadow receiveShadow>
        <boxGeometry args={[1.35, 0.1, 0.55]} />
        <meshStandardMaterial color={chassisDark} metalness={0.25} roughness={0.65} />
      </mesh>
      {Array.from({ length: 5 }).map((_, row) =>
        Array.from({ length: 12 }).map((__, col) => (
          <mesh
            key={`${row}-${col}`}
            position={[-0.48 + col * 0.088, 0.085, 0.05 + row * 0.065]}
            castShadow
          >
            <boxGeometry args={[0.065, 0.028, 0.04]} />
            <meshStandardMaterial color={keys} metalness={0.15} roughness={0.75} />
          </mesh>
        )),
      )}
      <mesh position={[0, 0.62, -0.02]} castShadow receiveShadow>
        <boxGeometry args={[1.05, 0.78, 0.22]} />
        <meshStandardMaterial color={chassis} metalness={0.18} roughness={0.58} />
      </mesh>
      <mesh position={[0, 0.98, 0.02]}>
        <boxGeometry args={[0.5, 0.04, 0.12]} />
        <meshStandardMaterial color={chassisDark} />
      </mesh>
      <mesh position={[0, 0.64, 0.1]}>
        <boxGeometry args={[0.82, 0.52, 0.06]} />
        <meshStandardMaterial color="#1a1a1c" metalness={0.4} roughness={0.45} />
      </mesh>

      {/* CRT screen — interactive scene baked into texture each frame */}
      <mesh position={[0, 0.64, 0.136]}>
        <planeGeometry args={[0.72, 0.46]} />
        <meshBasicMaterial toneMapped={false}>
          <RenderTexture attach="map" width={SCREEN_W} height={SCREEN_H}>
            <OrthographicCamera
              makeDefault
              position={[0, 0, 4]}
              zoom={95}
              near={0.1}
              far={20}
            />
            <MonitorScreenScene />
          </RenderTexture>
        </meshBasicMaterial>
      </mesh>

      {/* Scanline glass */}
      <mesh position={[0, 0.64, 0.138]}>
        <planeGeometry args={[0.72, 0.46]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={0.06}
          depthWrite={false}
          blending={THREE.MultiplyBlending}
        />
      </mesh>

      <ContactShadows
        position={[0, -0.72, 0]}
        opacity={0.4}
        scale={10}
        blur={2.2}
        far={3.5}
        color="#1a2030"
      />
    </group>
  );
}
