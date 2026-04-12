"use client";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useMemo, useRef } from "react";
import {
  ROOM_D,
  BACK_WALL_Z,
  SINK_DEPTH,
  PHASE_SINK_END,
  INTERACTIVE_CELLS,
} from "./constants";
import { easeInOutCubic, phaseProgress } from "./utils";

export function CameraController({
  activeCell,
  progressRef,
}: {
  activeCell: string | null;
  progressRef: React.RefObject<number>;
}) {
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
        BACK_WALL_Z - SINK_DEPTH - 6,
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

  useFrame(({ camera }) => {
    const p = progressRef.current ?? 0;

    if (activeCell && targets && curves && p > 0) {
      const t = easeInOutCubic(p);
      curves.posCurve.getPoint(t, _pos.current);
      curves.lookCurve.getPoint(t, _look.current);

      camera.position.copy(_pos.current);
      currentLookAt.current.copy(_look.current);
    } else {
      camera.position.lerp(homePos, 0.08);
      currentLookAt.current.lerp(homeLookAt, 0.08);
    }

    camera.lookAt(currentLookAt.current);
  });

  return null;
}
