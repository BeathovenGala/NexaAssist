"use client";

import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { screenStates } from "../copy";
import { HeroPointerContext } from "./hero-pointer-context";

/** Interactive NexaAssist OS scene rendered into the CRT screen texture. */
export function MonitorScreenScene() {
  const pointer = useContext(HeroPointerContext);
  const rootRef = useRef<THREE.Group>(null);
  const barsRef = useRef<THREE.Group>(null);
  const [statusIndex, setStatusIndex] = useState(0);

  const status = screenStates[statusIndex];

  useEffect(() => {
    const id = window.setInterval(() => {
      setStatusIndex((i) => (i + 1) % screenStates.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, []);

  const panelMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#0d1219",
        emissive: "#1a3050",
        emissiveIntensity: 0.4,
        metalness: 0.1,
        roughness: 0.85,
      }),
    [],
  );

  const accentMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#4d93e5",
        emissive: "#46eaed",
        emissiveIntensity: 1.1,
        metalness: 0.2,
        roughness: 0.35,
      }),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (rootRef.current) {
      rootRef.current.rotation.y = THREE.MathUtils.lerp(
        rootRef.current.rotation.y,
        pointer.current.x * 0.14,
        0.08,
      );
      rootRef.current.rotation.x = THREE.MathUtils.lerp(
        rootRef.current.rotation.x,
        -pointer.current.y * 0.1,
        0.08,
      );
    }
    if (barsRef.current) {
      barsRef.current.children.forEach((bar, i) => {
        const mesh = bar as THREE.Mesh;
        const base = [0.35, 0.55, 0.4, 0.7, 0.45, 0.62, 0.38][i] ?? 0.4;
        const wave = Math.sin(t * 1.4 + i * 0.8) * 0.14;
        mesh.scale.y = base + wave;
      });
    }
  });

  return (
    <>
      <color attach="background" args={["#080c14"]} />
      <ambientLight intensity={0.7} />
      <pointLight position={[0, 1, 3]} intensity={1.4} color="#46eaed" />
      <pointLight position={[-2, -1, 2]} intensity={0.45} color="#4d93e5" />

      <group ref={rootRef}>
        <Text
          position={[-1.85, 1.15, 0.01]}
          fontSize={0.11}
          color="#46eaed"
          anchorX="left"
          anchorY="middle"
          maxWidth={3.2}
        >
          {`● ${status}`}
        </Text>

        <mesh position={[-1.55, 0.15, 0]} material={panelMat}>
          <boxGeometry args={[0.55, 1.35, 0.02]} />
        </mesh>
        {["Dash", "Appt", "Inv", "Bot", "Camp"].map((label, i) => (
          <Text
            key={label}
            position={[-1.78, 0.65 - i * 0.22, 0.02]}
            fontSize={0.07}
            color={i === 0 ? "#a4c9ff" : "#6b8cb8"}
            anchorX="left"
            anchorY="middle"
          >
            {label}
          </Text>
        ))}

        <mesh position={[-0.35, 0.55, 0]} material={panelMat}>
          <boxGeometry args={[0.75, 0.38, 0.02]} />
        </mesh>
        <mesh position={[0.55, 0.55, 0]} material={panelMat}>
          <boxGeometry args={[0.75, 0.38, 0.02]} />
        </mesh>
        <Text position={[-0.7, 0.68, 0.03]} fontSize={0.06} color="#6b8cb8" anchorX="left">
          Appointments
        </Text>
        <Text position={[-0.7, 0.48, 0.03]} fontSize={0.12} color="#a4c9ff" anchorX="left">
          24
        </Text>
        <Text position={[0.2, 0.68, 0.03]} fontSize={0.06} color="#6b8cb8" anchorX="left">
          Stock health
        </Text>
        <Text position={[0.2, 0.48, 0.03]} fontSize={0.12} color="#46eaed" anchorX="left">
          98%
        </Text>

        <mesh position={[0.1, -0.15, 0]} material={panelMat}>
          <boxGeometry args={[1.65, 0.55, 0.02]} />
        </mesh>
        <Text position={[-0.65, 0.05, 0.03]} fontSize={0.055} color="#6b8cb8" anchorX="left">
          Live queue · operational
        </Text>
        <Text position={[-0.65, -0.12, 0.03]} fontSize={0.05} color="#46eaed" anchorX="left">
          14:30 Consultation
        </Text>
        <Text position={[-0.65, -0.22, 0.03]} fontSize={0.05} color="#8ba4cc" anchorX="left">
          15:00 Low stock alert
        </Text>

        <group ref={barsRef} position={[0.1, -0.9, 0.02]}>
          {Array.from({ length: 7 }).map((_, i) => (
            <mesh
              key={i}
              position={[-0.6 + i * 0.2, 0.175, 0]}
              material={accentMat}
            >
              <boxGeometry args={[0.1, 0.35, 0.03]} />
            </mesh>
          ))}
        </group>

        <mesh position={[1.55, 0.85, -0.1]} material={accentMat}>
          <sphereGeometry args={[0.045, 10, 10]} />
        </mesh>
      </group>
    </>
  );
}
