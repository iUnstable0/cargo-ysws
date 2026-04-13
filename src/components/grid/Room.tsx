"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, useCallback } from "react";
import { CELL_SIZE } from "./constants";
import { easeInOutCubic, phaseProgress } from "./utils";
import { CameraController } from "./CameraController";
import { ParallaxGroup } from "./ParallaxGroup";
import { GridRoom } from "./GridRoom";
import { InteractiveCell } from "./InteractiveCell";
import { WidgetMount } from "./WidgetMount";
import { useNavigation } from "./navigation/context";
import { getPage } from "./pages";
import type { CellDef, NavCell, ActionCell } from "./types";

const DEFAULT_RUNNERS: Record<string, number> = {
  back: 8,
  left: 5,
  right: 5,
  top: 4,
  bottom: 4,
};

const ENTER_PROGRESS_SPEED = 0.9;
const EXIT_PROGRESS_SPEED = 1.2;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build CSG holes array from a page's cells (local coordinates). */
function cellsToHoles(
  cells: CellDef[],
): { id: string; centerX: number; centerY: number; size: number }[] {
  const holes: {
    id: string;
    centerX: number;
    centerY: number;
    size: number;
  }[] = [];
  for (const cell of cells) {
    if (cell.kind === "widget") {
      for (let i = 0; i < cell.span.length; i++) {
        holes.push({
          id: `${cell.id}-${i}`,
          centerX: cell.span[i].centerX,
          centerY: cell.span[i].centerY,
          size: CELL_SIZE,
        });
      }
    } else {
      holes.push({
        id: cell.id,
        centerX: cell.centerX,
        centerY: cell.centerY,
        size: CELL_SIZE,
      });
    }
  }
  return holes;
}

// ---------------------------------------------------------------------------
// Room component — World Stack model: rooms at fixed world positions
// ---------------------------------------------------------------------------

