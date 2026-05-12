import { PinCard } from "./PinCard";
import type { PinWithRelations } from "@/lib/types";

export function PinGrid({ pins }: { pins: PinWithRelations[] }) {
  if (pins.length === 0) {
    return (
      <div className="py-32 text-center">
        <div className="eyebrow">Nothing here yet</div>
        <p className="display-2 mt-3">The archive is empty.</p>
        <p className="mt-2 text-sm text-ink-muted">
          Save your first bookmark to get started.
        </p>
      </div>
    );
  }

  return (
    <div
      className="grid gap-x-6 gap-y-14 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 auto-rows-[minmax(14rem,auto)] sm:auto-rows-[minmax(16rem,auto)] lg:auto-rows-[minmax(18rem,auto)]"
      style={{ gridAutoFlow: "dense" }}
    >
      {pins.map((p) => (
        <PinCard key={p.id} pin={p} />
      ))}
    </div>
  );
}
