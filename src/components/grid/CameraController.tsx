"use client";

import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useMemo, useRef } from "react";
import { ROOM_D, BACK_WALL_Z, SINK_DEPTH } from "./constants";
import { easeInOutCubic } from "./utils";
import { useNavigation } from "./navigation/context";

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
  const { doorwayCell, currentPage, progressRef, depth } = useNavigation();
  const { size } = useThree();

  const homePos = useMemo(() => new THREE.Vector3(0, 0, ROOM_D / 2 - 1), []);
  const homeLookAt = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0));

  const _pos = useRef(new THREE.Vector3());
  const _look = useRef(new THREE.Vector3());

  const isActive = depth > 0 && doorwayCell !== null;

  const targets = useMemo(() => {
    if (!doorwayCell) return null;
    const pos = getDoorwayPos(doorwayCell);
    if (!pos) return null;

    const childDepth = currentPage.room.depth;

    return {
      approach: new THREE.Vector3(
        pos.centerX,
        pos.centerY,
        BACK_WALL_Z + 1.5,
      ),
      approachLook: new THREE.Vector3(
        pos.centerX,
        pos.centerY,
        BACK_WALL_Z - 4,
      ),
      through: new THREE.Vector3(
        pos.centerX,
        pos.centerY,
        BACK_WALL_Z - SINK_DEPTH - 4 - childDepth + (ROOM_D - 1),
      ),
      throughLook: new THREE.Vector3(
        pos.centerX,
        pos.centerY,
        BACK_WALL_Z - SINK_DEPTH - 18,
      ),
    };
  }, [doorwayCell, currentPage.room.depth]);

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

    if (isActive && targets && curves && p > 0) {
      const t = easeInOutCubic(p);
      curves.posCurve.getPoint(t, _pos.current);
      curves.lookCurve.getPoint(t, _look.current);

      camera.position.copy(_pos.current);
      currentLookAt.current.copy(_look.current);
    } else {
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
