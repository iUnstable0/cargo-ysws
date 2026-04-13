import type { PageDef } from "../../types";
import {
  ROOM_W,
  ROOM_H,
  ROOM_D,
  SCENE_SEED,
  RUNNERS_PER_WALL,
} from "../../constants";

export const homePage: PageDef = {
  id: "home",
  label: "Cargo",
  room: { width: ROOM_W, height: ROOM_H, depth: ROOM_D },
  cells: [
    {
      kind: "nav",
      id: "readmore",
      label: "Read more",
      centerX: -3.0,
      centerY: -3.0,
      target: "readmore",
    },
    {
      kind: "nav",
      id: "prizes",
      label: "Prizes",
      centerX: 0,
      centerY: -3.0,
      target: "prizes",
    },
    {
      kind: "nav",
      id: "enter",
      label: "Enter",
      centerX: 3.0,
      centerY: -3.0,
      target: "enter",
    },
  ],
  seed: SCENE_SEED,
  runnersPerWall: RUNNERS_PER_WALL,
};
