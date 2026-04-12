"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Logo from "@/components/logo";

import styles from "./page.module.scss";

const BoxScene = dynamic(() => import("@/components/box"), {
  ssr: false,
});

export default function Home() {
  const [activeCell, setActiveCell] = useState<string | null>(null);

  return (
    <div className={styles.bg}>
      <div className={styles.canvasContainer}>
        <BoxScene activeCell={activeCell} onCellChange={setActiveCell} />
      </div>

      <div
        className={styles.pageTitle}
        style={{
          opacity: activeCell ? 0 : 1,
          transition: "opacity 0.4s ease",
          pointerEvents: activeCell ? "none" : undefined,
        }}
      >
        <Logo />
      </div>
    </div>
  );
}
