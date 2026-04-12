"use client";

import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useRef, useCallback } from "react";
import {
  ROOM_W,
  ROOM_H,
  ROOM_D,
  SCENE_SEED,
  RUNNERS_PER_WALL,
  HIDDEN_ROOM_W,
  HIDDEN_ROOM_H,
  HIDDEN_ROOM_D,
  HIDDEN_SCENE_SEED,
  BACK_WALL_Z,
  SINK_DEPTH,
  INTERACTIVE_CELLS,
  CELL_SIZE,
} from "./constants";
import { easeInOutCubic, phaseProgress } from "./utils";
import { CameraController } from "./CameraController";
import { ParallaxGroup } from "./ParallaxGroup";
import { GridRoom } from "./GridRoom";
import { InteractiveCell } from "./InteractiveCell";
import { BackButton } from "./BackButton";

const HIDDEN_RUNNERS: Record<string, number> = {
  back: 6,
  left: 3,
  right: 3,
  top: 3,
  bottom: 3,
};

export function Room({
  activeCell,
  onCellChange,
}: {
  activeCell: string | null;
  onCellChange: (id: string | null) => void;
}) {
  const progressRef = useRef(0);
  const directionRef = useRef<"in" | "out" | null>(null);

  const parallaxRef = useRef(1);
  const cellHoveredRef = useRef(false);
  const contentOpacityRef = useRef(0);
  const cellProgressRef = useRef(0);

  useFrame((_, delta) => {
    if (directionRef.current === "in") {
      progressRef.current = Math.min(1, progressRef.current + delta * 0.55);
      if (progressRef.current >= 1) directionRef.current = null;
    } else if (directionRef.current === "out") {
      progressRef.current = Math.max(0, progressRef.current - delta * 0.8);
      if (progressRef.current <= 0.001) {
        progressRef.current = 0;
        directionRef.current = null;
        onCellChange(null);
      }
    }

    const p = progressRef.current;
    parallaxRef.current = 1 - easeInOutCubic(Math.min(p / 0.4, 1));
    contentOpacityRef.current = easeInOutCubic(phaseProgress(p, 0.55, 0.8));
    cellProgressRef.current = p;
  });

  const handleCellClick = useCallback(
    (id: string) => {
      onCellChange(id);
      directionRef.current = "in";
    },
    [onCellChange],
  );

  const handleBack = useCallback(() => {
    directionRef.current = "out";
  }, []);

  const activeCellDef = activeCell
    ? INTERACTIVE_CELLS.find((c) => c.id === activeCell)
    : null;

  // Hidden room center Z: behind back wall, past sink depth + gap
  const hiddenCenterZ = activeCellDef
    ? BACK_WALL_Z - SINK_DEPTH - 4 - HIDDEN_ROOM_D / 2
    : 0;

  return (
    <>
      <CameraController activeCell={activeCell} progressRef={progressRef} />

      <ParallaxGroup progressRef={parallaxRef} cellHoveredRef={cellHoveredRef}>
        {/* Main room */}
        <GridRoom
          width={ROOM_W}
          height={ROOM_H}
          depth={ROOM_D}
          seed={SCENE_SEED}
          runnersPerWall={RUNNERS_PER_WALL}
          receiveShadow
          holes={INTERACTIVE_CELLS.map((c) => ({
            id: c.id,
            centerX: c.centerX,
            centerY: c.centerY,
            size: CELL_SIZE,
          }))}
        >
          {/* Interactive cells */}
          {INTERACTIVE_CELLS.map((cell) => (
            <InteractiveCell
              key={cell.id}
              cell={cell}
              isActive={activeCell === cell.id}
              progressRef={cellProgressRef}
              cellHoveredRef={cellHoveredRef}
              onClick={() => handleCellClick(cell.id)}
            />
          ))}
        </GridRoom>
      </ParallaxGroup>

      {/* Hidden layer — gracefully detached permanently powered parallax */}
      <ParallaxGroup
        progressRef={{ current: 1 } as any}
        cellHoveredRef={cellHoveredRef}
      >
        {activeCell && activeCellDef && (
          <GridRoom
            width={HIDDEN_ROOM_W}
            height={HIDDEN_ROOM_H}
            depth={HIDDEN_ROOM_D}
            centerX={activeCellDef.centerX}
            centerY={activeCellDef.centerY}
            centerZ={hiddenCenterZ}
            seed={HIDDEN_SCENE_SEED}
            runnersPerWall={HIDDEN_RUNNERS}
          >
            <BackButton
              cellId={activeCell}
              onBack={handleBack}
              opacityRef={contentOpacityRef}
            />
          </GridRoom>
        )}
      </ParallaxGroup>
    </>
  );
}
