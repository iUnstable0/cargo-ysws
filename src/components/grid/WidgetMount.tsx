"use client";

import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useMemo, useRef } from "react";
import { BACK_WALL_Z, CELL_SIZE, ROOM_COLOR } from "./constants";
import type { WidgetCell } from "./types";

/**
 * Mounts a widget component (e.g. EmailInput) as an Html overlay
 * positioned over the holes the widget's span occupies on the back wall.
 *
 * Also renders a single opaque fill plane covering the entire span so
 * grid lines and runners are fully occluded between combined cells.
 */
export function WidgetMount({
  cell,
  visibilityRef,
  offsetX = 0,
  offsetY = 0,
  backWallZ = BACK_WALL_Z,
}: {
  cell: WidgetCell;
  visibilityRef: React.RefObject<number>;
  offsetX?: number;
  offsetY?: number;
  backWallZ?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<THREE.Group>(null);
  const lastW = useRef(0);
  const lastH = useRef(0);

  // Reusable vectors for projection (avoid GC)
  const _v1 = useMemo(() => new THREE.Vector3(), []);
  const _v2 = useMemo(() => new THREE.Vector3(), []);

  // Center of the span in world space
  const center = useMemo(() => {
    const xs = cell.span.map((s) => s.centerX);
    const ys = cell.span.map((s) => s.centerY);
    return {
      x: offsetX + xs.reduce((a, b) => a + b, 0) / xs.length,
      y: offsetY + ys.reduce((a, b) => a + b, 0) / ys.length,
    };
  }, [cell.span, offsetX, offsetY]);

  // Compute the world-space dimensions of the full span
  const spanSize = useMemo(() => {
    const xs = cell.span.map((s) => s.centerX);
    const ys = cell.span.map((s) => s.centerY);
    const cols = (Math.max(...xs) - Math.min(...xs)) / CELL_SIZE + 1;
    const rows = (Math.max(...ys) - Math.min(...ys)) / CELL_SIZE + 1;
    return {
      cols,
      rows,
      worldW: cols * CELL_SIZE,
      worldH: rows * CELL_SIZE,
    };
  }, [cell.span]);

  useFrame(({ camera, size }) => {
    if (!containerRef.current || !groupRef.current) return;

    // Opacity
    const o = visibilityRef.current ?? 0;
    containerRef.current.style.opacity = String(o);

    // Project span corners from local group space to screen pixels
    const halfW = spanSize.worldW / 2;
    const halfH = spanSize.worldH / 2;

    _v1.set(-halfW, halfH, 0.1);
    groupRef.current.localToWorld(_v1);
    _v1.project(camera);

    _v2.set(halfW, -halfH, 0.1);
    groupRef.current.localToWorld(_v2);
    _v2.project(camera);

    // Skip if behind camera
    if (_v1.z > 1 || _v2.z > 1) return;

    // Convert NDC [-1,1] to CSS pixels
    const x1 = ((_v1.x + 1) / 2) * size.width;
    const y1 = ((1 - _v1.y) / 2) * size.height;
    const x2 = ((_v2.x + 1) / 2) * size.width;
    const y2 = ((1 - _v2.y) / 2) * size.height;

    const projW = Math.abs(x2 - x1);
    const projH = Math.abs(y2 - y1);

    // Only write to DOM when changed meaningfully
    if (
      Math.abs(projW - lastW.current) > 0.5 ||
      Math.abs(projH - lastH.current) > 0.5
    ) {
      containerRef.current.style.width = `${projW}px`;
      containerRef.current.style.height = `${projH}px`;
      lastW.current = projW;
      lastH.current = projH;
    }
  });

  const Widget = cell.component;

  return (
    <group ref={groupRef} position={[center.x, center.y, backWallZ]}>
      {/* Single opaque fill plane — covers entire span, blocking grid lines and runners */}
      <mesh position={[0, 0, 0.06]}>
        <planeGeometry args={[spanSize.worldW, spanSize.worldH]} />
        <meshBasicMaterial
          color={ROOM_COLOR}
          depthWrite
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>

      {/* Html overlay — 2D screen-space mode (no transform), matching InteractiveCell approach */}
      <Html
        position={[0, 0, 0.1]}
        center
        zIndexRange={[10, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div
          ref={containerRef}
          style={{
            opacity: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <Widget visibilityRef={visibilityRef} />
        </div>
      </Html>
    </group>
  );
}

