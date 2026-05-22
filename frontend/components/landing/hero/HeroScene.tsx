"use client";

import { PerspectiveCamera } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import { HeroMonitor } from "./HeroMonitor";
import { HeroPostFX } from "./HeroPostFX";
import { HeroPointerContext, type HeroPointer } from "./hero-pointer-context";

const POINTER_MAX = THREE.MathUtils.degToRad(5);
const CAMERA = { x: 0, y: 0.55, z: 2.85 };
const FOV = 42;

type HeroSceneProps = {
  introComplete?: boolean;
};

export function HeroScene({ introComplete = true }: HeroSceneProps) {
  const pointerRef = useRef<HeroPointer>({ x: 0, y: 0 });

  return (
    <HeroPointerContext.Provider value={pointerRef}>
      <Canvas
        className="!h-full !w-full touch-none"
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [CAMERA.x, CAMERA.y, CAMERA.z], fov: FOV }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <color attach="background" args={["transparent"]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[3, 6, 4]} intensity={1.2} />
        <directionalLight position={[-4, 2, -2]} intensity={0.35} color="#8ba4ff" />
        <pointLight position={[1.5, 1, 2]} intensity={0.5} color="#a4c9ff" />
        <SceneRig introComplete={introComplete} pointerRef={pointerRef} />
        <HeroPostFX />
      </Canvas>
    </HeroPointerContext.Provider>
  );
}

function SceneRig({
  introComplete,
  pointerRef,
}: {
  introComplete: boolean;
  pointerRef: React.MutableRefObject<HeroPointer>;
}) {
  const monitorRef = useRef<THREE.Group>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const rect = document.getElementById("hero-3d-slot")?.getBoundingClientRect();
      if (!rect) return;
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      pointerRef.current.x = THREE.MathUtils.clamp(x, -1, 1);
      pointerRef.current.y = THREE.MathUtils.clamp(y, -1, 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [pointerRef]);

  useFrame(() => {
    const px = pointerRef.current.x;
    const py = pointerRef.current.y;

    if (monitorRef.current) {
      const targetY = px * POINTER_MAX;
      const targetX = -py * POINTER_MAX * 0.75;
      monitorRef.current.rotation.y = THREE.MathUtils.lerp(
        monitorRef.current.rotation.y,
        -0.38 + targetY,
        0.07,
      );
      monitorRef.current.rotation.x = THREE.MathUtils.lerp(
        monitorRef.current.rotation.x,
        targetX,
        0.07,
      );
    }
    if (cameraRef.current && introComplete) {
      const z = CAMERA.z + py * 0.08;
      cameraRef.current.position.z = THREE.MathUtils.lerp(
        cameraRef.current.position.z,
        z,
        0.05,
      );
    }
  });

  return (
    <>
      <PerspectiveCamera
        ref={cameraRef}
        makeDefault
        position={[CAMERA.x, CAMERA.y, CAMERA.z]}
        fov={FOV}
      />
      <Suspense fallback={null}>
        <HeroMonitor groupRef={monitorRef} />
      </Suspense>
    </>
  );
}
