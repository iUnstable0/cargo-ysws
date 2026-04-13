"use client";

import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
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

  useFrame(() => {
    if (containerRef.current) {
      const o = visibilityRef.current ?? 0;
      containerRef.current.style.opacity = String(o);
    }
  });

  const Widget = cell.component;

  return (
    <>
      {/* Single opaque fill plane — covers entire span, blocking grid lines and runners */}
      <mesh position={[center.x, center.y, backWallZ + 0.06]}>
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
        position={[center.x, center.y, backWallZ + 0.1]}
        center
        zIndexRange={[10, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div
          ref={containerRef}
          style={{
            opacity: 0,
            width: `max(280px, ${spanSize.cols * 16}vw)`,
            height: `max(140px, ${spanSize.rows * 16}vw)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <Widget visibilityRef={visibilityRef} />
        </div>
      </Html>
    </>
  );
}

