"use client";

import styles from "./Logo.module.scss";
import Image from "next/image";

import { motion } from "motion/react";

const titleIconTransition = {
  type: "spring",
  stiffness: 180,
  damping: 20,
  mass: 1.5,
};

export default function Logo() {
  return (
    <span className={styles.titleCtn}>
      <span className={styles.title}>CARG</span>

      <span className={styles.titleIconWrap}>
        <motion.span
          className={styles.titleIconMotion}
          whileHover={{ rotate: 180 }}
          whileTap={{ scale: 1.05 }}
          transition={titleIconTransition}
        >
          <Image
            className={styles.titleIcon}
            src="/logo.svg"
            width={200}
            height={200}
            alt="Logo"
          />
        </motion.span>
      </span>
    </span>
  );
}
