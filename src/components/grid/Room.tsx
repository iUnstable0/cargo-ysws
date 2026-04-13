"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, useCallback } from "react";
import { SINK_DEPTH, CELL_SIZE } from "./constants";
import { easeInOutCubic, phaseProgress } from "./utils";
import { CameraController } from "./CameraController";
import { ParallaxGroup } from "./ParallaxGroup";
import { GridRoom } from "./GridRoom";
import { InteractiveCell } from "./InteractiveCell";
import { WidgetMount } from "./WidgetMount";
import { CellLoadingRunner } from "./CellLoadingRunner";
import { useNavigation } from "./navigation/context";
import { getPage, getRootPage } from "./pages";
import type { CellDef, NavCell, ActionCell } from "./types";

const DEFAULT_RUNNERS: Record<string, number> = {
  back: 8,
  left: 5,
  right: 5,
  top: 4,
  bottom: 4,
};

const NO_RUNNERS: Record<string, number> = {
  back: 0,
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
};

const ENTER_PROGRESS_SPEED = 0.9;
const EXIT_PROGRESS_SPEED = 1.2;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build CSG holes array from a page's cells. */
function cellsToHoles(
  cells: CellDef[],
  offsetX = 0,
  offsetY = 0,
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
          centerX: offsetX + cell.span[i].centerX,
          centerY: offsetY + cell.span[i].centerY,
          size: CELL_SIZE,
        });
      }
    } else {
      holes.push({
        id: cell.id,
        centerX: offsetX + cell.centerX,
        centerY: offsetY + cell.centerY,
        size: CELL_SIZE,
      });
    }
  }
  return holes;
}

/** Get the center of a doorway cell (handles widgets with span). */
function getDoorwayCenter(cell: CellDef): { x: number; y: number } {
  if (cell.kind === "widget") {
    const xs = cell.span.map((s) => s.centerX);
    const ys = cell.span.map((s) => s.centerY);
    return {
      x: xs.reduce((a, b) => a + b, 0) / xs.length,
      y: ys.reduce((a, b) => a + b, 0) / ys.length,
    };
  }
  return { x: cell.centerX, y: cell.centerY };
}

// ---------------------------------------------------------------------------
// Room component — settle-teleport model for infinite nesting
// ---------------------------------------------------------------------------

