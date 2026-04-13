"use client";

import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useMemo, useRef } from "react";
import {
  BACK_WALL_Z,
  CELL_SIZE,
  CUBE_HALF,
  HOVER_POP,
  SINK_DEPTH,
  PHASE_SINK_END,
  EDGE_HOVER_OPACITY,
  EDGE_SELECTED_OPACITY,
} from "./constants";
import type { NavCell, ActionCell } from "./types";
import { easeInOutCubic, phaseProgress } from "./utils";
import { CellBody } from "./CellBody";
import { CellTunnel } from "./CellTunnel";
import styles from "./grid.module.scss";

const HOVER_DAMP_IDLE = 14;
const HOVER_DAMP_ACTIVE = 16;
const PRESS_DAMP = 22;
const SELECTED_POP = 0.4;
const SELECTED_DAMP = 12;
const LABEL_EPSILON = 0.005;
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
  worldZOffset = 0,
  visibilityRef,
  selectedRef,
  hoverPop = HOVER_POP,
}: {
  cell: NavCell | ActionCell;
  isActive: boolean;
  isDisabled?: boolean;
  progressRef: React.RefObject<number>;
  cellHoveredRef: React.RefObject<boolean>;
  onClick: () => void;
  offsetX?: number;
  offsetY?: number;
  backWallZ?: number;
  worldZOffset?: number;
  visibilityRef?: React.RefObject<number>;
  selectedRef?: { current: Set<string> };
  hoverPop?: number;
}) {
  const pressSink = hoverPop * 0.5;
  const restZ = backWallZ - CUBE_HALF;

  const cubeGroupRef = useRef<THREE.Group>(null);
  const htmlRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const lastImageFilter = useRef("");
  const hovered = useRef(false);
  const pressed = useRef(false);
  const hoverT = useRef(0);
  const pressT = useRef(0);
  const selectedT = useRef(0);
  const disabledT = useRef(isDisabled ? 1 : 0);
  const lastLabelOpacity = useRef(1);

  // Refs driven each frame, read by CellBody
  const popT = useRef(0);
  const edgeTarget = useRef(0);
  const cubeOpacity = useRef(1);

  // Reusable vectors for label size projection
  const _labelV1 = useMemo(() => new THREE.Vector3(), []);
  const _labelV2 = useMemo(() => new THREE.Vector3(), []);
  const lastLabelWidth = useRef(0);
  const lastLabelHeight = useRef(0);
  const hasPrice = cell.kind === "action" && cell.price != null;

  const worldX = offsetX + cell.centerX;
  const worldY = offsetY + cell.centerY;

  useFrame(({ camera, size }, delta) => {
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

    // Selected state animation
    const isSelected = selectedRef?.current.has(cell.id) ?? false;
    const selectedTarget = isSelected ? 1 : 0;
    selectedT.current = THREE.MathUtils.damp(
      selectedT.current,
      selectedTarget,
      SELECTED_DAMP,
      delta,
    );
    if (selectedTarget === 0 && selectedT.current < 0.02) selectedT.current = 0;

    const sinkP = isActive
      ? easeInOutCubic(phaseProgress(p, 0, PHASE_SINK_END))
      : 0;
    cubeGroupRef.current.position.z =
      restZ +
      hoverT.current * hoverPop * (1 - selectedT.current * 0.85) +
      selectedT.current * SELECTED_POP -
      pressT.current * pressSink -
      sinkP * SINK_DEPTH;

    // Drive CellBody refs
    popT.current =
      sinkP > 0.01
        ? 0
        : Math.max(hoverT.current, selectedT.current > 0.1 ? selectedT.current : 0);

    edgeTarget.current =
      !isActive && !isDisabled && hovered.current
        ? EDGE_HOVER_OPACITY
        : selectedT.current > 0.1
          ? EDGE_SELECTED_OPACITY
          : 0;

    const baseCubeOpacity = isActive ? Math.max(0, 1 - sinkP * 1.5) : 1;
    cubeOpacity.current =
      baseCubeOpacity * (1 - disabledT.current * (1 - DISABLED_OPACITY));

    // Label size — project cell dimensions from 3D to screen pixels.
    // backWallZ is in the room's local space; add worldZOffset to get world Z
    // so the perspective divide uses the correct camera-to-wall distance.
    if (htmlRef.current) {
      const halfCell = CELL_SIZE / 2;
      const wallWorldZ = worldZOffset + backWallZ;

      _labelV1.set(worldX - halfCell, worldY, wallWorldZ);
      _labelV1.project(camera);
      _labelV2.set(worldX + halfCell, worldY, wallWorldZ);
      _labelV2.project(camera);
      const x1 = ((_labelV1.x + 1) / 2) * size.width;
      const x2 = ((_labelV2.x + 1) / 2) * size.width;
      const projW = Math.abs(x2 - x1);
      if (projW > 10 && Math.abs(projW - lastLabelWidth.current) > 1) {
        htmlRef.current.style.maxWidth = `${projW}px`;
        if (hasPrice) htmlRef.current.style.width = `${projW}px`;
        lastLabelWidth.current = projW;
      }

      if (hasPrice) {
        _labelV1.set(worldX, worldY + halfCell, wallWorldZ);
        _labelV1.project(camera);
        _labelV2.set(worldX, worldY - halfCell, wallWorldZ);
        _labelV2.project(camera);
        const y1 = ((1 - _labelV1.y) / 2) * size.height;
        const y2 = ((1 - _labelV2.y) / 2) * size.height;
        const projH = Math.abs(y2 - y1);
        if (projH > 10 && Math.abs(projH - lastLabelHeight.current) > 1) {
          htmlRef.current.style.height = `${projH}px`;
          lastLabelHeight.current = projH;
        }
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

    // Image tint: warm sepia at rest → true color on hover/select
    if (imageRef.current && hasPrice) {
      const activeT = Math.max(hoverT.current, selectedT.current);
      const sepia = (1 - activeT) * 0.8;
      const saturate = 0.6 + activeT * 0.4;
      const brightness = 0.82 + activeT * 0.18;
      const filter = `sepia(${sepia.toFixed(3)}) saturate(${saturate.toFixed(3)}) brightness(${brightness.toFixed(3)})`;
      if (filter !== lastImageFilter.current) {
        imageRef.current.style.filter = filter;
        lastImageFilter.current = filter;
      }
    }
  });

  return (
    <>
      {/* Moving cube + label */}
      <group ref={cubeGroupRef} position={[worldX, worldY, restZ]}>
        <CellBody
          width={CELL_SIZE}
          height={CELL_SIZE}
          popT={popT}
          edgeTarget={edgeTarget}
          cubeOpacity={cubeOpacity}
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
        />

        {/* Label */}
        <Html
          position={[0, 0, CUBE_HALF + 0.08]}
          center
          zIndexRange={[1, 0]}
          style={{ pointerEvents: "none" }}
        >
          {hasPrice ? (
            <div ref={htmlRef} className={styles.prizeCard}>
              <div className={styles.prizeImageArea}>
                {(cell as ActionCell).imageSrc ? (
                  <img
                    ref={imageRef}
                    src={(cell as ActionCell).imageSrc}
                    alt={cell.label}
                    className={styles.prizeImage}
                  />
                ) : (
                  <div className={styles.prizePlaceholder} />
                )}
                <span className={styles.priceBadge}>
                  {(cell as ActionCell).price === 0
                    ? "FREE"
                    : `$${(cell as ActionCell).price}`}
                </span>
              </div>
              <div className={styles.prizeNameBar}>
                <span className={styles.prizeName}>{cell.label}</span>
              </div>
            </div>
          ) : (
            <div ref={htmlRef} className={styles.cellLabel}>
              {cell.label}
            </div>
          )}
        </Html>
      </group>

      {/* Physical tunnel behind the wall */}
      <CellTunnel
        worldX={worldX}
        worldY={worldY}
        width={CELL_SIZE}
        height={CELL_SIZE}
        backWallZ={backWallZ}
      />
    </>
  );
}
