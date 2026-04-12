"use client";

import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { useRef } from "react";
import type { RunnerData } from "./constants";
import { RUNNER_COLOR } from "./constants";

export function GridRunner({ runner }: { runner: RunnerData }) {
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
