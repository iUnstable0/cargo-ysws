"use client";

import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
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
} from "./constants";
import type { CellDef } from "./constants";
import { easeInOutCubic, phaseProgress } from "./utils";
import styles from "./grid.module.scss";

const CELL_HALF = CELL_SIZE / 2;
// Push cube 0.05 forward from the wall to avoid z-fighting between front face and wall
const REST_Z = BACK_WALL_Z - CUBE_HALF + 0.05;

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
  const hovered = useRef(false);
  const hoverT = useRef(0);

  // MeshBasicMaterial for all faces — self-illuminating, predictable color
  // Front face matches wall exactly; sides slightly darker for 3D definition
  const cubeMaterials = useMemo(
    () => [
      new THREE.MeshBasicMaterial({ color: "#a69080" }), // +X right — darker
      new THREE.MeshBasicMaterial({ color: "#9d8777" }), // -X left — darkest (shadow side)
      new THREE.MeshBasicMaterial({ color: "#ad9787" }), // +Y top — slightly dark
      new THREE.MeshBasicMaterial({ color: "#98826f" }), // -Y bottom — dark (underside)
      new THREE.MeshBasicMaterial({ color: ROOM_COLOR }), // +Z front — matches wall
      new THREE.MeshBasicMaterial({ color: "#a08a7a" }), // -Z back
    ],
    [],
  );

  // Hole inner wall materials — graduated shadow effect
  const holeLipMats = useMemo(
    () => [
      // Top front / back
      new THREE.MeshBasicMaterial({
        color: "#7a6858",
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        fog: false,
      }),
      new THREE.MeshBasicMaterial({
        color: "#3a2818",
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        fog: false,
      }),
      // Bottom front / back
      new THREE.MeshBasicMaterial({
        color: "#6a5848",
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        fog: false,
      }),
      new THREE.MeshBasicMaterial({
        color: "#3a2818",
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        fog: false,
      }),
      // Left front / back
      new THREE.MeshBasicMaterial({
        color: "#705a48",
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        fog: false,
      }),
      new THREE.MeshBasicMaterial({
        color: "#3a2818",
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        fog: false,
      }),
      // Right front / back
      new THREE.MeshBasicMaterial({
        color: "#806858",
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        fog: false,
      }),
      new THREE.MeshBasicMaterial({
        color: "#3a2818",
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        fog: false,
      }),
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

      // Hole fades in as cube sinks
      if (holeRef.current) {
        holeRef.current.visible = true;
        const ho = easeInOutCubic(Math.min(1, sinkP * 1.5));
        holeLipMats.forEach((m, i) => {
          const isFront = i % 2 === 0;
          m.opacity = ho * (isFront ? 0.7 : 0.95);
        });
      }
    } else {
      const target = hovered.current ? 1 : 0;
      hoverT.current = THREE.MathUtils.lerp(hoverT.current, target, 0.06);
      if (!hovered.current && hoverT.current < 0.001) hoverT.current = 0;

      cubeGroupRef.current.position.z = REST_Z + hoverT.current * HOVER_POP;

      if (holeRef.current) {
        holeRef.current.visible = false;
        holeLipMats.forEach((m) => {
          m.opacity = 0;
        });
      }
    }

    // Shadow only when cube is popped out
    if (cubeMeshRef.current) {
      cubeMeshRef.current.castShadow = hoverT.current > 0.01 || isActive;
    }

    // Label visibility
    if (htmlRef.current) {
      const show = !isActive || p < 0.05;
      htmlRef.current.style.opacity = show ? "1" : "0";
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

      {/* Hole — fixed on wall, revealed when cube sinks */}
      <group ref={holeRef} visible={false}>
        {/* Top lip — front */}
        <mesh
          position={[
            cell.centerX,
            cell.centerY + CELL_HALF,
            BACK_WALL_Z + LIP_DEPTH * 0.75,
          ]}
          rotation={[Math.PI / 2, 0, 0]}
          material={holeLipMats[0]}
        >
          <planeGeometry args={[CELL_SIZE, LIP_DEPTH / 2]} />
        </mesh>
        {/* Top lip — back */}
        <mesh
          position={[
            cell.centerX,
            cell.centerY + CELL_HALF,
            BACK_WALL_Z + LIP_DEPTH * 0.25,
          ]}
          rotation={[Math.PI / 2, 0, 0]}
          material={holeLipMats[1]}
        >
          <planeGeometry args={[CELL_SIZE, LIP_DEPTH / 2]} />
        </mesh>
        {/* Bottom lip — front */}
        <mesh
          position={[
            cell.centerX,
            cell.centerY - CELL_HALF,
            BACK_WALL_Z + LIP_DEPTH * 0.75,
          ]}
          rotation={[Math.PI / 2, 0, 0]}
          material={holeLipMats[2]}
        >
          <planeGeometry args={[CELL_SIZE, LIP_DEPTH / 2]} />
        </mesh>
        {/* Bottom lip — back */}
        <mesh
          position={[
            cell.centerX,
            cell.centerY - CELL_HALF,
            BACK_WALL_Z + LIP_DEPTH * 0.25,
          ]}
          rotation={[Math.PI / 2, 0, 0]}
          material={holeLipMats[3]}
        >
          <planeGeometry args={[CELL_SIZE, LIP_DEPTH / 2]} />
        </mesh>
        {/* Left lip — front */}
        <mesh
          position={[
            cell.centerX - CELL_HALF,
            cell.centerY,
            BACK_WALL_Z + LIP_DEPTH * 0.75,
          ]}
          rotation={[0, Math.PI / 2, 0]}
          material={holeLipMats[4]}
        >
          <planeGeometry args={[LIP_DEPTH / 2, CELL_SIZE]} />
        </mesh>
        {/* Left lip — back */}
        <mesh
          position={[
            cell.centerX - CELL_HALF,
            cell.centerY,
            BACK_WALL_Z + LIP_DEPTH * 0.25,
          ]}
          rotation={[0, Math.PI / 2, 0]}
          material={holeLipMats[5]}
        >
          <planeGeometry args={[LIP_DEPTH / 2, CELL_SIZE]} />
        </mesh>
        {/* Right lip — front */}
        <mesh
          position={[
            cell.centerX + CELL_HALF,
            cell.centerY,
            BACK_WALL_Z + LIP_DEPTH * 0.75,
          ]}
          rotation={[0, Math.PI / 2, 0]}
          material={holeLipMats[6]}
        >
          <planeGeometry args={[LIP_DEPTH / 2, CELL_SIZE]} />
        </mesh>
        {/* Right lip — back */}
        <mesh
          position={[
            cell.centerX + CELL_HALF,
            cell.centerY,
            BACK_WALL_Z + LIP_DEPTH * 0.25,
          ]}
          rotation={[0, Math.PI / 2, 0]}
          material={holeLipMats[7]}
        >
          <planeGeometry args={[LIP_DEPTH / 2, CELL_SIZE]} />
        </mesh>
      </group>
    </>
  );
}
