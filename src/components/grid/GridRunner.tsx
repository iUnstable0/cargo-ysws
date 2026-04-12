"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { useRef, useLayoutEffect } from "react";
import type { RunnerData } from "./constants";
import { RUNNER_COLOR } from "./constants";

// Base lineWidth was tuned at ~800px viewport height; scale linearly from there.
const BASE_HEIGHT = 800;
const BASE_LINE_WIDTH = 3.2;

export function GridRunner({ runner }: { runner: RunnerData }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lineRef = useRef<any>(null);
  const offset = useRef(runner.initialOffset);
  const size = useThree((state) => state.size);
  const lineWidth = Math.max(
    0.8,
    (size.height / BASE_HEIGHT) * BASE_LINE_WIDTH,
  );

  useFrame((_, delta) => {
    offset.current -= delta * runner.speed;
    if (lineRef.current?.material) {
      lineRef.current.material.dashOffset = offset.current;
    }
  });

  useLayoutEffect(() => {
    if (lineRef.current?.material) {
      const mat = lineRef.current.material;
      // Escalate runner color into HDR bounds to exclusively trigger threshold bloom, and bypass tone mapping
      mat.color.set(RUNNER_COLOR).multiplyScalar(4);
      mat.toneMapped = false;

      mat.onBeforeCompile = (shader: any) => {
        // Taper opacity organically from the tip at the very end of the fragment pipeline
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <tonemapping_fragment>",
          `
          #ifdef USE_DASH
            float localDist = mod( vLineDistance + dashOffset, dashSize + gapSize );
            // Apply a glowing trailing comet gradient to the master pixel alpha
            gl_FragColor.a *= pow(localDist / dashSize, 2.5);
          #endif
          #include <tonemapping_fragment>
          `,
        );
      };
    }
  }, []);

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
