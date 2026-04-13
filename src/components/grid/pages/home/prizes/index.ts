import type { PageDef } from "../../../types";
import { SCENE_SEED } from "../../../constants";
import { prizeToggleRef, selectedCellIdsRef } from "./PrizeContext";
import { BudgetDisplay } from "../../../widgets/BudgetDisplay";
import { MaxBudgetDisplay } from "../../../widgets/MaxBudgetDisplay";
import { CreatorStoreInput, ItchGumroadInput } from "./PrizeInputWrappers";

export const prizesPage: PageDef = {
  id: "prizes",
  label: "Prizes",
  room: { width: 33, height: 20, depth: 12 },
  selectedCellIdsRef,
  cells: [
    // --- Top row: budget display + max budget ---
    {
      kind: "widget",
      id: "budget-display",
      span: [
        { centerX: -6, centerY: 4.5 },
        { centerX: -3, centerY: 4.5 },
      ],
      component: BudgetDisplay,
    },
    {
      kind: "widget",
      id: "max-budget",
      span: [{ centerX: 6, centerY: 4.5 }],
      component: MaxBudgetDisplay,
    },

    // --- Bottom row: 5 prizes ---
    // Dynamic pricing (widget cells with input)
    {
      kind: "widget",
      id: "creator-store",
      span: [{ centerX: -6, centerY: -1.5 }],
      component: CreatorStoreInput,
    },
    {
      kind: "widget",
      id: "itch-gumroad",
      span: [{ centerX: -3, centerY: -1.5 }],
      component: ItchGumroadInput,
    },

    // Fixed pricing (action cells with toggle)
    {
      kind: "action",
      id: "aseprite",
      label: "Aseprite",
      price: 20,
      centerX: 0,
      centerY: -1.5,
      imageSrc: "/aseprite-banner.webp",
      onClick: () => prizeToggleRef.current("aseprite"),
    },
    {
      kind: "action",
      id: "roblox-gift-card",
      label: "Roblox gift card",
      price: 10,
      centerX: 3,
      centerY: -1.5,
      imageSrc: "/roblox-gift-card.webp",
      onClick: () => prizeToggleRef.current("roblox-gift-card"),
    },
    {
      kind: "action",
      id: "roblox-figures",
      label: "Roblox 24pc Figure Set",
      price: 20,
      centerX: 6,
      centerY: -1.5,
      imageSrc: "/roblox-figure-set.webp",
      onClick: () => prizeToggleRef.current("roblox-figures"),
    },
  ],
  seed: SCENE_SEED + 2,
  runnersPerWall: { back: 6, left: 3, right: 3, top: 3, bottom: 3 },
  hoverPop: 0.6,
};
