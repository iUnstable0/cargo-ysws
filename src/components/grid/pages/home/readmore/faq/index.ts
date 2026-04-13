import type { PageDef } from "../../../../types";
import { SCENE_SEED } from "../../../../constants";
import { FaqContent } from "../../../../widgets/FaqContent";

export const faqPage: PageDef = {
  id: "faq",
  label: "FAQ",
  room: { width: 21, height: 16, depth: 10 },
  cells: [
    // FAQ content widget — spans 2 wide
    {
      kind: "widget",
      id: "faq-content",
      span: [
        { centerX: -1.5, centerY: 1.5 },
        { centerX: 1.5, centerY: 1.5 },
      ],
      component: FaqContent,
    },
  ],
  seed: SCENE_SEED + 4,
  runnersPerWall: { back: 4, left: 2, right: 2, top: 2, bottom: 2 },
};
