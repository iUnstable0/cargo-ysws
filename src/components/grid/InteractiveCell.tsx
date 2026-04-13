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
import type { NavCell, ActionCell } from "./types";
import { easeInOutCubic, phaseProgress } from "./utils";
import styles from "./grid.module.scss";

const HOVER_DAMP_IDLE = 14;
const HOVER_DAMP_ACTIVE = 16;
const PRESS_SINK = HOVER_POP * 0.5;
const PRESS_DAMP = 22;
const OPACITY_EPSILON = 0.001;
const LABEL_EPSILON = 0.005;
const SHADOW_POP_THRESHOLD = 0.12;
const EDGE_HOVER_OPACITY = 0.45;
const EDGE_DAMP = 18;
const EDGE_SCALE = 1.002;
const DISABLED_OPACITY = 0.5;
const DISABLED_DAMP = 10;

export function InteractiveCell({
  cell,
  isActive,
  isDisabled = false,
  progressRef,
  cellHoveredRef,
  onClick,
  offsetX = 0,
  offsetY = 0,
  backWallZ = BACK_WALL_Z,
  visibilityRef,
}: {
  cell: NavCell | ActionCell;
  isActive: boolean;
  isDisabled?: boolean;
  progressRef: React.RefObject<number>;
  cellHoveredRef: React.RefObject<boolean>;
  onClick: () => void;
  /** World-space offset for child rooms */
  offsetX?: number;
  offsetY?: number;
  /** Override back wall Z for child rooms */
  backWallZ?: number;
  /** Controls label/cube visibility for child room entry animation */
  visibilityRef?: React.RefObject<number>;
}) {
  const restZ = backWallZ - CUBE_HALF;

  const cubeGroupRef = useRef<THREE.Group>(null);
  const cubeMeshRef = useRef<THREE.Mesh>(null);
  const htmlRef = useRef<HTMLSpanElement>(null);
  const edgesRef = useRef<EdgesRef>(null);
  const hovered = useRef(false);
  const pressed = useRef(false);
  const hoverT = useRef(0);
  const pressT = useRef(0);
  const edgeOpacity = useRef(0);
  const disabledT = useRef(isDisabled ? 1 : 0);
  const lastCubeOpacity = useRef(1);
  const lastEdgeOpacity = useRef(0);
  const lastLabelOpacity = useRef(1);
  const lastCastShadow = useRef<boolean | null>(null);
  const shadowOverlayMatRef = useRef<THREE.ShadowMaterial>(null);

  const cubeMaterials = useMemo(
    () => [
      new THREE.MeshStandardMaterial({
        color: "#a69080",
        roughness: 0.8,
        transparent: true,
      }), // +X right
      new THREE.MeshStandardMaterial({
        color: "#9d8777",
        roughness: 0.8,
        transparent: true,
      }), // -X left
      new THREE.MeshStandardMaterial({
        color: "#ad9787",
        roughness: 0.8,
        transparent: true,
      }), // +Y top
      new THREE.MeshStandardMaterial({
        color: "#98826f",
        roughness: 0.8,
        transparent: true,
      }), // -Y bottom
      new THREE.MeshBasicMaterial({
        color: ROOM_COLOR,
        transparent: true,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }), // +Z front
      new THREE.MeshStandardMaterial({
        color: "#a08a7a",
        roughness: 0.8,
        transparent: true,
      }), // -Z back
    ],
    [],
  );

  const TUNNEL_DEPTH = CUBE_DEPTH;
  const TUNNEL_SIZE = CELL_SIZE + 0.02;
  const tunnelMats = useMemo(
    () => [
      new THREE.MeshStandardMaterial({
        color: ROOM_COLOR,
        side: THREE.BackSide,
        roughness: 0.8,
      }),
      new THREE.MeshStandardMaterial({
        color: ROOM_COLOR,
        side: THREE.BackSide,
        roughness: 0.8,
      }),
      new THREE.MeshStandardMaterial({
        color: ROOM_COLOR,
        side: THREE.BackSide,
        roughness: 0.8,
      }),
      new THREE.MeshStandardMaterial({
        color: ROOM_COLOR,
        side: THREE.BackSide,
        roughness: 0.8,
      }),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }),
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        visible: false,
      }),
    ],
    [],
  );

  const shadowOverlayMeshRef = useRef<THREE.Mesh>(null);

  const worldX = offsetX + cell.centerX;
  const worldY = offsetY + cell.centerY;

  useFrame((_, delta) => {
    if (!cubeGroupRef.current) return;
    const p = progressRef.current ?? 0;

    // Disabled state animation
    disabledT.current = THREE.MathUtils.damp(
      disabledT.current,
      isDisabled ? 1 : 0,
      DISABLED_DAMP,
      delta,
    );

    const hoverTarget = !isActive && !isDisabled && hovered.current ? 1 : 0;
    hoverT.current = THREE.MathUtils.damp(
      hoverT.current,
      hoverTarget,
      isActive ? HOVER_DAMP_ACTIVE : HOVER_DAMP_IDLE,
      delta,
    );
    if (hoverTarget === 0 && hoverT.current < 0.02) hoverT.current = 0;

    const pressTarget =
      !isActive && !isDisabled && pressed.current && hovered.current ? 1 : 0;
    pressT.current = THREE.MathUtils.damp(
      pressT.current,
      pressTarget,
      PRESS_DAMP,
      delta,
    );
    if (pressTarget === 0 && pressT.current < 0.01) pressT.current = 0;

    const sinkP = isActive
      ? easeInOutCubic(phaseProgress(p, 0, PHASE_SINK_END))
      : 0;
    cubeGroupRef.current.position.z =
      restZ +
      hoverT.current * HOVER_POP -
      pressT.current * PRESS_SINK -
      sinkP * SINK_DEPTH;

    // Cube opacity — also blend in disabled state
    const baseCubeOpacity = isActive ? Math.max(0, 1 - sinkP * 1.5) : 1;
    const cubeOpacity =
      baseCubeOpacity * (1 - disabledT.current * (1 - DISABLED_OPACITY));
    if (Math.abs(cubeOpacity - lastCubeOpacity.current) > OPACITY_EPSILON) {
      const shouldDepthWrite = cubeOpacity > 0.01;
      cubeMaterials.forEach((mat) => {
        mat.opacity = cubeOpacity;
        mat.depthWrite = shouldDepthWrite;
      });
      lastCubeOpacity.current = cubeOpacity;
    }

    // Shadow casting
    if (cubeMeshRef.current) {
      const shouldCastShadow =
        (hoverT.current > SHADOW_POP_THRESHOLD || isActive) &&
        cubeOpacity > 0.05;
      if (lastCastShadow.current !== shouldCastShadow) {
        cubeMeshRef.current.castShadow = shouldCastShadow;
        lastCastShadow.current = shouldCastShadow;
      }
    }

    // Shadow overlay
    if (shadowOverlayMatRef.current) {
      const overlayOpacity =
        sinkP > 0.01 ? 0 : Math.min(1, hoverT.current / 0.02) * 0.3;
      shadowOverlayMatRef.current.opacity = overlayOpacity;
    }
    if (shadowOverlayMeshRef.current) {
      shadowOverlayMeshRef.current.receiveShadow =
        sinkP < 0.01 && hoverT.current > 0.02;
    }

    // Edge opacity
    if (edgesRef.current) {
      const targetEdgeOpacity =
        !isActive && !isDisabled && hovered.current ? EDGE_HOVER_OPACITY : 0;
      edgeOpacity.current = THREE.MathUtils.damp(
        edgeOpacity.current,
        targetEdgeOpacity,
        EDGE_DAMP,
        delta,
      );
      if (targetEdgeOpacity === 0 && edgeOpacity.current < 0.001) {
        edgeOpacity.current = 0;
      }

      if (
        Math.abs(edgeOpacity.current - lastEdgeOpacity.current) >
        OPACITY_EPSILON
      ) {
        const mat = edgesRef.current.material;
        mat.transparent = true;
        mat.opacity = edgeOpacity.current;
        mat.depthWrite = false;
        mat.depthTest = true;
        lastEdgeOpacity.current = edgeOpacity.current;
      }
    }

    // Label opacity
    if (htmlRef.current) {
      const visibility = visibilityRef?.current ?? 1;
      const baseLabelOpacity = !isActive
        ? 1
        : Math.max(0, 1 - (p / PHASE_SINK_END) * 1.5);
      const labelOpacity =
        baseLabelOpacity *
        visibility *
        (1 - disabledT.current * (1 - DISABLED_OPACITY));
      if (Math.abs(labelOpacity - lastLabelOpacity.current) > LABEL_EPSILON) {
        htmlRef.current.style.opacity = labelOpacity.toString();
        lastLabelOpacity.current = labelOpacity;
      }
    }
  });

  return (
    <>
      {/* Moving cube + label */}
      <group ref={cubeGroupRef} position={[worldX, worldY, restZ]}>
        <mesh
          ref={cubeMeshRef}
          material={cubeMaterials}
          receiveShadow
          onPointerEnter={() => {
            if (!isActive && !isDisabled) {
              hovered.current = true;
              cellHoveredRef.current = true;
              document.body.style.cursor = "pointer";
            }
          }}
          onPointerLeave={() => {
            hovered.current = false;
            pressed.current = false;
            cellHoveredRef.current = false;
            document.body.style.cursor = "auto";
          }}
          onPointerDown={(e) => {
            if (!isActive && !isDisabled) {
              (e as any).stopPropagation();
              pressed.current = true;
            }
          }}
          onPointerUp={() => {
            pressed.current = false;
          }}
          onClick={(e) => {
            if (!isActive && !isDisabled) {
              e.stopPropagation();
              pressed.current = false;
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

        {/* Shadow-receiving overlay on front face */}
        <mesh
          ref={(mesh: THREE.Mesh | null) => {
            shadowOverlayMeshRef.current = mesh;
            if (mesh) mesh.raycast = () => {};
          }}
          position={[0, 0, CUBE_HALF + 0.01]}
          receiveShadow
        >
          <planeGeometry args={[CELL_SIZE, CELL_SIZE]} />
          <shadowMaterial
            ref={shadowOverlayMatRef}
            transparent
            opacity={0}
            polygonOffset
            polygonOffsetFactor={1}
            polygonOffsetUnits={1}
          />
        </mesh>

        {/* Label */}
        <Html
          position={[0, 0, CUBE_HALF + 0.08]}
          center
          zIndexRange={[1, 0]}
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
          position={[worldX, worldY, backWallZ - TUNNEL_DEPTH / 2]}
          material={tunnelMats}
        >
          <boxGeometry args={[TUNNEL_SIZE, TUNNEL_SIZE, TUNNEL_DEPTH]} />
        </mesh>
      </group>
    </>
  );
}
