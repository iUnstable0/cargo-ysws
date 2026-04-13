"use client";

import type { WidgetProps } from "../types";
import { usePrizeSelection } from "../pages/home/prizes/PrizeContext";
import { SlidingNumber } from "@/components/mp/SlidingNumber";
import styles from "./BudgetDisplay.module.scss";

export function BudgetDisplay(_props: WidgetProps) {
  const { totalCost, hoursRequired, isOverBudget } =
    usePrizeSelection();

  const color = isOverBudget ? "hsl(0, 70%, 35%)" : "#653a1b";

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
          <SlidingNumber value={Math.ceil(hoursRequired)} />
        </span>
      </div>
    </div>
  );
}