export function Room() {
  const {
    roomStack,
    depth,
    pushPage,
    completeForward,
    completePop,
    directionRef,
    progressRef,
  } = useNavigation();

  // Per-room parallax refs
  const parentParallaxRef = useRef(1);
  const settledParallaxRef = useRef(1);
  const cellHoveredRef = useRef(false);

  // Opacity refs
  const mainWidgetOpacityRef = useRef(1);
  const childContentOpacityRef = useRef(0);
  const cellProgressRef = useRef(0);

  // Track which cell was clicked (persists across the animation)
  const activeCellIdRef = useRef<string | null>(null);

  // ---------------------------------------------------------------------------
  // Determine which rooms to render
  // ---------------------------------------------------------------------------

  const isTransitioning =
    directionRef.current !== null && roomStack.length > 1;

  // Settled room = last in stack. Parent = second-to-last (only during transitions).
  const settledEntry = roomStack[roomStack.length - 1];
  const parentEntry =
    isTransitioning && roomStack.length > 1
      ? roomStack[roomStack.length - 2]
      : null;

  const settledBackWallZ = -settledEntry.page.room.depth / 2;
  const parentBackWallZ = parentEntry
    ? -parentEntry.page.room.depth / 2
    : 0;

  // ---------------------------------------------------------------------------
  // Animation loop
  // ---------------------------------------------------------------------------

  useFrame((_, delta) => {
    if (directionRef.current === "in") {
      progressRef.current = Math.min(
        1,
        progressRef.current + delta * ENTER_PROGRESS_SPEED,
      );
      if (progressRef.current >= 1) {
        progressRef.current = 0;
        activeCellIdRef.current = null;
        completeForward();
        return;
      }
    } else if (directionRef.current === "out") {
      progressRef.current = Math.max(
        0,
        progressRef.current - delta * EXIT_PROGRESS_SPEED,
      );
      if (progressRef.current <= 0.001) {
        progressRef.current = 0;
        activeCellIdRef.current = null;
        completePop();
        return;
      }
    }

    const p = progressRef.current;
    cellProgressRef.current = p;

    // Parent room parallax: fades 1 → 0 during transition
    parentParallaxRef.current = 1 - easeInOutCubic(Math.min(p / 0.4, 1));

    // Settled/child room parallax: 0.15 during transition, 1 when settled
    if (directionRef.current !== null) {
      settledParallaxRef.current = 0.15;
    } else {
      settledParallaxRef.current = 1;
    }

    // Child room widget visibility: fade in 0→1 during progress 0.55→0.8
    childContentOpacityRef.current = easeInOutCubic(
      phaseProgress(p, 0.55, 0.8),
    );

    // Main/parent room widget visibility: fade out during first 30%
    if (directionRef.current !== null) {
      mainWidgetOpacityRef.current = Math.max(
        0,
        1 - easeInOutCubic(Math.min(p / 0.3, 1)),
      );
    } else {
      mainWidgetOpacityRef.current = 1;
    }
  });

  // ---------------------------------------------------------------------------
  // Cell click handler
  // ---------------------------------------------------------------------------

  const handleCellClick = useCallback(
    (cell: NavCell | ActionCell) => {
      // Ignore clicks during transitions
      if (directionRef.current !== null) return;
      if (cell.kind === "nav") {
        const target = getPage(cell.target);
        if (!target) return;
        activeCellIdRef.current = cell.id;
        pushPage(cell.id, cell.target);
      } else if (cell.kind === "action") {
        if (cell.href) window.open(cell.href, "_blank");
        if (cell.onClick) cell.onClick();
      }
    },
    [pushPage, directionRef],
  );

  // ---------------------------------------------------------------------------
  // Render helper for a single room
  // ---------------------------------------------------------------------------

  const renderRoom = (
    entry: (typeof roomStack)[number],
    role: "parent" | "settled",
  ) => {
    const page = entry.page;
    const backWallZ = -page.room.depth / 2;
    const isParent = role === "parent";
    const parallaxRef = isParent ? parentParallaxRef : settledParallaxRef;
    // When settled (not transitioning), mainWidgetOpacityRef = 1 → fully visible.
    // During transition: parent fades out (mainWidgetOpacityRef), child fades in (childContentOpacityRef).
    const widgetOpacity = isParent
      ? mainWidgetOpacityRef
      : isTransitioning
        ? childContentOpacityRef
        : mainWidgetOpacityRef;

    return (
      <group
        key={`room-${page.id}-${role}`}
        position={[entry.worldX, entry.worldY, entry.worldZ]}
      >
        <ParallaxGroup
          progressRef={parallaxRef}
          cellHoveredRef={cellHoveredRef}
        >
          <GridRoom
            width={page.room.width}
            height={page.room.height}
            depth={page.room.depth}
            seed={page.seed}
            runnersPerWall={page.runnersPerWall ?? DEFAULT_RUNNERS}
            receiveShadow
            holes={cellsToHoles(page.cells)}
          >
            {page.cells.map((cell) => {
              if (cell.kind === "widget") {
                return (
                  <WidgetMount
                    key={cell.id}
                    cell={cell}
                    visibilityRef={widgetOpacity}
                    backWallZ={backWallZ}
                  />
                );
              }
              const isActive = activeCellIdRef.current === cell.id;
              return (
                <group key={cell.id}>
                  <InteractiveCell
                    cell={cell}
                    isActive={isActive}
                    isDisabled={false}
                    progressRef={cellProgressRef}
                    cellHoveredRef={cellHoveredRef}
                    onClick={() => handleCellClick(cell)}
                    backWallZ={backWallZ}
                    visibilityRef={
                      isParent
                        ? undefined
                        : isTransitioning
                          ? childContentOpacityRef
                          : undefined
                    }
                    selectedRef={page.selectedCellIdsRef}
                    hoverPop={page.hoverPop}
                  />
                </group>
              );
            })}
          </GridRoom>
        </ParallaxGroup>
      </group>
    );
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      <CameraController />

      {/* Parent room (only visible during transitions) */}
      {parentEntry && renderRoom(parentEntry, "parent")}

      {/* Settled room (always visible) */}
      {renderRoom(settledEntry, "settled")}
    </>
  );
}
