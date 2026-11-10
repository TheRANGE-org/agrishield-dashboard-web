import { FLEET_CARD_COLORS } from "../../lib/fleetCardScheme";

function Swatch({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <span
      className={[
        "inline-flex h-4 w-7 shrink-0 overflow-hidden rounded-sm border border-slate-300",
        className ?? "",
      ].join(" ")}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}

function KeyItem({
  swatch,
  label,
}: {
  swatch: React.ReactNode;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {swatch}
      <span>{label}</span>
    </span>
  );
}

/** Reminds a technician which card region belongs to which condition. */
export default function FleetCardKey() {
  return (
    <div
      className="sticky top-[57px] z-10 -mx-4 mb-3 border-b border-slate-200/80 bg-slate-50/95 px-4 py-2 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
      aria-label="How to read node card colors"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
        <span className="font-medium text-slate-500">Card key</span>
        <KeyItem
          label="Production, readings ok"
          swatch={<Swatch className={FLEET_CARD_COLORS.quietFill} />}
        />
        <KeyItem
          label="Lab"
          swatch={
            <Swatch className="flex-col">
              <span className={`h-1/2 w-full ${FLEET_CARD_COLORS.labHeader}`} />
              <span className={`h-1/2 w-full ${FLEET_CARD_COLORS.quietFill}`} />
            </Swatch>
          }
        />
        <KeyItem
          label="Readings need attention"
          swatch={<Swatch className={FLEET_CARD_COLORS.readingsFill} />}
        />
        <KeyItem
          label="Stale contact"
          swatch={
            <Swatch>
              <span className={`w-1.5 ${FLEET_CARD_COLORS.staleRail}`} />
              <span className={`flex-1 ${FLEET_CARD_COLORS.quietFill}`} />
            </Swatch>
          }
        />
        <KeyItem
          label="Offline"
          swatch={
            <Swatch>
              <span className={`w-1.5 ${FLEET_CARD_COLORS.deadRail}`} />
              <span className={`flex-1 ${FLEET_CARD_COLORS.quietFill}`} />
            </Swatch>
          }
        />
        <span className="text-slate-400">
          These stack, so one card can show all three.
        </span>
      </div>
    </div>
  );
}
