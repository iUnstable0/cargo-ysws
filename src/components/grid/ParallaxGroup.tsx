"use client";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useRef } from "react";
import type { ReactNode } from "react";

const PARALLAX_DAMP = 10;

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

  useFrame((three, delta) => {
    if (!groupRef.current) return;
    const intensity = progressRef.current ?? 1;
    const suppress = cellHoveredRef.current;
    const targetY = suppress ? 0 : three.pointer.x * 0.04 * intensity;
    const targetX = suppress ? 0 : -three.pointer.y * 0.03 * intensity;
    groupRef.current.rotation.y = THREE.MathUtils.damp(
      groupRef.current.rotation.y,
      targetY,
      PARALLAX_DAMP,
      delta,
    );
    groupRef.current.rotation.x = THREE.MathUtils.damp(
      groupRef.current.rotation.x,
      targetX,
      PARALLAX_DAMP,
      delta,
    );
  });

  return <group ref={groupRef}>{children}</group>;
}
