"use client";

import * as THREE from "three";
import { useMemo } from "react";
import { BACK_WALL_Z, CUBE_DEPTH, ROOM_COLOR } from "./constants";

/** Physical tunnel behind the back wall — shared by InteractiveCell and WidgetMount. */
export function CellTunnel({
  worldX,
  worldY,
  width,
  height,
  backWallZ = BACK_WALL_Z,
}: {
  worldX: number;
  worldY: number;
  width: number;
  height: number;
  backWallZ?: number;
}) {
  const tunnelMats = useMemo(
    () => [
      new THREE.MeshStandardMaterial({ color: ROOM_COLOR, side: THREE.BackSide, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: ROOM_COLOR, side: THREE.BackSide, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: ROOM_COLOR, side: THREE.BackSide, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: ROOM_COLOR, side: THREE.BackSide, roughness: 0.8 }),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, visible: false }),
    ],
    [],
  );

  return (
    <mesh
      position={[worldX, worldY, backWallZ - CUBE_DEPTH / 2]}
      material={tunnelMats}
    >
      <boxGeometry args={[width + 0.02, height + 0.02, CUBE_DEPTH]} />
    </mesh>
  );
}
