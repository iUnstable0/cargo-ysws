import * as THREE from "three";

// --- Room geometry ---
export const ROOM_W = 40;
export const ROOM_H = 28;
export const ROOM_D = 16;
export const ROOM_COLOR = "#B79F92";
export const GRID_STEP = 3;

export const GRID_COLOR = "#3a2418";
export const RUNNER_COLOR = "#9e7a5a";

export const SCENE_SEED = 0xf79a1689;

export const BACK_WALL_Z = -ROOM_D / 2;

// --- 3D cube constants ---
export const CELL_SIZE = GRID_STEP - 0.1;
export const CUBE_DEPTH = CELL_SIZE; // equal to width/height for a proper square prism
export const CUBE_HALF = CUBE_DEPTH / 2;
export const HOVER_POP = 1.2;
export const SINK_DEPTH = 4.5;
export const LIP_DEPTH = CUBE_DEPTH;

// --- Hidden room dimensions ---
export const HIDDEN_ROOM_W = 24;
export const HIDDEN_ROOM_H = 20;
export const HIDDEN_ROOM_D = 12;
export const HIDDEN_SCENE_SEED = SCENE_SEED + 1;

// --- Animation phase boundaries (within progress 0..1) ---
export const PHASE_SINK_END = 0.4;

// --- Type definitions ---
export interface WallDef {
  id: string;
  origin: THREE.Vector3;
  uDir: THREE.Vector3;
  vDir: THREE.Vector3;
  uLen: number;
  vLen: number;
  inset: THREE.Vector3;
}

export interface GridLine {
  start: THREE.Vector3;
  end: THREE.Vector3;
  opacity: number;
}

export interface RunnerData {
  points: THREE.Vector3[];
  totalLen: number;
  period: number;
  dashSize: number;
  speed: number;
  initialOffset: number;
}

export interface CellDef {
  id: string;
  label: string;
  centerX: number;
  centerY: number;
}

// --- Wall definitions ---
export const WALLS: WallDef[] = [
  {
    id: "back",
    origin: new THREE.Vector3(-ROOM_W / 2, -ROOM_H / 2, -ROOM_D / 2),
    uDir: new THREE.Vector3(1, 0, 0),
    vDir: new THREE.Vector3(0, 1, 0),
    uLen: ROOM_W,
    vLen: ROOM_H,
    inset: new THREE.Vector3(0, 0, 0.05),
  },
  {
    id: "left",
    origin: new THREE.Vector3(-ROOM_W / 2, -ROOM_H / 2, ROOM_D / 2),
    uDir: new THREE.Vector3(0, 0, -1),
    vDir: new THREE.Vector3(0, 1, 0),
    uLen: ROOM_D,
    vLen: ROOM_H,
    inset: new THREE.Vector3(0.05, 0, 0),
  },
  {
    id: "right",
    origin: new THREE.Vector3(ROOM_W / 2, -ROOM_H / 2, -ROOM_D / 2),
    uDir: new THREE.Vector3(0, 0, 1),
    vDir: new THREE.Vector3(0, 1, 0),
    uLen: ROOM_D,
    vLen: ROOM_H,
    inset: new THREE.Vector3(-0.05, 0, 0),
  },
  {
    id: "top",
    origin: new THREE.Vector3(-ROOM_W / 2, ROOM_H / 2, ROOM_D / 2),
    uDir: new THREE.Vector3(1, 0, 0),
    vDir: new THREE.Vector3(0, 0, -1),
    uLen: ROOM_W,
    vLen: ROOM_D,
    inset: new THREE.Vector3(0, -0.05, 0),
  },
  {
    id: "bottom",
    origin: new THREE.Vector3(-ROOM_W / 2, -ROOM_H / 2, -ROOM_D / 2),
    uDir: new THREE.Vector3(1, 0, 0),
    vDir: new THREE.Vector3(0, 0, 1),
    uLen: ROOM_W,
    vLen: ROOM_D,
    inset: new THREE.Vector3(0, 0.05, 0),
  },
];

export const RUNNERS_PER_WALL: Record<string, number> = {
  back: 8,
  left: 5,
  right: 5,
  top: 4,
  bottom: 4,
};

// --- Interactive cell definitions ---
export const INTERACTIVE_CELLS: CellDef[] = [
  { id: "readmore", label: "Read More", centerX: -3.5, centerY: -3.5 },
  { id: "join", label: "Join", centerX: 2.5, centerY: -3.5 },
];
