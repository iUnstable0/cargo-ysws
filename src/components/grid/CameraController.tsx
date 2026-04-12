"use client";

import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useMemo, useRef } from "react";
import {
  ROOM_D,
  BACK_WALL_Z,
  SINK_DEPTH,
  INTERACTIVE_CELLS,
  HIDDEN_ROOM_D,
} from "./constants";
import { easeInOutCubic } from "./utils";

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

export function CameraController({
  activeCell,
  progressRef,
}: {
  activeCell: string | null;
  progressRef: React.RefObject<number>;
}) {
  const { size } = useThree();

  const homePos = useMemo(() => new THREE.Vector3(0, 0, ROOM_D / 2 - 1), []);
  const homeLookAt = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0));

  const _pos = useRef(new THREE.Vector3());
  const _look = useRef(new THREE.Vector3());

  const targets = useMemo(() => {
    if (!activeCell) return null;
    const cell = INTERACTIVE_CELLS.find((c) => c.id === activeCell);
    if (!cell) return null;
    return {
      approach: new THREE.Vector3(
        cell.centerX,
        cell.centerY,
        BACK_WALL_Z + 1.5,
      ),
      approachLook: new THREE.Vector3(
        cell.centerX,
        cell.centerY,
        BACK_WALL_Z - 4,
      ),
      through: new THREE.Vector3(
        cell.centerX,
        cell.centerY,
        BACK_WALL_Z - SINK_DEPTH - 4 - HIDDEN_ROOM_D + (ROOM_D - 1),
      ),
      throughLook: new THREE.Vector3(
        cell.centerX,
        cell.centerY,
        BACK_WALL_Z - SINK_DEPTH - 18,
      ),
    };
  }, [activeCell]);

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

    if (activeCell && targets && curves && p > 0) {
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
        // Adjust FOV to maintain horizontal framed content
        const baseTan = Math.tan(THREE.MathUtils.degToRad(baseFov / 2));
        targetFov = THREE.MathUtils.radToDeg(2 * Math.atan(baseTan / aspect));
        // Clamp to avoid extreme distortion
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
