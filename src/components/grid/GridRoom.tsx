"use client";

import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { ROOM_COLOR, GRID_COLOR } from "./constants";
import { buildWalls, generateScene } from "./utils";
import { GridRunner } from "./GridRunner";

export function GridRoom({
  width,
  height,
  depth,
  centerX = 0,
  centerY = 0,
  centerZ = 0,
  seed,
  runnersPerWall = { back: 8, left: 5, right: 5, top: 4, bottom: 4 },
  opacityRef,
  receiveShadow = false,
  children,
}: {
  width: number;
  height: number;
  depth: number;
  centerX?: number;
  centerY?: number;
  centerZ?: number;
  seed: number;
  runnersPerWall?: Record<string, number>;
  opacityRef?: React.RefObject<number>;
  receiveShadow?: boolean;
  children?: ReactNode;
}) {
  const wallMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const gridGroupRef = useRef<THREE.Group>(null);
  const runnerGroupRef = useRef<THREE.Group>(null);

  const walls = useMemo(
    () => buildWalls(width, height, depth, centerX, centerY, centerZ),
    [width, height, depth, centerX, centerY, centerZ],
  );

  const scene = useMemo(
    () => generateScene(walls, runnersPerWall, seed),
    [walls, runnersPerWall, seed],
  );

  // When opacityRef is provided, animate material opacities (for hidden layer fade-in)
  useFrame(() => {
    if (!opacityRef) return;
    const o = opacityRef.current ?? 0;

    if (wallMatRef.current) {
      wallMatRef.current.opacity = o;
    }
    if (gridGroupRef.current) {
      gridGroupRef.current.children.forEach((child, i) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mat = (child as any).material;
        if (mat) {
          if (i < scene.backWallGrid.length) {
            mat.opacity = o * scene.backWallGrid[i].opacity;
          } else {
            mat.opacity = o * 0.45;
          }
        }
      });
    }
    if (runnerGroupRef.current) {
      runnerGroupRef.current.visible = o > 0.1;
    }
  });

  const isAnimated = !!opacityRef;

  return (
    <group>
      {/* Room box */}
      <mesh position={[centerX, centerY, centerZ]}>
        <boxGeometry args={[width, height, depth]} />
        <meshBasicMaterial
          ref={wallMatRef}
          color={ROOM_COLOR}
          transparent={isAnimated}
          opacity={isAnimated ? 0 : 1}
          side={THREE.BackSide}
          fog
        />
      </mesh>

      {/* Shadow-receiving plane on the back wall (FrontSide for proper shadow reception) */}
      {receiveShadow && (
        <mesh
          position={[centerX, centerY, centerZ - depth / 2 + 0.02]}
          receiveShadow
        >
          <planeGeometry args={[width, height]} />
          <shadowMaterial transparent opacity={0.3} />
        </mesh>
      )}

      {/* Back wall grid */}
      <group ref={gridGroupRef}>
        {scene.backWallGrid.map((line, i) => (
          <Line
            key={`bg-${i}`}
            points={[line.start, line.end]}
            color={GRID_COLOR}
            lineWidth={1.2}
            transparent
            opacity={isAnimated ? 0 : line.opacity}
          />
        ))}
        {scene.otherWallsGrid.length > 0 && (
          <Line
            key="og"
            points={scene.otherWallsGrid}
            segments
            color={GRID_COLOR}
            lineWidth={1.2}
            transparent
            opacity={isAnimated ? 0 : 0.45}
          />
        )}
      </group>

      {/* Animated grid runners */}
      <group ref={runnerGroupRef} visible={!isAnimated}>
        {scene.runners.map((runner, i) => (
          <GridRunner key={`r-${i}`} runner={runner} />
        ))}
      </group>

      {children}
    </group>
  );
}
