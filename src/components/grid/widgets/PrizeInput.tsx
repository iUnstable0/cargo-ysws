"use client";

import { useCallback } from "react";
import type { WidgetProps } from "../types";
import { usePrizeSelection } from "../pages/home/prizes/PrizeContext";
import styles from "./PrizeInput.module.scss";

export function PrizeInput({
  prizeId,
  label,
}: WidgetProps & { prizeId: string; label: string }) {
  const { toggle, setPrice, isSelected, getPrice } = usePrizeSelection();
  const selected = isSelected(prizeId);
  const price = getPrice(prizeId);

  const handlePriceChange = useCallback(
    (value: number) => {
      setPrice(prizeId, value);
      // Auto-select when user sets a price > 0
      if (value > 0 && !isSelected(prizeId)) {
        toggle(prizeId);
      }
    },
    [prizeId, setPrice, toggle, isSelected],
  );

  return (
    <div
      className={`${styles.container} ${selected ? styles.selected : ""}`}
      onClick={() => toggle(prizeId)}
    >
      <div className={styles.top}>
        <span className={styles.priceBadge}>${price}</span>
        <span className={styles.label}>{label}</span>
      </div>
      <div className={styles.controls} onClick={(e) => e.stopPropagation()}>
        <div className={styles.priceRow}>
          <span className={styles.dollar}>$</span>
          <input
            className={styles.input}
            type="number"
            step="1"
            min="0"
            max="50"
            value={price}
            onChange={(e) => handlePriceChange(Number(e.target.value) || 0)}
          />
        </div>
        <input
          className={styles.slider}
          type="range"
          min="0"
          max="50"
          step="1"
          value={price}
          onChange={(e) => handlePriceChange(Number(e.target.value))}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}
