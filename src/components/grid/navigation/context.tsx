"use client";

import {
  createContext,
  useContext,
  useCallback,
  useRef,
  useReducer,
  useEffect,
} from "react";
import type { ReactNode } from "react";
import type { NavState, NavSegment, PageDef, CellDef } from "../types";
import { getPage, getRootPage } from "../pages";

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
  /** Navigate forward — cell clicked, target page loading then entering */
  pushPage: (cellId: string, targetPageId: string) => void;
  /** Navigate back one level */
  popPage: () => void;
  /** Jump to a specific depth (for breadcrumbs) */
  navigateToDepth: (depth: number) => void;
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

  // Derive current/parent/doorway from the path
  const path = stateRef.current.path;
  const currentPage =
    path.length > 0
      ? (getPage(path[path.length - 1].pageId) ?? getRootPage())
      : getRootPage();

  const parentPage =
    path.length === 0
      ? null
      : path.length === 1
        ? getRootPage()
        : (getPage(path[path.length - 2].pageId) ?? null);

  const doorwayCell = (() => {
    if (path.length === 0) return null;
    const parent =
      path.length === 1
        ? getRootPage()
        : getPage(path[path.length - 2].pageId);
    if (!parent) return null;
    const seg = path[path.length - 1];
    return parent.cells.find((c) => c.id === seg.viaCellId) ?? null;
  })();

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
  }, []);

  const completePop = useCallback(() => {
    stateRef.current = {
      path: stateRef.current.path.slice(0, -1),
    };
    directionRef.current = null;
    progressRef.current = 0;
    forceUpdate();
    onDepthChange?.(stateRef.current.path.length);
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
    pushPage,
    popPage,
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
