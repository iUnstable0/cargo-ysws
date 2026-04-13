"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { useRef, useMemo, useLayoutEffect } from "react";
import * as THREE from "three";
import { BACK_WALL_Z, CELL_SIZE, RUNNER_COLOR } from "./constants";

const BASE_HEIGHT = 800;
const BASE_LINE_WIDTH = 3.6;
const DASH_SIZE = 1.8;
const SPEED = 6;

/**
 * A glowing dashed runner that orbits the perimeter of a cell.
 * Used as a loading indicator when a nav cell is preparing to navigate.
 */
export function CellLoadingRunner({
  centerX,
  centerY,
  backWallZ = BACK_WALL_Z,
}: {
  centerX: number;
  centerY: number;
  backWallZ?: number;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lineRef = useRef<any>(null);
  const offset = useRef(0);
  const size = useThree((state) => state.size);
  const lineWidth = Math.max(
    0.8,
    (size.height / BASE_HEIGHT) * BASE_LINE_WIDTH,
  );

  // Build a closed rectangular path around the cell perimeter
  const { points, totalLen } = useMemo(() => {
    const half = CELL_SIZE / 2 + 0.15; // slight outset so runner sits outside the cube
    const z = backWallZ + 0.08; // just in front of the wall
    const pts = [
      new THREE.Vector3(centerX - half, centerY - half, z),
      new THREE.Vector3(centerX + half, centerY - half, z),
      new THREE.Vector3(centerX + half, centerY + half, z),
      new THREE.Vector3(centerX - half, centerY + half, z),
      new THREE.Vector3(centerX - half, centerY - half, z), // close the loop
    ];
    const len = CELL_SIZE * 4 + 0.6; // perimeter
    return { points: pts, totalLen: len };
  }, [centerX, centerY, backWallZ]);

  useFrame((_, delta) => {
    const period = DASH_SIZE + totalLen;
    offset.current = (offset.current - delta * SPEED) % period;
    if (lineRef.current?.material) {
      lineRef.current.material.dashOffset = offset.current;
    }
  });

  useLayoutEffect(() => {
    if (lineRef.current?.material) {
      const mat = lineRef.current.material;
      // HDR color to trigger bloom
      mat.color.set(RUNNER_COLOR).multiplyScalar(4);
      mat.toneMapped = false;

      mat.onBeforeCompile = (shader: any) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <tonemapping_fragment>",
          `
          #ifdef USE_DASH
            float localDist = mod( vLineDistance + dashOffset, dashSize + gapSize );
            gl_FragColor.a *= pow(localDist / dashSize, 2.5);
          #endif
          #include <tonemapping_fragment>
          `,
        );
      };
    }
  }, []);

  return (
    <Line
      ref={lineRef}
      points={points}
      color={RUNNER_COLOR}
      lineWidth={lineWidth}
      dashed
      dashSize={DASH_SIZE}
      gapSize={totalLen}
      transparent
      opacity={0.9}
    />
  );
}
