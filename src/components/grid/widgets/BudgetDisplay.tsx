"use client";

import type { WidgetProps } from "../types";
import { usePrizeSelection } from "../pages/home/prizes/PrizeContext";
import { SlidingNumber } from "@/components/mp/SlidingNumber";
import styles from "./BudgetDisplay.module.scss";

export function BudgetDisplay(_props: WidgetProps) {
  const { totalCost, hoursRequired, maxBudget } =
    usePrizeSelection();

  // HSV lerp: green (hue 120) → red (hue 0) based on cost ratio
  const ratio = Math.min(totalCost / maxBudget, 1);
  const hue = 120 * (1 - ratio);
  const color = `hsl(${hue}, 70%, 35%)`;

  return (
    <div className={styles.container}>
      <div className={styles.row}>
        <span className={styles.label}>Total cost:</span>
        <span className={styles.value} style={{ color }}>
          $<SlidingNumber value={totalCost} />
        </span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Hours required:</span>
        <span className={styles.value} style={{ color }}>
          <SlidingNumber value={hoursRequired} />
        </span>
      </div>
    </div>
  );
}
