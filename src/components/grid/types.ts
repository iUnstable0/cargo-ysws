import type { ComponentType } from "react";

// ---------------------------------------------------------------------------
// Cell types — discriminated union on `kind`
// ---------------------------------------------------------------------------

interface BaseCell {
  id: string;
  label: string;
  centerX: number;
  centerY: number;
}

/** Navigates to a child page when clicked */
export interface NavCell extends BaseCell {
  kind: "nav";
  /** Target page ID in the registry */
  target: string;
}

/** Triggers an action — external link, form submit, etc. */
export interface ActionCell extends BaseCell {
  kind: "action";
  href?: string;
  onClick?: () => void;
  /** Price displayed in top-right badge (green text) — enables card layout */
  price?: number;
  /** Image source for card layout (placeholder shown if absent) */
  imageSrc?: string;
}

/** Props passed to every widget component */
export interface WidgetProps {
  visibilityRef: React.RefObject<number>;
}

/** Renders a custom component spanning one or more grid positions */
export interface WidgetCell {
  kind: "widget";
  id: string;
  /** Grid positions this widget occupies (holes punched in the back wall) */
  span: { centerX: number; centerY: number }[];
  component: ComponentType<WidgetProps>;
  /** When current is true, the cell plays a subtle pop-out animation */
  popRef?: { current: boolean };
}

export type CellDef = NavCell | ActionCell | WidgetCell;

// ---------------------------------------------------------------------------
// Page definition
// ---------------------------------------------------------------------------

export interface RoomDimensions {
  width: number;
  height: number;
  depth: number;
}

export interface PageDef {
  id: string;
  /** Human-readable label for breadcrumbs / menu */
  label: string;
  room: RoomDimensions;
  cells: CellDef[];
  /** RNG seed for deterministic grid pattern generation */
  seed: number;
  runnersPerWall?: Record<string, number>;
  /** Ref to set of currently selected cell IDs (for toggle-style cells) */
  selectedCellIdsRef?: { current: Set<string> };
  /** Override hover pop distance for interactive cells in this page */
  hoverPop?: number;
}

// ---------------------------------------------------------------------------
// Navigation state
// ---------------------------------------------------------------------------

/** One segment of the navigation path */
export interface NavSegment {
  pageId: string;
  /** The cell ID on the *parent* page that was clicked to reach this page */
  viaCellId: string;
}

/** Full navigation state — a stack from root to current page */
export interface NavState {
  path: NavSegment[];
}
