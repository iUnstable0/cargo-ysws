"use client";

import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useMemo, useRef } from "react";
import { SINK_DEPTH } from "./constants";
import { easeInOutCubic } from "./utils";
import { useNavigation } from "./navigation/context";
import { getRootPage } from "./pages";

const CAMERA_RETURN_DAMP = 10;
const LOOK_RETURN_DAMP = 12;
const FOV_DAMP = 12;
const FOV_EPSILON = 0.01;

function dampVector3(
  current: THREE.Vector3,
  target: THREE.Vector3,
  lambda: number,
  delta: number,
) {
  current.x = THREE.MathUtils.damp(current.x, target.x, lambda, delta);
  current.y = THREE.MathUtils.damp(current.y, target.y, lambda, delta);
  current.z = THREE.MathUtils.damp(current.z, target.z, lambda, delta);
}

/** Get the center position of a doorway cell (handles widget spans). */
function getDoorwayPos(
  cell: import("./types").CellDef,
): { centerX: number; centerY: number } | null {
  if (cell.kind === "widget") {
    const xs = cell.span.map((s) => s.centerX);
    const ys = cell.span.map((s) => s.centerY);
    return {
      centerX: xs.reduce((a, b) => a + b, 0) / xs.length,
      centerY: ys.reduce((a, b) => a + b, 0) / ys.length,
    };
  }
  return { centerX: cell.centerX, centerY: cell.centerY };
}

export function CameraController() {
  const { doorwayCell, currentPage, parentPage, progressRef, depth, directionRef } =
    useNavigation();
  const { size } = useThree();

  // Dynamic homePos: based on the settled room's depth
  // When settled (no transition): current page is at origin
  // When transitioning: parent page is at origin
  const settledRoomDepth =
    directionRef.current !== null && depth > 0
      ? (parentPage ?? getRootPage()).room.depth
      : currentPage.room.depth;

  const homePos = useMemo(
    () => new THREE.Vector3(0, 0, settledRoomDepth / 2 - 1),
    [settledRoomDepth],
  );
  const homeLookAt = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0));

  const _pos = useRef(new THREE.Vector3());
  const _look = useRef(new THREE.Vector3());

  // Teleport snap detection: only snap when a transition completes (direction → null),
  // NOT when a transition starts (null → "out"). This prevents premature camera jumps
  // when popPage triggers the reverse teleport.
  const prevDirectionRef = useRef<"in" | "out" | null>(null);
  const snapNextFrame = useRef(false);
  if (directionRef.current === null && prevDirectionRef.current !== null) {
    snapNextFrame.current = true;
  }
  prevDirectionRef.current = directionRef.current;

  // Only follow the CatmullRom curve when actively transitioning
  const isAnimating = directionRef.current !== null && depth > 0 && doorwayCell !== null;

  // Compute transition targets from the parent room (at origin) to the child room
  const parentDepth = (parentPage ?? getRootPage()).room.depth;

  const targets = useMemo(() => {
    if (!doorwayCell) return null;
    const pos = getDoorwayPos(doorwayCell);
    if (!pos) return null;

    const childDepth = currentPage.room.depth;
    const parentBackWallZ = -parentDepth / 2;
    const childCenterZ =
      parentBackWallZ - SINK_DEPTH - 4 - childDepth / 2;

    return {
      approach: new THREE.Vector3(
        pos.centerX,
        pos.centerY,
        parentBackWallZ + 1.5,
      ),
      approachLook: new THREE.Vector3(
        pos.centerX,
        pos.centerY,
        parentBackWallZ - 4,
      ),
      // "through" = child room's homePos in world space
      through: new THREE.Vector3(
        pos.centerX,
        pos.centerY,
        childCenterZ + childDepth / 2 - 1,
      ),
      // "throughLook" = child room's center in world space
      throughLook: new THREE.Vector3(
        pos.centerX,
        pos.centerY,
        childCenterZ,
      ),
    };
  }, [doorwayCell, currentPage.room.depth, parentDepth]);

  const curves = useMemo(() => {
    if (!targets) return null;
    return {
      posCurve: new THREE.CatmullRomCurve3(
        [homePos, targets.approach, targets.through],
        false,
        "centripetal",
      ),
      lookCurve: new THREE.CatmullRomCurve3(
        [homeLookAt, targets.approachLook, targets.throughLook],
        false,
        "centripetal",
      ),
    };
  }, [targets, homePos, homeLookAt]);

  useFrame(({ camera }, delta) => {
    const p = progressRef.current ?? 0;

    // Teleport snap — skip damping for this frame
    if (snapNextFrame.current) {
      snapNextFrame.current = false;
      camera.position.copy(homePos);
      currentLookAt.current.copy(homeLookAt);
      camera.lookAt(currentLookAt.current);
      return;
    }

    if (isAnimating && targets && curves && p > 0) {
      const t = easeInOutCubic(p);
      curves.posCurve.getPoint(t, _pos.current);
      curves.lookCurve.getPoint(t, _look.current);

      camera.position.copy(_pos.current);
      currentLookAt.current.copy(_look.current);
    } else {
      // Settled or at root — damp to homePos
      dampVector3(camera.position, homePos, CAMERA_RETURN_DAMP, delta);
      dampVector3(currentLookAt.current, homeLookAt, LOOK_RETURN_DAMP, delta);
    }

    camera.lookAt(currentLookAt.current);

    if (camera instanceof THREE.PerspectiveCamera) {
      const aspect = size.width / size.height;
      const baseFov = 55;
      let targetFov = baseFov;
      if (aspect < 1) {
        const baseTan = Math.tan(THREE.MathUtils.degToRad(baseFov / 2));
        targetFov = THREE.MathUtils.radToDeg(2 * Math.atan(baseTan / aspect));
        targetFov = Math.max(55, Math.min(100, targetFov));
      }
      const nextFov = THREE.MathUtils.damp(
        camera.fov,
        targetFov,
        FOV_DAMP,
        delta,
      );
      if (Math.abs(nextFov - camera.fov) > FOV_EPSILON) {
        camera.fov = nextFov;
        camera.updateProjectionMatrix();
      }
    }
  });

  return null;
}
