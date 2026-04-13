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
export function wallPoint(wall: WallDef, u: number, v: number): THREE.Vector3 {
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

function getSymmetricGridPoints(length: number, step: number): number[] {
  const points: number[] = [];
  const center = length / 2;
  // When the number of whole cells is even, place grid lines at integer
  // multiples of step from center (0, ±step, ±2*step …). This aligns with
  // cells whose centers sit at half-step offsets (e.g. ±1.5).
  // When odd (original behaviour), lines sit at half-step offsets
  // ((k+0.5)*step) and align with cells at integer positions (0, ±3, …).
  const even = Math.floor(length / step) % 2 === 0;
  const offset = even ? 0 : 0.5;
  // Right from center
  for (let k = 0; ; k++) {
    const pt = center + (k + offset) * step;
    if (pt >= length || pt <= 0) break;
    points.push(pt);
  }
  // Left from center
  for (let k = even ? 1 : 0; ; k++) {
    const pt = center - (k + offset) * step;
    if (pt <= 0) break;
    points.push(pt);
  }
  return points;
}

export function generateBackWallGrid(wall: WallDef): GridLine[] {
  const lines: GridLine[] = [];
  const centerU = wall.uLen / 2;
  const centerV = wall.vLen / 2;
  const maxDist = Math.max(centerU, centerV);

  const vPoints = getSymmetricGridPoints(wall.vLen, GRID_STEP);
  for (const v of vPoints) {
    const perpDist = Math.abs(v - centerV);
    const norm = Math.min(perpDist / maxDist, 1);
    lines.push({
      start: wallPoint(wall, 0, v),
      end: wallPoint(wall, wall.uLen, v),
      opacity: THREE.MathUtils.lerp(0.12, 0.55, norm),
    });
  }

  const uPoints = getSymmetricGridPoints(wall.uLen, GRID_STEP);
  for (const u of uPoints) {
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
    const vPoints = getSymmetricGridPoints(wall.vLen, GRID_STEP);
    for (const v of vPoints) {
      points.push(wallPoint(wall, 0, v));
      points.push(wallPoint(wall, wall.uLen, v));
    }

    const uPoints = getSymmetricGridPoints(wall.uLen, GRID_STEP);
    for (const u of uPoints) {
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
  const uPoints = getSymmetricGridPoints(wall.uLen, GRID_STEP).sort(
    (a, b) => a - b,
  );
  const vPoints = getSymmetricGridPoints(wall.vLen, GRID_STEP).sort(
    (a, b) => a - b,
  );

  const uCells = uPoints.length;
  const vCells = vPoints.length;

  if (uCells < 2 || vCells < 2) return null;

  let gu = Math.floor(rng() * uCells);
  let gv = Math.floor(rng() * vCells);

  let dirIdx = Math.floor(rng() * 4);

  const gridPath: [number, number][] = [[gu, gv]];
  const segments = 6 + Math.floor(rng() * 7);

  for (let seg = 0; seg < segments; seg++) {
    const steps = 1 + Math.floor(rng() * 3);
    const [du, dv] = DIRS[dirIdx];

    for (let s = 0; s < steps; s++) {
      const nu = gu + du;
      const nv = gv + dv;
      if (nu < 0 || nu >= uCells || nv < 0 || nv >= vCells) break;
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

  const points = deduped.map(([uIdx, vIdx]) =>
    wallPoint(wall, uPoints[uIdx], vPoints[vIdx]),
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
      origin: new THREE.Vector3(
        cx - width / 2,
        cy - height / 2,
        cz - depth / 2,
      ),
      uDir: new THREE.Vector3(1, 0, 0),
      vDir: new THREE.Vector3(0, 1, 0),
      uLen: width,
      vLen: height,
      inset: new THREE.Vector3(0, 0, 0.05),
    },
    {
      id: "left",
      origin: new THREE.Vector3(
        cx - width / 2,
        cy - height / 2,
        cz + depth / 2,
      ),
      uDir: new THREE.Vector3(0, 0, -1),
      vDir: new THREE.Vector3(0, 1, 0),
      uLen: depth,
      vLen: height,
      inset: new THREE.Vector3(0.05, 0, 0),
    },
    {
      id: "right",
      origin: new THREE.Vector3(
        cx + width / 2,
        cy - height / 2,
        cz - depth / 2,
      ),
      uDir: new THREE.Vector3(0, 0, 1),
      vDir: new THREE.Vector3(0, 1, 0),
      uLen: depth,
      vLen: height,
      inset: new THREE.Vector3(-0.05, 0, 0),
    },
    {
      id: "top",
      origin: new THREE.Vector3(
        cx - width / 2,
        cy + height / 2,
        cz + depth / 2,
      ),
      uDir: new THREE.Vector3(1, 0, 0),
      vDir: new THREE.Vector3(0, 0, -1),
      uLen: width,
      vLen: depth,
      inset: new THREE.Vector3(0, -0.05, 0),
    },
    {
      id: "bottom",
      origin: new THREE.Vector3(
        cx - width / 2,
        cy - height / 2,
        cz - depth / 2,
      ),
      uDir: new THREE.Vector3(1, 0, 0),
      vDir: new THREE.Vector3(0, 0, 1),
      uLen: width,
      vLen: depth,
      inset: new THREE.Vector3(0, 0.05, 0),
    },
  ];
}
