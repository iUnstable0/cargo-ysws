import * as THREE from "three";
import type { WallDef, GridLine, RunnerData } from "./constants";
import { GRID_STEP } from "./constants";

// --- Seeded RNG (mulberry32) — stable layout across hot reload ---
export function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Ease function ---
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// --- Phase progress helper ---
export function phaseProgress(p: number, start: number, end: number): number {
  if (p <= start) return 0;
  if (p >= end) return 1;
  return (p - start) / (end - start);
}

// --- Grid generation helpers ---
export function wallPoint(
  wall: WallDef,
  u: number,
  v: number,
): THREE.Vector3 {
  return wall.origin
    .clone()
    .addScaledVector(wall.uDir, u)
    .addScaledVector(wall.vDir, v)
    .add(wall.inset);
}

function totalLineDistance(points: THREE.Vector3[]): number {
  let sum = 0;
  for (let i = 1; i < points.length; i++) {
    sum += points[i].distanceTo(points[i - 1]);
  }
  return sum;
}

export function generateBackWallGrid(wall: WallDef): GridLine[] {
  const lines: GridLine[] = [];
  const centerU = wall.uLen / 2;
  const centerV = wall.vLen / 2;
  const maxDist = Math.max(centerU, centerV);

  for (let v = GRID_STEP; v < wall.vLen; v += GRID_STEP) {
    const perpDist = Math.abs(v - centerV);
    const norm = Math.min(perpDist / maxDist, 1);
    lines.push({
      start: wallPoint(wall, 0, v),
      end: wallPoint(wall, wall.uLen, v),
      opacity: THREE.MathUtils.lerp(0.12, 0.55, norm),
    });
  }

  for (let u = GRID_STEP; u < wall.uLen; u += GRID_STEP) {
    const perpDist = Math.abs(u - centerU);
    const norm = Math.min(perpDist / maxDist, 1);
    lines.push({
      start: wallPoint(wall, u, 0),
      end: wallPoint(wall, u, wall.vLen),
      opacity: THREE.MathUtils.lerp(0.12, 0.55, norm),
    });
  }

  return lines;
}

export function generateOtherWallsGrid(walls: WallDef[]): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  for (const wall of walls) {
    for (let v = GRID_STEP; v < wall.vLen; v += GRID_STEP) {
      points.push(wallPoint(wall, 0, v));
      points.push(wallPoint(wall, wall.uLen, v));
    }
    for (let u = GRID_STEP; u < wall.uLen; u += GRID_STEP) {
      points.push(wallPoint(wall, u, 0));
      points.push(wallPoint(wall, u, wall.vLen));
    }
  }
  return points;
}

// --- Runner path generation (random walk on grid) ---
const DIRS: [number, number][] = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];

export function generateRunnerPath(
  wall: WallDef,
  rng: () => number,
): RunnerData | null {
  const uCells = Math.floor(wall.uLen / GRID_STEP);
  const vCells = Math.floor(wall.vLen / GRID_STEP);

  let gu = 1 + Math.floor(rng() * Math.max(1, uCells - 1));
  let gv = 1 + Math.floor(rng() * Math.max(1, vCells - 1));

  let dirIdx = Math.floor(rng() * 4);

  const gridPath: [number, number][] = [[gu, gv]];
  const segments = 6 + Math.floor(rng() * 7);

  for (let seg = 0; seg < segments; seg++) {
    const steps = 1 + Math.floor(rng() * 3);
    const [du, dv] = DIRS[dirIdx];

    for (let s = 0; s < steps; s++) {
      const nu = gu + du;
      const nv = gv + dv;
      if (nu < 0 || nu > uCells || nv < 0 || nv > vCells) break;
      gu = nu;
      gv = nv;
      gridPath.push([gu, gv]);
    }

    if (rng() < 0.5) {
      dirIdx = (dirIdx + 1) % 4;
    } else {
      dirIdx = (dirIdx + 3) % 4;
    }
  }

  const deduped: [number, number][] = [];
  for (const p of gridPath) {
    const last = deduped[deduped.length - 1];
    if (!last || last[0] !== p[0] || last[1] !== p[1]) deduped.push(p);
  }

  if (deduped.length < 4) return null;

  const points = deduped.map(([u, v]) =>
    wallPoint(wall, u * GRID_STEP, v * GRID_STEP),
  );
  const totalLen = totalLineDistance(points);
  if (totalLen < 8) return null;

  const dashSize = 4.0 + rng() * 4.0;
  const period = dashSize + totalLen;

  return {
    points,
    totalLen,
    period,
    dashSize,
    speed: 4.0 + rng() * 4.0,
    initialOffset: -rng() * period,
  };
}

// --- Full scene generation ---
export function generateScene(
  walls: WallDef[],
  runnersPerWall: Record<string, number>,
  seed: number,
) {
  const rng = mulberry32(seed);

  const backWallGrid = generateBackWallGrid(walls[0]);
  const otherWallsGrid = generateOtherWallsGrid(walls.slice(1));

  const runners: RunnerData[] = [];
  for (const wall of walls) {
    const target = runnersPerWall[wall.id] ?? 5;
    let count = 0;
    let attempts = 0;
    while (count < target && attempts < target * 15) {
      attempts++;
      const runner = generateRunnerPath(wall, rng);
      if (runner) {
        runners.push(runner);
        count++;
      }
    }
  }

  return { backWallGrid, otherWallsGrid, runners };
}

// --- Build wall definitions for any room ---
export function buildWalls(
  width: number,
  height: number,
  depth: number,
  cx: number,
  cy: number,
  cz: number,
): WallDef[] {
  return [
    {
      id: "back",
      origin: new THREE.Vector3(cx - width / 2, cy - height / 2, cz - depth / 2),
      uDir: new THREE.Vector3(1, 0, 0),
      vDir: new THREE.Vector3(0, 1, 0),
      uLen: width,
      vLen: height,
      inset: new THREE.Vector3(0, 0, 0.05),
    },
    {
      id: "left",
      origin: new THREE.Vector3(cx - width / 2, cy - height / 2, cz + depth / 2),
      uDir: new THREE.Vector3(0, 0, -1),
      vDir: new THREE.Vector3(0, 1, 0),
      uLen: depth,
      vLen: height,
      inset: new THREE.Vector3(0.05, 0, 0),
    },
    {
      id: "right",
      origin: new THREE.Vector3(cx + width / 2, cy - height / 2, cz - depth / 2),
      uDir: new THREE.Vector3(0, 0, 1),
      vDir: new THREE.Vector3(0, 1, 0),
      uLen: depth,
      vLen: height,
      inset: new THREE.Vector3(-0.05, 0, 0),
    },
    {
      id: "top",
      origin: new THREE.Vector3(cx - width / 2, cy + height / 2, cz + depth / 2),
      uDir: new THREE.Vector3(1, 0, 0),
      vDir: new THREE.Vector3(0, 0, -1),
      uLen: width,
      vLen: depth,
      inset: new THREE.Vector3(0, -0.05, 0),
    },
    {
      id: "bottom",
      origin: new THREE.Vector3(cx - width / 2, cy - height / 2, cz - depth / 2),
      uDir: new THREE.Vector3(1, 0, 0),
      vDir: new THREE.Vector3(0, 0, 1),
      uLen: width,
      vLen: depth,
      inset: new THREE.Vector3(0, 0.05, 0),
    },
  ];
}
