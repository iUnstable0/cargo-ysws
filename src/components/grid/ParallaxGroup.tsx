"use client";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useRef } from "react";
import type { ReactNode } from "react";

export function ParallaxGroup({
  children,
  progressRef,
  cellHoveredRef,
}: {
  children: ReactNode;
  progressRef: React.RefObject<number>;
  cellHoveredRef: React.RefObject<boolean>;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((three) => {
    if (!groupRef.current) return;
    const intensity = progressRef.current ?? 1;
    const suppress = cellHoveredRef.current;
    const targetY = suppress ? 0 : three.pointer.x * 0.04 * intensity;
    const targetX = suppress ? 0 : -three.pointer.y * 0.03 * intensity;
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      targetY,
      0.05,
    );
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      targetX,
      0.05,
    );
  });

  return <group ref={groupRef}>{children}</group>;
}
