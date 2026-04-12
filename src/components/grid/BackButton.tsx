"use client";

import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useRef } from "react";
import { BACK_WALL_Z, SINK_DEPTH, INTERACTIVE_CELLS } from "./constants";
import styles from "./grid.module.scss";

export function BackButton({
  cellId,
  onBack,
  opacityRef,
}: {
  cellId: string;
  onBack: () => void;
  opacityRef: React.RefObject<number>;
}) {
  const cell = INTERACTIVE_CELLS.find((c) => c.id === cellId);
  const containerRef = useRef<HTMLDivElement>(null);

  useFrame(() => {
    if (containerRef.current) {
      const o = opacityRef.current ?? 0;
      containerRef.current.style.opacity = String(o);
      containerRef.current.style.pointerEvents = o > 0.5 ? "auto" : "none";
    }
  });

  if (!cell) return null;

  return (
    <Html
      position={[cell.centerX, cell.centerY, BACK_WALL_Z - SINK_DEPTH - 8]}
      center
      distanceFactor={22}
      zIndexRange={[6, 0]}
    >
      <div ref={containerRef} style={{ opacity: 0 }}>
        <button className={styles.backButton} onClick={onBack}>
          ← Back
        </button>
      </div>
    </Html>
  );
}
