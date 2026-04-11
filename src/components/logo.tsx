"use client";

import styles from "./logo.module.scss";
import Image from "next/image";

import { motion } from "motion/react";

const MotionImage = motion.create(Image);

export default function Logo({ size }: { size: number }) {
  return (
    <div
      className={styles.titleCtn}
      style={{
        fontSize: `${size - 4}px`,
      }}
    >
      <div className={styles.title}>CARG</div>

      <MotionImage
        className={styles.titleIcon}
        src={"logo.svg"}
        width={size}
        height={size}
        alt={"Logo"}
        whileHover={{ rotate: 180 }}
        transition={{
          type: "spring", // Required to enable physics
          stiffness: 180, // How "tight" or strong the spring is (higher = faster snap)
          damping: 20, // Resistance to the spring (higher = less bounce, settles faster)
          mass: 1.5, // The weight of the object (higher = more sluggish)
        }}
      />
    </div>
  );
}
