"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { useRef } from "react";
import type { RunnerData } from "./constants";
import { RUNNER_COLOR } from "./constants";

// Base lineWidth was tuned at ~800px viewport height; scale linearly from there.
const BASE_HEIGHT = 800;
const BASE_LINE_WIDTH = 1.8;

export function GridRunner({ runner }: { runner: RunnerData }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lineRef = useRef<any>(null);
  const offset = useRef(runner.initialOffset);
  const size = useThree((state) => state.size);
  const lineWidth = Math.max(0.8, (size.height / BASE_HEIGHT) * BASE_LINE_WIDTH);

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
      lineWidth={lineWidth}
      dashed
      dashSize={runner.dashSize}
      gapSize={runner.totalLen}
      transparent
      opacity={0.85}
    />
  );
}
