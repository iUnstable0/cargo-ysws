"use client";

import type { WidgetProps } from "../types";
import styles from "./EmailInput.module.scss";

export function EmailInput(_props: WidgetProps) {
  return (
    <div className={styles.container}>
      <input
        className={styles.input}
        type="email"
        placeholder="your@email.com"
        autoComplete="email"
      />
    </div>
  );
}
