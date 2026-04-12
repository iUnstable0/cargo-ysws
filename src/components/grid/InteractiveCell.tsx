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
  PHASE_SINK_END,
  ROOM_COLOR,
  GRID_COLOR,
} from "./constants";
import type { CellDef } from "./constants";
import { easeInOutCubic, phaseProgress } from "./utils";
import styles from "./grid.module.scss";

// Flushed perfectly to BACK_WALL_Z to permanently remove exposed 3D geometry edges that incorrectly intercept directional lighting during parallax offset viewing.
const REST_Z = BACK_WALL_Z - CUBE_HALF;
const HOVER_DAMP_IDLE = 14;
const HOVER_DAMP_ACTIVE = 16;
const OPACITY_EPSILON = 0.001;
const LABEL_EPSILON = 0.005;
const SHADOW_POP_THRESHOLD = 0.12;
const EDGE_HOVER_OPACITY = 0.45;
const EDGE_DAMP = 18;
const EDGE_SCALE = 1.002;

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
  const htmlRef = useRef<HTMLSpanElement>(null);
  const edgesRef = useRef<EdgesRef>(null);
  const hovered = useRef(false);
  const hoverT = useRef(0);
  const edgeOpacity = useRef(0);
  const lastCubeOpacity = useRef(1);
  const lastEdgeOpacity = useRef(0);
  const lastLabelOpacity = useRef(1);
  const lastCastShadow = useRef<boolean | null>(null);

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
      new THREE.MeshBasicMaterial({
        color: ROOM_COLOR,
        transparent: true,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }), // +Z front — depth-biased to avoid coplanar edge flicker
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

  useFrame((_, delta) => {
    if (!cubeGroupRef.current) return;
    const p = progressRef.current ?? 0;
    const hoverTarget = !isActive && hovered.current ? 1 : 0;
    hoverT.current = THREE.MathUtils.damp(
      hoverT.current,
      hoverTarget,
      isActive ? HOVER_DAMP_ACTIVE : HOVER_DAMP_IDLE,
      delta,
    );
    if (hoverTarget === 0 && hoverT.current < 0.001) hoverT.current = 0;

    const sinkP = isActive
      ? easeInOutCubic(phaseProgress(p, 0, PHASE_SINK_END))
      : 0;
    cubeGroupRef.current.position.z =
      REST_Z + hoverT.current * HOVER_POP - sinkP * SINK_DEPTH;

    // Smoothly fade the physical cube transparency instead of scaling.
    const cubeOpacity = isActive ? Math.max(0, 1 - sinkP * 1.5) : 1;
    if (Math.abs(cubeOpacity - lastCubeOpacity.current) > OPACITY_EPSILON) {
      const shouldDepthWrite = cubeOpacity > 0.01;
      cubeMaterials.forEach((mat) => {
        mat.opacity = cubeOpacity;
        mat.depthWrite = shouldDepthWrite; // Let camera pass through ghosted cube without depth artifacts.
      });
      lastCubeOpacity.current = cubeOpacity;
    }

    // Shadow only when cube is popped out
    if (cubeMeshRef.current) {
      const shouldCastShadow = hoverT.current > SHADOW_POP_THRESHOLD || isActive;
      if (lastCastShadow.current !== shouldCastShadow) {
        cubeMeshRef.current.castShadow = shouldCastShadow;
        lastCastShadow.current = shouldCastShadow;
      }
    }

    if (edgesRef.current) {
      const targetEdgeOpacity = !isActive && hovered.current ? EDGE_HOVER_OPACITY : 0;
      edgeOpacity.current = THREE.MathUtils.damp(
        edgeOpacity.current,
        targetEdgeOpacity,
        EDGE_DAMP,
        delta,
      );
      if (targetEdgeOpacity === 0 && edgeOpacity.current < 0.001) {
        edgeOpacity.current = 0;
      }

      if (Math.abs(edgeOpacity.current - lastEdgeOpacity.current) > OPACITY_EPSILON) {
        const mat = edgesRef.current.material;
        mat.transparent = true;
        mat.opacity = edgeOpacity.current;
        mat.depthWrite = false;
        mat.depthTest = true;
        lastEdgeOpacity.current = edgeOpacity.current;
      }
    }

    // Label visibility fade
    if (htmlRef.current) {
      const labelOpacity = !isActive
        ? 1
        : Math.max(0, 1 - (p / PHASE_SINK_END) * 1.5);
      if (Math.abs(labelOpacity - lastLabelOpacity.current) > LABEL_EPSILON) {
        htmlRef.current.style.opacity = labelOpacity.toString();
        lastLabelOpacity.current = labelOpacity;
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
          <Edges
            ref={edgesRef}
            color={GRID_COLOR}
            transparent
            opacity={0}
            scale={EDGE_SCALE}
            renderOrder={3}
          />
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
