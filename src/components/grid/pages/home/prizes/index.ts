import type { PageDef } from "../../../types";
import { SCENE_SEED } from "../../../constants";

export const prizesPage: PageDef = {
  id: "prizes",
  label: "Prizes",
  room: { width: 21, height: 20, depth: 12 },
  cells: [
    // Top row — email input spans 2 cells, sign-up button is the 3rd
    {
      kind: "action",
      id: "signup",
      label: "Sign Up",
      centerX: 3,
      centerY: 1.5,
    },
    // Bottom row
    {
      kind: "action",
      id: "join-slack",
      label: "Join Slack",
      centerX: -3,
      centerY: -1.5,
      href: "https://hackclub.com/slack",
    },
    {
      kind: "action",
      id: "login",
      label: "Login",
      centerX: 3,
      centerY: -1.5,
      href: "https://auth.hackclub.com",
    },
  ],
  seed: SCENE_SEED + 1,
  runnersPerWall: { back: 6, left: 3, right: 3, top: 3, bottom: 3 },
};