export function Room() {
  const {
    currentPage,
    parentPage,
    doorwayCell,
    depth,
    pushPage,
    completeForward,
    completePop,
    directionRef,
    progressRef,
    loadingCellRef,
  } = useNavigation();

  const parallaxRef = useRef(1);
  const cellHoveredRef = useRef(false);
  const mainWidgetOpacityRef = useRef(1);
  const childContentOpacityRef = useRef(0);
  const cellProgressRef = useRef(0);
  const hiddenParallaxRef = useRef(0.15);

  // Track which cell was clicked (persists across the animation)
  const activeCellIdRef = useRef<string | null>(null);

  // ---------------------------------------------------------------------------
  // Direction-aware room selection
  // ---------------------------------------------------------------------------
  // Transitioning: parent at origin, current behind back wall
  // Settled: current at origin, no child
  const isTransitioning = directionRef.current !== null && depth > 0;

  const mainPage = isTransitioning
    ? (parentPage ?? getRootPage())
    : depth > 0
      ? currentPage
      : getRootPage();

  const childPage = isTransitioning ? currentPage : null;

  const doorway =
    isTransitioning && doorwayCell ? getDoorwayCenter(doorwayCell) : null;
  const doorwayX = doorway?.x ?? 0;
  const doorwayY = doorway?.y ?? 0;

  // Dynamic geometry based on the actual main room
  const mainBackWallZ = -mainPage.room.depth / 2;

  const hiddenCenterZ =
    childPage && doorway
      ? mainBackWallZ - SINK_DEPTH - 4 - childPage.room.depth / 2
      : 0;
  const childBackWallZ =
    childPage && doorway
      ? hiddenCenterZ - childPage.room.depth / 2
      : mainBackWallZ;

  // Which main-room cell is the active doorway?
  const activeCellId =
    isTransitioning && doorwayCell
      ? doorwayCell.id
      : activeCellIdRef.current;

  // Holes for the main room's back wall
  const mainHoles = cellsToHoles(mainPage.cells);

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
        // Forward teleport: child becomes the settled room
        progressRef.current = 0;
        activeCellIdRef.current = null;
        completeForward();
        return; // Skip ref updates — next frame will run with settled state
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
    parallaxRef.current = 1 - easeInOutCubic(Math.min(p / 0.4, 1));
    childContentOpacityRef.current = easeInOutCubic(
      phaseProgress(p, 0.55, 0.8),
    );
    cellProgressRef.current = p;

    // Main room widget visibility:
    // When settled (p=0, no direction): fully visible
    // When transitioning in: fade out during first 30% of progress
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
      if (cell.kind === "nav") {
        const target = getPage(cell.target);
        if (!target) return;
        loadingCellRef.current = cell.id;
        activeCellIdRef.current = cell.id;
        queueMicrotask(() => {
          loadingCellRef.current = null;
          pushPage(cell.id, cell.target);
        });
      } else if (cell.kind === "action") {
        if (cell.href) window.open(cell.href, "_blank");
        if (cell.onClick) cell.onClick();
      }
    },
    [pushPage, loadingCellRef],
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // Cells in the main room are interactive only when settled (not transitioning)
  const mainCellsDisabled = isTransitioning;

  return (
    <>
      <CameraController />

      {/* Main room (at origin) */}
      <ParallaxGroup progressRef={parallaxRef} cellHoveredRef={cellHoveredRef}>
        <GridRoom
          width={mainPage.room.width}
          height={mainPage.room.height}
          depth={mainPage.room.depth}
          seed={mainPage.seed}
          runnersPerWall={mainPage.runnersPerWall ?? DEFAULT_RUNNERS}
          receiveShadow
          holes={mainHoles}
        >
          {mainPage.cells.map((cell) => {
            if (cell.kind === "widget") {
              return (
                <WidgetMount
                  key={cell.id}
                  cell={cell}
                  visibilityRef={mainWidgetOpacityRef}
                  backWallZ={mainBackWallZ}
                />
              );
            }
            const isActive = activeCellId === cell.id;
            const isLoadingThis = loadingCellRef.current === cell.id;
            const isDisabled =
              mainCellsDisabled ||
              (loadingCellRef.current !== null && !isLoadingThis);
            return (
              <group key={cell.id}>
                <InteractiveCell
                  cell={cell}
                  isActive={isActive}
                  isDisabled={isDisabled}
                  progressRef={cellProgressRef}
                  cellHoveredRef={cellHoveredRef}
                  onClick={() => handleCellClick(cell)}
                  backWallZ={mainBackWallZ}
                />
                {isLoadingThis && (
                  <CellLoadingRunner
                    centerX={cell.centerX}
                    centerY={cell.centerY}
                    backWallZ={mainBackWallZ}
                  />
                )}
              </group>
            );
          })}
        </GridRoom>
      </ParallaxGroup>

      {/* Child room (behind the main room's back wall, only during transitions) */}
      <ParallaxGroup
        progressRef={hiddenParallaxRef}
        cellHoveredRef={cellHoveredRef}
      >
        {childPage && doorway && (
          <GridRoom
            width={childPage.room.width}
            height={childPage.room.height}
            depth={childPage.room.depth}
            centerX={doorwayX}
            centerY={doorwayY}
            centerZ={hiddenCenterZ}
            seed={childPage.seed}
            receiveShadow
            runnersPerWall={NO_RUNNERS}
            holes={cellsToHoles(childPage.cells, doorwayX, doorwayY)}
          >
            {childPage.cells.map((cell) => {
              if (cell.kind === "widget") {
                return (
                  <WidgetMount
                    key={cell.id}
                    cell={cell}
                    visibilityRef={childContentOpacityRef}
                    offsetX={doorwayX}
                    offsetY={doorwayY}
                    backWallZ={childBackWallZ}
                  />
                );
              }
              return (
                <group key={cell.id}>
                  <InteractiveCell
                    cell={cell}
                    isActive={false}
                    isDisabled={false}
                    progressRef={cellProgressRef}
                    cellHoveredRef={cellHoveredRef}
                    onClick={() => handleCellClick(cell)}
                    offsetX={doorwayX}
                    offsetY={doorwayY}
                    backWallZ={childBackWallZ}
                    visibilityRef={childContentOpacityRef}
                    selectedRef={childPage.selectedCellIdsRef}
                    hoverPop={childPage.hoverPop}
                  />
                </group>
              );
            })}
          </GridRoom>
        )}
      </ParallaxGroup>
    </>
  );
}
