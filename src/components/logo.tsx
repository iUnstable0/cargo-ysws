"use client";

import styles from "./logo.module.scss";
import Image from "next/image";

import { motion } from "motion/react";

const MotionImage = motion.create(Image);

export default function Logo() {
  return (
    <div className={styles.titleCtn}>
      <div className={styles.title}>CARG</div>

      <MotionImage
        className={styles.titleIcon}
        src={"logo.svg"}
        width={200}
        height={200}
        alt={"Logo"}
        whileHover={{ rotate: 180 }}
        whileTap={{
          scale: 1.05,
        }}
        transition={{
          type: "spring",
          stiffness: 180,
          damping: 20,
          mass: 1.5,
        }}
      />
    </div>
  );
}
