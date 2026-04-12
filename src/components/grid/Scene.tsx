"use client";

import { Canvas } from "@react-three/fiber";
import { ROOM_W, ROOM_H, ROOM_D, ROOM_COLOR } from "./constants";
import { Room } from "./Room";

export default function Scene({
  activeCell,
  onCellChange,
}: {
  activeCell: string | null;
  onCellChange: (id: string | null) => void;
}) {
  return (
    <Canvas
      shadows
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

      {/* Ambient light — bright white so Lambert cube faces show true cream color */}
      <ambientLight intensity={1.8} color="#ffffff" />

      {/* Directional light from top-left, angled behind camera for compact shadows */}
      <directionalLight
        position={[-ROOM_W / 4, ROOM_H / 3, ROOM_D * 0.8]}
        intensity={0.35}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
        shadow-camera-left={-ROOM_W / 2}
        shadow-camera-right={ROOM_W / 2}
        shadow-camera-top={ROOM_H / 2}
        shadow-camera-bottom={-ROOM_H / 2}
      />

      <Room activeCell={activeCell} onCellChange={onCellChange} />
    </Canvas>
  );
}
