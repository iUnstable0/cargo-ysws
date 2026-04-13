"use client";

import { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { motion } from "motion/react";

// @ts-expect-error bruh
import Banner from "@hackclub/banner";
import { ArrowLeft } from "lucide-react";

import Logo from "@/components/Logo";
import RobloxLogo from "@/components/RobloxLogo";

import { Magnetic } from "@/components/mp/Magnetic";

import styles from "./page.module.scss";

const BoxScene = dynamic(() => import("@/components/Box"), {
  ssr: false,
});

export default function Home() {
  const [navDepth, setNavDepth] = useState(0);
  const popPageRef = useRef<(() => void) | null>(null);
  const handleDepthChange = useCallback((depth: number) => {
    setNavDepth(depth);
  }, []);

  const isHome = navDepth === 0;

  return (
    <div className={styles.bg}>
      <Banner
        style={{
          width: "max(80px, 10vw)",
          top: "max(8px, 1.5vw)",
        }}
      />

      <div className={styles.canvasContainer}>
        <BoxScene onDepthChange={handleDepthChange} popPageRef={popPageRef} />
      </div>

      <div
        className={styles.backButtonOverlay}
        style={{
          opacity: !isHome ? 1 : 0,
          pointerEvents: !isHome ? "auto" : "none",
          transition: "opacity 0.4s ease",
        }}
      >
        <Magnetic intensity={0.3} range={80}>
          <button
            className={styles.backBtn}
            onClick={() => popPageRef.current?.()}
          >
            <ArrowLeft size={24} strokeWidth={2.5} />
          </button>
        </Magnetic>
      </div>

      <div
        className={styles.pageTitle}
        style={{
          opacity: isHome ? 1 : 0,
          visibility: isHome ? "visible" : "hidden",
          transition: "opacity 0.4s ease, visibility 0.4s",
        }}
      >
        <div className={styles.heroLockup}>
          <Logo variant="hero" />

          <div className={styles.heroDescBand}>
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
      </div>
    </div>
  );
}
