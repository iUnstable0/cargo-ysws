"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, useCallback, useState } from "react";
import { BACK_WALL_Z, SINK_DEPTH, CELL_SIZE } from "./constants";
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

/** Build CSG holes array from a page's cells. Coordinates are in the cell's own space. */
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
// Selection runner — renders CellLoadingRunner when cell is in selectedRef
// ---------------------------------------------------------------------------

function SelectionRunner({
  cellId,
  centerX,
  centerY,
  selectedRef,
  backWallZ,
}: {
  cellId: string;
  centerX: number;
  centerY: number;
  selectedRef: { current: Set<string> };
  backWallZ?: number;
}) {
  const [visible, setVisible] = useState(false);

  useFrame(() => {
    const isSelected = selectedRef.current.has(cellId);
    if (isSelected !== visible) setVisible(isSelected);
  });

  if (!visible) return null;
  return (
    <CellLoadingRunner
      centerX={centerX}
      centerY={centerY}
      backWallZ={backWallZ}
    />
  );
}

// ---------------------------------------------------------------------------
// Room component
// ---------------------------------------------------------------------------

export function Room() {
  const {
    currentPage,
    doorwayCell,
    depth,
    pushPage,
    completePop,
    directionRef,
    progressRef,
    loadingCellRef,
  } = useNavigation();

  const parallaxRef = useRef(1);
  const cellHoveredRef = useRef(false);
  const contentOpacityRef = useRef(0);
  const cellProgressRef = useRef(0);
  const hiddenParallaxRef = useRef(0.15);

  // Track which cell was clicked (persists across the animation)
  const activeCellIdRef = useRef<string | null>(null);

  useFrame((_, delta) => {
    if (directionRef.current === "in") {
      progressRef.current = Math.min(
        1,
        progressRef.current + delta * ENTER_PROGRESS_SPEED,
      );
      if (progressRef.current >= 1) directionRef.current = null;
    } else if (directionRef.current === "out") {
      progressRef.current = Math.max(
        0,
        progressRef.current - delta * EXIT_PROGRESS_SPEED,
      );
      if (progressRef.current <= 0.001) {
        progressRef.current = 0;
        directionRef.current = null;
        activeCellIdRef.current = null;
        completePop();
      }
    }

    const p = progressRef.current;
    parallaxRef.current = 1 - easeInOutCubic(Math.min(p / 0.4, 1));
    contentOpacityRef.current = easeInOutCubic(phaseProgress(p, 0.55, 0.8));
    cellProgressRef.current = p;
  });

  const handleCellClick = useCallback(
    (cell: NavCell | ActionCell) => {
      if (cell.kind === "nav") {
        const target = getPage(cell.target);
        if (!target) return;
        // Flash loading state then navigate
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

  // --- Main room (always root for now) ---
  const mainPage = getRootPage();
  const mainHoles = cellsToHoles(mainPage.cells);

  // --- Child room (visible when depth > 0) ---
  const childPage = depth > 0 ? currentPage : null;
  const doorway = doorwayCell ? getDoorwayCenter(doorwayCell) : null;
  const doorwayX = doorway?.x ?? 0;
  const doorwayY = doorway?.y ?? 0;
  const hiddenCenterZ =
    childPage && doorway
      ? BACK_WALL_Z - SINK_DEPTH - 4 - childPage.room.depth / 2
      : 0;
  const childBackWallZ =
    childPage && doorway
      ? hiddenCenterZ - childPage.room.depth / 2
      : BACK_WALL_Z;

  // Which main-room cell is the active doorway?
  const activeCellId =
    depth > 0 && doorwayCell ? doorwayCell.id : activeCellIdRef.current;

  return (
    <>
      <CameraController />

      <ParallaxGroup progressRef={parallaxRef} cellHoveredRef={cellHoveredRef}>
        {/* Main room */}
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
                  visibilityRef={contentOpacityRef}
                />
              );
            }
            const isActive = activeCellId === cell.id;
            const isLoadingThis = loadingCellRef.current === cell.id;
            const isDisabled =
              loadingCellRef.current !== null && !isLoadingThis;
            return (
              <group key={cell.id}>
                <InteractiveCell
                  cell={cell}
                  isActive={isActive}
                  isDisabled={isDisabled}
                  progressRef={cellProgressRef}
                  cellHoveredRef={cellHoveredRef}
                  onClick={() => handleCellClick(cell)}
                />
                {isLoadingThis && (
                  <CellLoadingRunner
                    centerX={cell.centerX}
                    centerY={cell.centerY}
                  />
                )}
              </group>
            );
          })}
        </GridRoom>
      </ParallaxGroup>

      {/* Child page room (behind the doorway) */}
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
                    visibilityRef={contentOpacityRef}
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
                    visibilityRef={contentOpacityRef}
                    selectedRef={childPage.selectedCellIdsRef}
                    hoverPop={childPage.hoverPop}
                  />
                  {childPage.selectedCellIdsRef && (
                    <SelectionRunner
                      cellId={cell.id}
                      centerX={doorwayX + cell.centerX}
                      centerY={doorwayY + cell.centerY}
                      selectedRef={childPage.selectedCellIdsRef}
                      backWallZ={childBackWallZ}
                    />
                  )}
                </group>
              );
            })}
          </GridRoom>
        )}
      </ParallaxGroup>
    </>
  );
}
