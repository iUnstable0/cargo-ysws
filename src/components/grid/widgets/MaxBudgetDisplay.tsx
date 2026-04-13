"use client";

import type { WidgetProps } from "../types";
import styles from "./MaxBudgetDisplay.module.scss";

export function MaxBudgetDisplay(_props: WidgetProps) {
  return (
    <div className={styles.container}>
      <span className={styles.label}>Max budget:</span>
      <span className={styles.value}>$50</span>
    </div>
  );
}
