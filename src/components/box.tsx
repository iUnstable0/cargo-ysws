"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Line, Html } from "@react-three/drei";
import * as THREE from "three";
import { useMemo, useRef, useCallback } from "react";
import type { ReactNode } from "react";
import styles from "./box.module.scss";

// --- Room geometry ---
const ROOM_W = 40;
const ROOM_H = 28;
const ROOM_D = 16;
const ROOM_COLOR = "#B79F92";
const GRID_STEP = 3;

const GRID_COLOR = "#3a2418";
const RUNNER_COLOR = "#9e7a5a";

const SCENE_SEED = 0xf79a1689;

const BACK_WALL_Z = -ROOM_D / 2;

// --- Seeded RNG (mulberry32) — stable layout across hot reload ---
function mulberry32(seed: number) {
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
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// --- Wall definitions ---
interface WallDef {
  id: string;
  origin: THREE.Vector3;
  uDir: THREE.Vector3;
  vDir: THREE.Vector3;
  uLen: number;
  vLen: number;
  inset: THREE.Vector3;
}

const WALLS: WallDef[] = [
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

const RUNNERS_PER_WALL: Record<string, number> = {
  back: 8,
  left: 5,
  right: 5,
  top: 4,
  bottom: 4,
};

// --- Grid generation ---
function wallPoint(wall: WallDef, u: number, v: number): THREE.Vector3 {
  return wall.origin
    .clone()
    .addScaledVector(wall.uDir, u)
    .addScaledVector(wall.vDir, v)
    .add(wall.inset);
}

// Per-line grid data for radial opacity
interface GridLine {
  start: THREE.Vector3;
  end: THREE.Vector3;
  opacity: number;
}

function generateBackWallGrid(wall: WallDef): GridLine[] {
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

function generateOtherWallsGrid(walls: WallDef[]): THREE.Vector3[] {
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
interface RunnerData {
  points: THREE.Vector3[];
  totalLen: number;
  period: number;
  dashSize: number;
  speed: number;
  initialOffset: number;
}

function totalLineDistance(points: THREE.Vector3[]): number {
  let sum = 0;
  for (let i = 1; i < points.length; i++) {
    sum += points[i].distanceTo(points[i - 1]);
  }
  return sum;
}

const DIRS: [number, number][] = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];

function generateRunnerPath(
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

// --- Scene generation ---
function generateScene(seed: number) {
  const rng = mulberry32(seed);

  const backWallGrid = generateBackWallGrid(WALLS[0]);
  const otherWallsGrid = generateOtherWallsGrid(WALLS.slice(1));

  const runners: RunnerData[] = [];
  for (const wall of WALLS) {
    const target = RUNNERS_PER_WALL[wall.id] ?? 5;
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

// --- Interactive cell definitions ---
interface CellDef {
  id: string;
  label: string;
  centerX: number;
  centerY: number;
}

const INTERACTIVE_CELLS: CellDef[] = [
  { id: "readmore", label: "Read More", centerX: -3.5, centerY: -3.5 },
  { id: "join", label: "Join", centerX: 2.5, centerY: -3.5 },
];

// --- Animated grid runner ---
function GridRunner({ runner }: { runner: RunnerData }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lineRef = useRef<any>(null);
  const offset = useRef(runner.initialOffset);

  useFrame((_, delta) => {
    offset.current -= delta * runner.speed;
    if (lineRef.current?.material) {
      lineRef.current.material.dashOffset = offset.current;
    }
  });

  return (
    <Line
      ref={lineRef}
      points={runner.points}
      color={RUNNER_COLOR}
      lineWidth={1.8}
      dashed
      dashSize={runner.dashSize}
      gapSize={runner.totalLen}
      transparent
      opacity={0.85}
    />
  );
}

// --- Interactive cell component ---
function InteractiveCell({
  cell,
  isActive,
  progressRef,
  onClick,
}: {
  cell: CellDef;
  isActive: boolean;
  progressRef: React.RefObject<number>;
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const htmlRef = useRef<HTMLButtonElement>(null);
  const hovered = useRef(false);

  const cellZ = BACK_WALL_Z + 0.06;
  const pushDepth = 3;

  useFrame(() => {
    if (!meshRef.current) return;
    const p = progressRef.current ?? 0;

    let targetZ: number;
    if (isActive) {
      targetZ = cellZ - pushDepth * easeInOutCubic(p);
    } else {
      targetZ = cellZ + (hovered.current ? 0.15 : 0);
    }

    meshRef.current.position.z = THREE.MathUtils.lerp(
      meshRef.current.position.z,
      targetZ,
      0.12,
    );

    // Hide button as cell pushes in
    if (htmlRef.current) {
      const show = !isActive || p < 0.3;
      htmlRef.current.style.opacity = show ? "1" : "0";
      htmlRef.current.style.pointerEvents = show ? "auto" : "none";
    }
  });

  return (
    <>
      <mesh
        ref={meshRef}
        position={[cell.centerX, cell.centerY, cellZ]}
        onPointerEnter={() => {
          if (!isActive) {
            hovered.current = true;
            document.body.style.cursor = "pointer";
          }
        }}
        onPointerLeave={() => {
          hovered.current = false;
          document.body.style.cursor = "auto";
        }}
        onClick={(e) => {
          if (!isActive) {
            e.stopPropagation();
            onClick();
          }
        }}
      >
        <planeGeometry args={[GRID_STEP - 0.1, GRID_STEP - 0.1]} />
        <meshBasicMaterial
          color="#a08878"
          transparent
          opacity={0.12}
          side={THREE.FrontSide}
        />
      </mesh>

      <Html
        position={[cell.centerX, cell.centerY, cellZ + 0.08]}
        center
        distanceFactor={15}
        zIndexRange={[5, 0]}
      >
        <button
          ref={htmlRef}
          className={styles.cellButton}
          onClick={onClick}
        >
          {cell.label}
        </button>
      </Html>
    </>
  );
}

// --- Detail content views ---
function DetailContent({
  cellId,
  onBack,
  opacityRef,
}: {
  cellId: string;
  onBack: () => void;
  opacityRef: React.RefObject<number>;
}) {
  const cell = INTERACTIVE_CELLS.find((c) => c.id === cellId);
  const containerRef = useRef<HTMLDivElement>(null);

  useFrame(() => {
    if (containerRef.current) {
      const o = opacityRef.current ?? 0;
      containerRef.current.style.opacity = String(o);
      containerRef.current.style.pointerEvents = o > 0.5 ? "auto" : "none";
    }
  });

  if (!cell) return null;

  return (
    <Html
      position={[cell.centerX, cell.centerY, BACK_WALL_Z - 2]}
      center
      distanceFactor={8}
      zIndexRange={[6, 0]}
    >
      <div ref={containerRef} className={styles.detailContent} style={{ opacity: 0 }}>
        {cellId === "readmore" ? (
          <>
            <h2>Build the Plugin You Wish You Had</h2>
            <p>
              Cargo is a program where teenagers build and ship one free,
              open-source Roblox Studio plugin that solves a real workflow
              problem.
            </p>
            <ul>
              <li>Submit your plugin idea for approval</li>
              <li>Build it in up to 10 hours (tracked in Hackatime)</li>
              <li>Ship it on the Creator Store + GitHub</li>
              <li>Earn $5/hr in Crate credit (up to $50)</li>
            </ul>
            <p>
              Rewards include Moon Animator 2, Aseprite, Roblox Credit, and
              Creator Store grants.
            </p>
          </>
        ) : (
          <>
            <h2>Join Cargo</h2>
            <p>
              Got a plugin idea that would make Roblox Studio better? Ship it and
              get paid.
            </p>
            <ul>
              <li>You&apos;re a teenager who builds on Roblox</li>
              <li>You have a plugin idea that solves a real problem</li>
              <li>You can ship it in 10 hours or less</li>
            </ul>
            <p>
              Your plugin must be free on the Creator Store, open-sourced on
              GitHub, and posted to DevForum.
            </p>
          </>
        )}
        <button className={styles.backButton} onClick={onBack}>
          ← Back
        </button>
      </div>
    </Html>
  );
}

// --- Camera controller ---
function CameraController({
  activeCell,
  progressRef,
}: {
  activeCell: string | null;
  progressRef: React.RefObject<number>;
}) {
  const homePos = useMemo(() => new THREE.Vector3(0, 0, ROOM_D / 2 - 1), []);
  const homeLookAt = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0));

  useFrame(({ camera }) => {
    const eased = easeInOutCubic(progressRef.current ?? 0);

    if (activeCell && (progressRef.current ?? 0) > 0) {
      const cell = INTERACTIVE_CELLS.find((c) => c.id === activeCell);
      if (!cell) return;

      const detailPos = new THREE.Vector3(
        cell.centerX,
        cell.centerY,
        BACK_WALL_Z + 4,
      );
      const detailLookAt = new THREE.Vector3(
        cell.centerX,
        cell.centerY,
        BACK_WALL_Z - 5,
      );

      camera.position.lerpVectors(homePos, detailPos, eased);
      currentLookAt.current.lerpVectors(homeLookAt, detailLookAt, eased);
    } else {
      camera.position.lerp(homePos, 0.08);
      currentLookAt.current.lerp(homeLookAt, 0.08);
    }

    camera.lookAt(currentLookAt.current);
  });

  return null;
}

// --- Mouse parallax wrapper ---
function ParallaxGroup({
  children,
  progressRef,
}: {
  children: ReactNode;
  progressRef: React.RefObject<number>;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((three) => {
    if (!groupRef.current) return;
    const intensity = progressRef.current ?? 1;
    const targetY = three.pointer.x * 0.04 * intensity;
    const targetX = -three.pointer.y * 0.03 * intensity;
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      targetY,
      0.05,
    );
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      targetX,
      0.05,
    );
  });

  return <group ref={groupRef}>{children}</group>;
}

// --- Room (walls + grid + runners + cells) ---
function Room({
  activeCell,
  onCellChange,
}: {
  activeCell: string | null;
  onCellChange: (id: string | null) => void;
}) {
  const scene = useMemo(() => generateScene(SCENE_SEED), []);

  const progressRef = useRef(0);
  const directionRef = useRef<"in" | "out" | null>(null);

  // Refs for imperative animation — avoids per-frame React re-renders
  const parallaxRef = useRef(1);
  const contentOpacityRef = useRef(0);
  const cellProgressRef = useRef(0);

  useFrame((_, delta) => {
    if (directionRef.current === "in") {
      progressRef.current = Math.min(1, progressRef.current + delta * 1.8);
      if (progressRef.current >= 1) directionRef.current = null;
    } else if (directionRef.current === "out") {
      progressRef.current = Math.max(0, progressRef.current - delta * 1.8);
      if (progressRef.current <= 0.001) {
        progressRef.current = 0;
        directionRef.current = null;
        onCellChange(null);
      }
    }

    const p = progressRef.current;
    parallaxRef.current = 1 - easeInOutCubic(p);
    contentOpacityRef.current = p > 0.5 ? (p - 0.5) * 2 : 0;
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

  return (
    <>
      <CameraController
        activeCell={activeCell}
        progressRef={progressRef}
      />

      <ParallaxGroup progressRef={parallaxRef}>
        {/* Inside-facing box for the walls */}
        <mesh>
          <boxGeometry args={[ROOM_W, ROOM_H, ROOM_D]} />
          <meshBasicMaterial color={ROOM_COLOR} side={THREE.BackSide} fog />
        </mesh>

        {/* Back wall grid — per-line radial opacity */}
        {scene.backWallGrid.map((line, i) => (
          <Line
            key={`bg-${i}`}
            points={[line.start, line.end]}
            color={GRID_COLOR}
            lineWidth={1.2}
            transparent
            opacity={line.opacity}
          />
        ))}

        {/* Other walls grid — batched */}
        {scene.otherWallsGrid.length > 0 && (
          <Line
            points={scene.otherWallsGrid}
            segments
            color={GRID_COLOR}
            lineWidth={1.2}
            transparent
            opacity={0.45}
          />
        )}

        {/* Animated grid runners */}
        {scene.runners.map((runner, i) => (
          <GridRunner key={i} runner={runner} />
        ))}

        {/* Interactive cells */}
        {INTERACTIVE_CELLS.map((cell) => (
          <InteractiveCell
            key={cell.id}
            cell={cell}
            isActive={activeCell === cell.id}
            progressRef={cellProgressRef}
            onClick={() => handleCellClick(cell.id)}
          />
        ))}

        {/* Detail content (behind the wall) */}
        {activeCell && (
          <DetailContent
            cellId={activeCell}
            onBack={handleBack}
            opacityRef={contentOpacityRef}
          />
        )}
      </ParallaxGroup>
    </>
  );
}

// --- Main Scene ---
export default function Scene({
  activeCell,
  onCellChange,
}: {
  activeCell: string | null;
  onCellChange: (id: string | null) => void;
}) {
  return (
    <Canvas
      camera={{
        position: [0, 0, ROOM_D / 2 - 1],
        fov: 55,
        near: 0.1,
        far: 200,
      }}
      onCreated={({ camera }) => {
        camera.lookAt(0, 0, 0);
      }}
      gl={{ antialias: true }}
      dpr={[1, 2]}
    >
      <fog attach="fog" args={[ROOM_COLOR, 14, 30]} />
      <Room activeCell={activeCell} onCellChange={onCellChange} />
    </Canvas>
  );
}
