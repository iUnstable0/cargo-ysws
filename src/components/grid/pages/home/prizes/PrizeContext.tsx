"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Prize definitions
// ---------------------------------------------------------------------------

export interface Prize {
  id: string;
  label: string;
  defaultPrice: number;
  isDynamic: boolean;
}

export const PRIZES: Prize[] = [
  { id: "creator-store", label: "Creator Store grant", defaultPrice: 10, isDynamic: true },
  { id: "itch-gumroad", label: "itch.io / gumroad", defaultPrice: 10, isDynamic: true },
  { id: "aseprite", label: "Aseprite", defaultPrice: 20, isDynamic: false },
  { id: "roblox-gift-card", label: "Roblox gift card", defaultPrice: 10, isDynamic: false },
  { id: "roblox-figures", label: "Roblox 24pc Figure Set", defaultPrice: 20, isDynamic: false },
];

const MAX_BUDGET = 50;
const RATE_PER_HOUR = 5;

// ---------------------------------------------------------------------------
// Module-level refs for bridging React state to R3F useFrame + PageDef
// ---------------------------------------------------------------------------

/** Called by ActionCell onClick closures defined in the PageDef. */
export const prizeToggleRef: { current: (id: string) => void } = {
  current: () => {},
};

/** Read by Room.tsx / InteractiveCell in useFrame to determine selected cells. */
export const selectedCellIdsRef: { current: Set<string> } = {
  current: new Set(),
};

/** Read by WidgetMount to drive pop animation on the conjoined cell. */
export const isOverBudgetRef: { current: boolean } = { current: false };

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export interface PrizeSelectionState {
  selected: Set<string>;
  customPrices: Record<string, number>;
  totalCost: number;
  hoursRequired: number;
  maxBudget: number;
  isOverBudget: boolean;
  toggle: (id: string) => void;
  setPrice: (id: string, price: number) => void;
  isSelected: (id: string) => boolean;
  getPrice: (id: string) => number;
}

const PrizeSelectionContext = createContext<PrizeSelectionState | null>(null);

// ---------------------------------------------------------------------------
// Module-level external store for <Html> cross-root access
// drei's <Html> uses ReactDOM.createRoot() which breaks React context.
// Components inside <Html> use useSyncExternalStore to subscribe instead.
// ---------------------------------------------------------------------------

let _currentState: PrizeSelectionState | null = null;
const _listeners = new Set<() => void>();

function _subscribe(callback: () => void) {
  _listeners.add(callback);
  return () => _listeners.delete(callback);
}

function _getSnapshot() {
  return _currentState;
}

export function usePrizeSelection(): PrizeSelectionState {
  // Fast path: component is in the same React tree as the provider
  const ctx = useContext(PrizeSelectionContext);

  // Fallback: component is in a separate React root (e.g. inside <Html>)
  const externalState = useSyncExternalStore(
    _subscribe,
    _getSnapshot,
    _getSnapshot,
  );

  const state = ctx ?? externalState;
  if (!state)
    throw new Error(
      "usePrizeSelection must be used within PrizeSelectionProvider",
    );
  return state;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function PrizeSelectionProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [customPrices, setCustomPrices] = useState<Record<string, number>>({});

  const getPrice = useCallback(
    (id: string) => {
      const prize = PRIZES.find((p) => p.id === id);
      if (!prize) return 0;
      if (prize.isDynamic && id in customPrices) return customPrices[id];
      return prize.defaultPrice;
    },
    [customPrices],
  );

  const totalCost = useMemo(() => {
    let cost = 0;
    for (const id of selected) {
      cost += getPrice(id);
    }
    return cost;
  }, [selected, getPrice]);

  const hoursRequired = totalCost / RATE_PER_HOUR;
  const isOverBudget = totalCost > MAX_BUDGET;

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setPrice = useCallback((id: string, price: number) => {
    setCustomPrices((prev) => ({ ...prev, [id]: Math.max(0, price) }));
  }, []);

  const isSelectedFn = useCallback(
    (id: string) => selected.has(id),
    [selected],
  );

  // Sync module-level refs
  useEffect(() => {
    prizeToggleRef.current = toggle;
  }, [toggle]);

  useEffect(() => {
    selectedCellIdsRef.current = selected;
  }, [selected]);

  useEffect(() => {
    isOverBudgetRef.current = isOverBudget;
  }, [isOverBudget]);

  const value: PrizeSelectionState = useMemo(
    () => ({
      selected,
      customPrices,
      totalCost,
      hoursRequired,
      maxBudget: MAX_BUDGET,
      isOverBudget,
      toggle,
      setPrice,
      isSelected: isSelectedFn,
      getPrice,
    }),
    [
      selected,
      customPrices,
      totalCost,
      hoursRequired,
      isOverBudget,
      toggle,
      setPrice,
      isSelectedFn,
      getPrice,
    ],
  );

  // Sync module-level external store for cross-root access
  useEffect(() => {
    _currentState = value;
    _listeners.forEach((fn) => fn());
  });

  return (
    <PrizeSelectionContext.Provider value={value}>
      {children}
    </PrizeSelectionContext.Provider>
  );
}
