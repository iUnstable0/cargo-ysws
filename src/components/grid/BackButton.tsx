"use client";

import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useRef } from "react";
import { BACK_WALL_Z, SINK_DEPTH } from "./constants";
import { useNavigation } from "./navigation/context";
import styles from "./grid.module.scss";

export function BackButton({
  opacityRef,
}: {
  opacityRef: React.RefObject<number>;
}) {
  const { doorwayCell, popPage } = useNavigation();
  const containerRef = useRef<HTMLDivElement>(null);

  useFrame(() => {
    if (containerRef.current) {
      const o = opacityRef.current ?? 0;
      containerRef.current.style.opacity = String(o);
      containerRef.current.style.pointerEvents = o > 0.5 ? "auto" : "none";
    }
  });

  if (!doorwayCell) return null;

  // Get center position for the doorway cell
  let cx: number, cy: number;
  if (doorwayCell.kind === "widget") {
    const xs = doorwayCell.span.map((s) => s.centerX);
    const ys = doorwayCell.span.map((s) => s.centerY);
    cx = xs.reduce((a, b) => a + b, 0) / xs.length;
    cy = ys.reduce((a, b) => a + b, 0) / ys.length;
  } else {
    cx = doorwayCell.centerX;
    cy = doorwayCell.centerY;
  }

  return (
    <Html
      position={[cx, cy, BACK_WALL_Z - SINK_DEPTH - 8]}
      center
      distanceFactor={22}
      zIndexRange={[6, 0]}
    >
      <div ref={containerRef} style={{ opacity: 0 }}>
        <button className={styles.backButton} onClick={popPage}>
          &larr; Back
        </button>
      </div>
    </Html>
  );
}
