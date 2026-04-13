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
    // Plugin showcase cards
    {
      kind: "action",
      id: "plugin-gear-utility",
      label: "Gear Utility",
      price: 0,
      imageObjectFit: "contain",
      centerX: -3,
      centerY: -4.5,
      imageSrc: "/gear-utility.webp",
      href: "https://devforum.roblox.com/t/fixed-open-source-gear-utility/1776131?u=iunstable0",
    },
    {
      kind: "action",
      id: "plugin-datastore-editor",
      label: "DataStore Editor",
      price: 9.99,
      imageObjectFit: "contain",
      centerX: 0,
      centerY: -4.5,
      imageSrc: "/datastore-editor.webp",
      href: "https://devforum.roblox.com/t/datastore-editor-v3/716915",
    },
    {
      kind: "action",
      id: "plugin-load-character",
      label: "Load Character Pro",
      price: 4.99,
      imageObjectFit: "contain",
      centerX: 3,
      centerY: -4.5,
      imageSrc: "/load-character-pro.webp",

      href: "https://create.roblox.com/store/asset/4489766693/Load-Character-Pro",
    },
    {
      kind: "action",
      id: "plugin-tag-editor",
      label: "Tag Editor",
      price: 0,
      imageObjectFit: "contain",
      centerX: 6,
      centerY: -4.5,
      imageSrc: "/tag-editor.webp",

      href: "https://devforum.roblox.com/t/tag-editor-plugin/101133",
    },
  ],
  seed: SCENE_SEED + 3,
  runnersPerWall: { back: 6, left: 3, right: 3, top: 3, bottom: 3 },
};
