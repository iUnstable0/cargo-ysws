"use client";

import { useFrame } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import type { EdgesRef } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { useMemo, useRef } from "react";
import {
  CUBE_DEPTH,
  CUBE_HALF,
  ROOM_COLOR,
  GRID_COLOR,
  SHADOW_POP_THRESHOLD,
  EDGE_DAMP,
  EDGE_SCALE,
  OPACITY_EPSILON,
} from "./constants";

/**
 * Shared 3D cell body — cube mesh, shadow overlay, and animated edges.
 * Parent positions via an outer <group> and drives animation through refs.
 */
export function CellBody({
  width,
  height,
  popT,
  edgeTarget,
  cubeOpacity,
  cubeMeshRef: externalCubeMeshRef,
  onPointerEnter,
  onPointerLeave,
  onPointerDown,
  onPointerUp,
  onClick,
}: {
  width: number;
  height: number;
  /** How far popped out (0 = resting). Drives shadow casting. */
  popT: React.RefObject<number>;
  /** Target edge opacity — parent computes from hover/selected/pop state. */
  edgeTarget: React.RefObject<number>;
  /** Overall cube opacity (default: always 1). */
  cubeOpacity?: React.RefObject<number>;
  cubeMeshRef?: React.RefObject<THREE.Mesh>;
  onPointerEnter?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerLeave?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerUp?: (e: ThreeEvent<PointerEvent>) => void;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}) {
  const internalCubeMeshRef = useRef<THREE.Mesh>(null);
  const cubeMeshRef = externalCubeMeshRef ?? internalCubeMeshRef;
  const edgesRef = useRef<EdgesRef>(null);
  const shadowOverlayMeshRef = useRef<THREE.Mesh>(null);
  const shadowOverlayMatRef = useRef<THREE.ShadowMaterial>(null);

  const edgeOpacity = useRef(0);
  const lastEdgeOpacity = useRef(0);
  const lastCubeOpacity = useRef(1);
  const lastCastShadow = useRef<boolean | null>(null);
  const lastTransparent = useRef(false);

  const cubeMaterials = useMemo(
    () => [
      new THREE.MeshStandardMaterial({ color: "#a69080", roughness: 0.8 }), // +X
      new THREE.MeshStandardMaterial({ color: "#9d8777", roughness: 0.8 }), // -X
      new THREE.MeshStandardMaterial({ color: "#ad9787", roughness: 0.8 }), // +Y
      new THREE.MeshStandardMaterial({ color: "#98826f", roughness: 0.8 }), // -Y
      new THREE.MeshBasicMaterial({
        color: ROOM_COLOR,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }), // +Z front
      new THREE.MeshStandardMaterial({ color: "#a08a7a", roughness: 0.8 }), // -Z
    ],
    [],
  );

  useFrame((_, delta) => {
    const pop = popT.current ?? 0;
    const opacity = cubeOpacity?.current ?? 1;

    // --- Cube opacity ---
    if (Math.abs(opacity - lastCubeOpacity.current) > OPACITY_EPSILON) {
      const shouldDepthWrite = opacity > 0.01;
      const needsTransparency = opacity < 0.999;
      const transparencyChanged = needsTransparency !== lastTransparent.current;
      cubeMaterials.forEach((mat) => {
        mat.opacity = opacity;
        mat.depthWrite = shouldDepthWrite;
        if (transparencyChanged) {
          mat.transparent = needsTransparency;
          mat.needsUpdate = true;
        }
      });
      if (transparencyChanged) lastTransparent.current = needsTransparency;
      lastCubeOpacity.current = opacity;
    }

    // --- Shadow casting ---
    if (cubeMeshRef.current) {
      const shouldCast = pop > SHADOW_POP_THRESHOLD && opacity > 0.05;
      if (lastCastShadow.current !== shouldCast) {
        cubeMeshRef.current.castShadow = shouldCast;
        lastCastShadow.current = shouldCast;
      }
    }

    // --- Shadow overlay ---
    if (shadowOverlayMatRef.current) {
      shadowOverlayMatRef.current.opacity =
        Math.min(1, pop / 0.02) * 0.3;
    }
    if (shadowOverlayMeshRef.current) {
      shadowOverlayMeshRef.current.receiveShadow = pop > 0.02;
    }

    // --- Edge opacity ---
    if (edgesRef.current) {
      const target = edgeTarget.current ?? 0;
      edgeOpacity.current = THREE.MathUtils.damp(
        edgeOpacity.current,
        target,
        EDGE_DAMP,
        delta,
      );
      if (target === 0 && edgeOpacity.current < 0.001) {
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
  });

  return (
    <>
      {/* Cube mesh */}
      <mesh
        ref={cubeMeshRef}
        material={cubeMaterials}
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onClick={onClick}
      >
        <boxGeometry args={[width, height, CUBE_DEPTH]} />
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
        <planeGeometry args={[width, height]} />
        <shadowMaterial
          ref={shadowOverlayMatRef}
          transparent
          opacity={0}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>
    </>
  );
}
