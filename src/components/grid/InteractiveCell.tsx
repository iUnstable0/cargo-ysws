"use client";

import { useFrame } from "@react-three/fiber";
import { Html, Edges } from "@react-three/drei";
import type { EdgesRef } from "@react-three/drei";
import * as THREE from "three";
import { useMemo, useRef } from "react";
import {
  BACK_WALL_Z,
  CELL_SIZE,
  CUBE_DEPTH,
  CUBE_HALF,
  HOVER_POP,
  SINK_DEPTH,
  LIP_DEPTH,
  PHASE_SINK_END,
  ROOM_COLOR,
  GRID_COLOR,
} from "./constants";
import type { CellDef } from "./constants";
import { easeInOutCubic, phaseProgress } from "./utils";
import styles from "./grid.module.scss";

const CELL_HALF = CELL_SIZE / 2;
// Flushed perfectly to BACK_WALL_Z to permanently remove exposed 3D geometry edges that incorrectly intercept directional lighting during parallax offset viewing.
const REST_Z = BACK_WALL_Z - CUBE_HALF;

const baseRoom = new THREE.Color(ROOM_COLOR);

export function InteractiveCell({
  cell,
  isActive,
  progressRef,
  cellHoveredRef,
  onClick,
}: {
  cell: CellDef;
  isActive: boolean;
  progressRef: React.RefObject<number>;
  cellHoveredRef: React.RefObject<boolean>;
  onClick: () => void;
}) {
  const cubeGroupRef = useRef<THREE.Group>(null);
  const cubeMeshRef = useRef<THREE.Mesh>(null);
  const holeRef = useRef<THREE.Group>(null);
  const htmlRef = useRef<HTMLSpanElement>(null);
  const edgesRef = useRef<EdgesRef>(null);
  const hovered = useRef(false);
  const hoverT = useRef(0);

  const cubeMaterials = useMemo(
    () => [
      new THREE.MeshStandardMaterial({
        color: "#a69080",
        roughness: 0.8,
        transparent: true,
      }), // +X right — darker
      new THREE.MeshStandardMaterial({
        color: "#9d8777",
        roughness: 0.8,
        transparent: true,
      }), // -X left — darkest (shadow side)
      new THREE.MeshStandardMaterial({
        color: "#ad9787",
        roughness: 0.8,
        transparent: true,
      }), // +Y top — slightly dark
      new THREE.MeshStandardMaterial({
        color: "#98826f",
        roughness: 0.8,
        transparent: true,
      }), // -Y bottom — dark (underside)
      new THREE.MeshBasicMaterial({ color: ROOM_COLOR, transparent: true }), // +Z front — seamlessly matches unlit wall
      new THREE.MeshStandardMaterial({
        color: "#a08a7a",
        roughness: 0.8,
        transparent: true,
      }), // -Z back
    ],
    [],
  );

  const TUNNEL_DEPTH = CUBE_DEPTH; // Slimmer wall thickness
  const TUNNEL_SIZE = CELL_SIZE + 0.02;
  const tunnelMats = useMemo(
    () => [
      new THREE.MeshStandardMaterial({
        color: ROOM_COLOR,
        side: THREE.BackSide,
        roughness: 0.8,
      }), // Right
      new THREE.MeshStandardMaterial({
        color: ROOM_COLOR,
        side: THREE.BackSide,
        roughness: 0.8,
      }), // Left
      new THREE.MeshStandardMaterial({
        color: ROOM_COLOR,
        side: THREE.BackSide,
        roughness: 0.8,
      }), // Top
      new THREE.MeshStandardMaterial({
        color: ROOM_COLOR,
        side: THREE.BackSide,
        roughness: 0.8,
      }), // Bottom
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }), // Front (open hole)
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        visible: false,
      }), // Back
    ],
    [],
  );

  useFrame(() => {
    if (!cubeGroupRef.current) return;
    const p = progressRef.current ?? 0;

    if (isActive) {
      hoverT.current = THREE.MathUtils.lerp(hoverT.current, 0, 0.08);

      const sinkP = easeInOutCubic(phaseProgress(p, 0, PHASE_SINK_END));
      cubeGroupRef.current.position.z =
        REST_Z + hoverT.current * HOVER_POP - sinkP * SINK_DEPTH;

      // Smoothly fade the physical cube transparency instead of scaling
      const opacity = Math.max(0, 1 - sinkP * 1.5);
      cubeMaterials.forEach((mat) => {
        const m = mat as THREE.Material;
        m.opacity = opacity;
        m.depthWrite = opacity > 0.01; // Safely toggle depth write so camera passes through ghost cleanly
      });

      cubeGroupRef.current.position.y = cell.centerY;
      cubeGroupRef.current.scale.set(1, 1, 1);
    } else {
      const target = hovered.current ? 1 : 0;
      hoverT.current = THREE.MathUtils.lerp(hoverT.current, target, 0.06);
      if (!hovered.current && hoverT.current < 0.001) hoverT.current = 0;

      cubeGroupRef.current.position.z = REST_Z + hoverT.current * HOVER_POP;
      cubeGroupRef.current.position.y = cell.centerY;
      cubeGroupRef.current.scale.set(1, 1, 1);
      (cubeMaterials[4] as THREE.MeshBasicMaterial).color.copy(baseRoom);

      cubeMaterials.forEach((mat) => {
        const m = mat as THREE.Material;
        m.opacity = 1;
        m.depthWrite = true;
      });
    }

    // Shadow only when cube is popped out
    if (cubeMeshRef.current) {
      cubeMeshRef.current.castShadow = hoverT.current > 0.01 || isActive;
    }

    // Edges glowing outline on hover (also fades out proportionally to sink)
    if (edgesRef.current) {
      const mat = edgesRef.current.material;
      const opacity = isActive ? Math.max(0, 1 - p * 3) : 1;
      mat.transparent = true;
      mat.opacity = hoverT.current * 0.45 * opacity;
    }

    // Label visibility fade
    if (htmlRef.current) {
      if (!isActive) {
        htmlRef.current.style.opacity = "1";
      } else {
        const op = Math.max(0, 1 - (p / PHASE_SINK_END) * 1.5);
        htmlRef.current.style.opacity = op.toString();
      }
    }
  });

  return (
    <>
      {/* Moving cube + label */}
      <group ref={cubeGroupRef} position={[cell.centerX, cell.centerY, REST_Z]}>
        <mesh
          ref={cubeMeshRef}
          material={cubeMaterials}
          onPointerEnter={() => {
            if (!isActive) {
              hovered.current = true;
              cellHoveredRef.current = true;
              document.body.style.cursor = "pointer";
            }
          }}
          onPointerLeave={() => {
            hovered.current = false;
            cellHoveredRef.current = false;
            document.body.style.cursor = "auto";
          }}
          onClick={(e) => {
            if (!isActive) {
              e.stopPropagation();
              onClick();
            }
          }}
        >
          <boxGeometry args={[CELL_SIZE, CELL_SIZE, CUBE_DEPTH]} />
          {/* Subtle gold/amber animated edge on hover */}
          <Edges ref={edgesRef} color={GRID_COLOR} transparent={true} />
        </mesh>

        {/* Label — pointer-events: none so hover stays on the 3D mesh */}
        <Html
          position={[0, 0, CUBE_HALF + 0.08]}
          center
          zIndexRange={[5, 0]}
          style={{ pointerEvents: "none" }}
        >
          <span ref={htmlRef} className={styles.cellLabel}>
            {cell.label}
          </span>
        </Html>
      </group>

      {/* Physical tunnel behind the wall */}
      <group>
        <mesh
          position={[
            cell.centerX,
            cell.centerY,
            BACK_WALL_Z - TUNNEL_DEPTH / 2,
          ]}
          material={tunnelMats}
        >
          <boxGeometry args={[TUNNEL_SIZE, TUNNEL_SIZE, TUNNEL_DEPTH]} />
        </mesh>
      </group>
    </>
  );
}
