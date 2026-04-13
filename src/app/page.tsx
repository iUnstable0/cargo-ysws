"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Logo from "@/components/logo";
import RobloxLogo from "@/components/RobloxLogo";

import styles from "./page.module.scss";

const BoxScene = dynamic(() => import("@/components/box"), {
  ssr: false,
});

export default function Home() {
  const [navDepth, setNavDepth] = useState(0);
  const handleDepthChange = useCallback((depth: number) => {
    setNavDepth(depth);
  }, []);

  const isHome = navDepth === 0;

  return (
    <div className={styles.bg}>
      <div className={styles.canvasContainer}>
        <BoxScene onDepthChange={handleDepthChange} />
      </div>

      <div
        className={styles.pageTitle}
        style={{
          opacity: isHome ? 1 : 0,
          visibility: isHome ? "visible" : "hidden",
          transition: "opacity 0.4s ease, visibility 0.4s",
        }}
      >
        <Logo />

        <div className={styles.desc}>
          build a{" "}
          <span className={styles.robloxStudioWrap}>
            <RobloxLogo className={styles.robloxLogo} /> Studio
            <Image
              src="/builderman.png"
              alt="Builderman"
              width={48}
              height={48}
              className={styles.builderman}
            />
          </span>{" "}
          plugin, get{" "}
          <a
            href="https://www.roblox.com/library/4725618216/Moon-Animator-2"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.moonAnimatorLink}
          >
            Moon Animator 2
          </a>{" "}
          and more!
        </div>
      </div>
    </div>
  );
}
