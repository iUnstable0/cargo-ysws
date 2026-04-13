"use client";

import {
  createContext,
  useContext,
  useCallback,
  useRef,
  useReducer,
  useMemo,
  useEffect,
} from "react";
import type { ReactNode } from "react";
import type { NavState, NavSegment, PageDef, CellDef } from "../types";
import { getPage, getRootPage } from "../pages";
import { SINK_DEPTH } from "../constants";

// ---------------------------------------------------------------------------
// Room stack — cumulative world positions for each room in the nav path
// ---------------------------------------------------------------------------

export interface RoomStackEntry {
  page: PageDef;
  worldX: number;
  worldY: number;
  worldZ: number;
  /** The cell on the PARENT page that leads to this room (null for root) */
  doorwayCell: CellDef | null;
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

/** Build the room stack from the navigation path. Pure function. */
function computeRoomStack(path: NavSegment[]): RoomStackEntry[] {
  const root = getRootPage();
  const stack: RoomStackEntry[] = [
    { page: root, worldX: 0, worldY: 0, worldZ: 0, doorwayCell: null },
  ];

  for (const seg of path) {
    const parentEntry = stack[stack.length - 1];
    const childPage = getPage(seg.pageId);
    if (!childPage) break;

    const doorway = parentEntry.page.cells.find((c) => c.id === seg.viaCellId);
    if (!doorway) break;

    const doorCenter = getDoorwayCenter(doorway);
    const parentBackWallZ =
      parentEntry.worldZ - parentEntry.page.room.depth / 2;
    const childWorldZ =
      parentBackWallZ - SINK_DEPTH - 4 - childPage.room.depth / 2;

    stack.push({
      page: childPage,
      worldX: parentEntry.worldX + doorCenter.x,
      worldY: parentEntry.worldY + doorCenter.y,
      worldZ: childWorldZ,
      doorwayCell: doorway,
    });
  }

  return stack;
}

// ---------------------------------------------------------------------------
// Context value
// ---------------------------------------------------------------------------

export interface NavigationContextValue {
  /** Current navigation state */
  state: NavState;
  /** The current (deepest) page */
  currentPage: PageDef;
  /** Page one level up, or null at root */
  parentPage: PageDef | null;
  /** The cell on the parent page that leads here, or null at root */
  doorwayCell: CellDef | null;
  /** Room stack with world positions for each room */
  roomStack: RoomStackEntry[];
  /** Navigate forward — cell clicked, target page loading then entering */
  pushPage: (cellId: string, targetPageId: string) => void;
  /** Navigate back one level */
  popPage: () => void;
  /** Jump to a specific depth (for breadcrumbs) */
  navigateToDepth: (depth: number) => void;
  /** Called by Room when forward animation completes */
  completeForward: () => void;
  /** Called by Room when exit animation completes */
  completePop: () => void;
  /** Transition direction — drives useFrame animation */
  directionRef: React.RefObject<"in" | "out" | null>;
  /** Master transition progress 0..1 */
  progressRef: React.RefObject<number>;
  /** ID of the cell currently loading (null = idle) */
  loadingCellRef: React.RefObject<string | null>;
  /** Whether any cell is being loaded — for disabling siblings */
  isLoading: boolean;
  /** Depth of the navigation stack (0 = root) */
  depth: number;
  /** Callback to notify external DOM (page title overlay) of navigation changes */
  onDepthChange?: (depth: number) => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function useNavigation(): NavigationContextValue {
  const ctx = useContext(NavigationContext);
  if (!ctx)
    throw new Error("useNavigation must be used within NavigationProvider");
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function NavigationProvider({
  onDepthChange,
  popPageRef,
  children,
}: {
  onDepthChange?: (depth: number) => void;
  popPageRef?: React.MutableRefObject<(() => void) | null>;
  children: ReactNode;
}) {
  const stateRef = useRef<NavState>({ path: [] });
  const directionRef = useRef<"in" | "out" | null>(null);
  const progressRef = useRef(0);
  const loadingCellRef = useRef<string | null>(null);
  const [version, forceUpdate] = useReducer((x: number) => x + 1, 0);

  // Derive room stack + current/parent/doorway from the path
  const path = stateRef.current.path;

  // eslint-disable-next-line react-hooks/exhaustive-deps -- version drives recomputation
  const roomStack = useMemo(() => computeRoomStack(path), [version]);

  const currentPage = roomStack[roomStack.length - 1].page;

  const parentPage =
    roomStack.length > 1 ? roomStack[roomStack.length - 2].page : null;

  const doorwayCell = roomStack[roomStack.length - 1].doorwayCell;

  const pushPage = useCallback(
    (cellId: string, targetPageId: string) => {
      stateRef.current = {
        path: [
          ...stateRef.current.path,
          { pageId: targetPageId, viaCellId: cellId },
        ],
      };
      directionRef.current = "in";
      progressRef.current = 0;
      loadingCellRef.current = null;
      forceUpdate();
      onDepthChange?.(stateRef.current.path.length);
    },
    [onDepthChange],
  );

  const popPage = useCallback(() => {
    directionRef.current = "out";
    progressRef.current = 1;
    forceUpdate();
  }, []);

  const completeForward = useCallback(() => {
    directionRef.current = null;
    progressRef.current = 0;
    forceUpdate();
  }, []);

  const completePop = useCallback(() => {
    const newPath = stateRef.current.path.slice(0, -1);
    stateRef.current = { path: newPath };
    directionRef.current = null;
    progressRef.current = 0;
    forceUpdate();
    onDepthChange?.(newPath.length);
  }, [onDepthChange]);

  const navigateToDepth = useCallback(
    (depth: number) => {
      stateRef.current = {
        path: stateRef.current.path.slice(0, depth),
      };
      directionRef.current = null;
      progressRef.current = 0;
      forceUpdate();
      onDepthChange?.(depth);
    },
    [onDepthChange],
  );

  // Bridge popPage out of the Canvas for the DOM back button
  useEffect(() => {
    if (popPageRef) popPageRef.current = popPage;
    return () => {
      if (popPageRef) popPageRef.current = null;
    };
  }, [popPage, popPageRef]);

  const value: NavigationContextValue = {
    state: stateRef.current,
    currentPage,
    parentPage,
    doorwayCell,
    roomStack,
    pushPage,
    popPage,
    completeForward,
    completePop,
    navigateToDepth,
    directionRef,
    progressRef,
    loadingCellRef,
    isLoading: loadingCellRef.current !== null,
    depth: path.length,
    onDepthChange,
  };

  // suppress unused variable warning — version drives re-renders
  void version;

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}
