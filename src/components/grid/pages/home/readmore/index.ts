import type { PageDef } from "../../../types";
import { SCENE_SEED } from "../../../constants";
import { ReadMoreContent } from "../../../widgets/ReadMoreContent";

export const readmorePage: PageDef = {
  id: "readmore",
  label: "Read more",
  room: { width: 27, height: 24, depth: 12 },
  cells: [
    // Main content widget — spans 3 wide × 2 tall
    {
      kind: "widget",
      id: "readmore-content",
      span: [
        { centerX: -6, centerY: 4.5 },
        { centerX: -3, centerY: 4.5 },
        { centerX: 0, centerY: 4.5 },
        { centerX: 3, centerY: 4.5 },
        { centerX: 6, centerY: 4.5 },

        { centerX: -6, centerY: 1.5 },
        { centerX: -3, centerY: 1.5 },
        { centerX: 0, centerY: 1.5 },
        { centerX: 3, centerY: 1.5 },
        { centerX: 6, centerY: 1.5 },

        { centerX: -6, centerY: -1.5 },
        { centerX: -3, centerY: -1.5 },
        { centerX: 0, centerY: -1.5 },
        { centerX: 3, centerY: -1.5 },
        { centerX: 6, centerY: -1.5 },

        // { centerX: -6, centerY: -4.5 },
        // { centerX: -3, centerY: -4.5 },
        // { centerX: 0, centerY: -4.5 },
        // { centerX: 3, centerY: -4.5 },
        // { centerX: 6, centerY: -4.5 },
      ],
      component: ReadMoreContent,
    },
    // FAQ nav cell — leads to nested FAQ room
    {
      kind: "nav",
      id: "faq",
      label: "Read the FAQs",
      centerX: -6,
      centerY: -4.5,
      target: "faq",
    },
  ],
  seed: SCENE_SEED + 3,
  runnersPerWall: { back: 6, left: 3, right: 3, top: 3, bottom: 3 },
};
