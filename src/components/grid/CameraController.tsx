"use client";

import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useMemo, useRef } from "react";
import { ROOM_D, ROOM_W } from "./constants";
import { easeInOutCubic } from "./utils";
import { useNavigation } from "./navigation/context";
import type { RoomStackEntry } from "./navigation/context";
import type { CellDef } from "./types";

// Camera-to-backwall distance ratio from the home room: (ROOM_D - 1) / ROOM_W
// This keeps the same visual zoom level regardless of room size.
const HOME_CAMERA_RATIO = (ROOM_D - 1) / ROOM_W;

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
  cell: CellDef,
): { centerX: number; centerY: number } {
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

/** Compute world-space homePos for a room stack entry.
 *  Camera distance from back wall scales with room width to match the home room's zoom level. */
function entryHomePos(entry: RoomStackEntry): THREE.Vector3 {
  const dist = Math.min(
    HOME_CAMERA_RATIO * entry.page.room.width,
    entry.page.room.depth - 1,
  );
  return new THREE.Vector3(
    entry.worldX,
    entry.worldY,
    entry.worldZ - entry.page.room.depth / 2 + dist,
  );
}

/** Compute world-space homeLookAt for a room stack entry. */
function entryHomeLookAt(entry: RoomStackEntry): THREE.Vector3 {
  return new THREE.Vector3(entry.worldX, entry.worldY, entry.worldZ);
}

export function CameraController() {
  const { roomStack, directionRef, progressRef } = useNavigation();
  const { size } = useThree();

  const settledEntry = roomStack[roomStack.length - 1];
  const parentEntry =
    roomStack.length > 1 ? roomStack[roomStack.length - 2] : null;

  // World-space homePos/homeLookAt for the settled (deepest) room
  const homePos = useMemo(() => entryHomePos(settledEntry), [settledEntry]);
  const homeLookAt = useMemo(
    () => entryHomeLookAt(settledEntry),
    [settledEntry],
  );

  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const _pos = useRef(new THREE.Vector3());
  const _look = useRef(new THREE.Vector3());

  // Snap detection: when roomStack changes while direction is null (breadcrumb jump)
  const prevStackLenRef = useRef(roomStack.length);
  const snapNextFrame = useRef(false);
  if (
    directionRef.current === null &&
    roomStack.length !== prevStackLenRef.current
  ) {
    snapNextFrame.current = true;
  }
  prevStackLenRef.current = roomStack.length;

  // Only follow the CatmullRom curve when actively transitioning
  const isAnimating =
    directionRef.current !== null && roomStack.length > 1;

  // Build camera curves from parent → child in world space
  const childEntry = roomStack[roomStack.length - 1];
  const doorwayCell = childEntry.doorwayCell;

  const curves = useMemo(() => {
    if (!parentEntry || !doorwayCell) return null;

    const doorPos = getDoorwayPos(doorwayCell);
    const parentBackWallZ =
      parentEntry.worldZ - parentEntry.page.room.depth / 2;

    // All positions in world space
    const from = entryHomePos(parentEntry);
    const approach = new THREE.Vector3(
      parentEntry.worldX + doorPos.centerX,
      parentEntry.worldY + doorPos.centerY,
      parentBackWallZ + 1.5,
    );
    const through = entryHomePos(childEntry);

    const fromLook = entryHomeLookAt(parentEntry);
    const approachLook = new THREE.Vector3(
      parentEntry.worldX + doorPos.centerX,
      parentEntry.worldY + doorPos.centerY,
      parentBackWallZ - 4,
    );
    const throughLook = entryHomeLookAt(childEntry);

    return {
      posCurve: new THREE.CatmullRomCurve3(
        [from, approach, through],
        false,
        "centripetal",
      ),
      lookCurve: new THREE.CatmullRomCurve3(
        [fromLook, approachLook, throughLook],
        false,
        "centripetal",
      ),
    };
  }, [parentEntry, childEntry, doorwayCell]);

  useFrame(({ camera }, delta) => {
    const p = progressRef.current ?? 0;

    // Snap for breadcrumb jumps (navigateToDepth)
    if (snapNextFrame.current) {
      snapNextFrame.current = false;
      camera.position.copy(homePos);
      currentLookAt.current.copy(homeLookAt);
      camera.lookAt(currentLookAt.current);
      return;
    }

    if (isAnimating && curves && p > 0) {
      const t = easeInOutCubic(p);
      curves.posCurve.getPoint(t, _pos.current);
      curves.lookCurve.getPoint(t, _look.current);

      camera.position.copy(_pos.current);
      currentLookAt.current.copy(_look.current);
    } else {
      // Settled — damp to homePos
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
