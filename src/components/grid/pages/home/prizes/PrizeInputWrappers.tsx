"use client";

import type { WidgetProps } from "../../../types";
import { PrizeInput } from "../../../widgets/PrizeInput";

export function CreatorStoreInput(props: WidgetProps) {
  return (
    <PrizeInput {...props} prizeId="creator-store" label="Creator Store grant" />
  );
}

export function ItchGumroadInput(props: WidgetProps) {
  return (
    <PrizeInput {...props} prizeId="itch-gumroad" label="itch.io / gumroad" />
  );
}
