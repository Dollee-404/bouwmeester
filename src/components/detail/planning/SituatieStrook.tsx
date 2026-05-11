import { CloudRain } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

export type PlanningStatus = "op-schema" | "licht-achter" | "fors-achter" | "overschreden";

export interface MijlpaalMark {
  date: Date;
  subject: string;
}

export interface SituatieStrookProps {
  status: PlanningStatus;
  /** Positief = achter, negatief = voor, 0 = exact op schema */
  achterstandDagen: number;
  volgendeMijlpaal: { subject: string; overDagen: number } | null;
  isWeatherDependent: boolean;
  projectStart: Date | null;
  projectEnd: Date | null;
  today?: Date;
  mijlpalen: MijlpaalMark[];
}

// ── Zin-constructie ──────────────────────────────────────────────────────────

function dag(n: number): string {
  return `werkdag${n === 1 ? "" : "en"}`;
}

function buildZin(props: SituatieStrookProps): { deel1: string; deel2: string | null } {
  const { status, achterstandDagen, volgendeMijlpaal } = props;
  const abs = Math.abs(achterstandDagen);

  let deel1: string;
  let deel2: string | null = null;

  const mijlpaalZin = volgendeMijlpaal
    ? `Volgende mijlpaal: ${volgendeMijlpaal.subject} over ${volgendeMijlpaal.overDagen} ${dag(volgendeMijlpaal.overDagen)}.`
    : null;

  switch (status) {
    case "overschreden":
      deel1 = `De geplande oplevering was ${abs} ${dag(abs)} geleden.`;
      deel2 = "Project is nog niet afgerond.";
      break;

    case "op-schema":
      deel1 = achterstandDagen < -1
        ? `Project loopt ${abs} ${dag(abs)} voor op schema.`
        : "Project loopt op schema.";
      deel2 = mijlpaalZin;
      break;

    case "licht-achter":
    case "fors-achter":
      deel1 = `Project loopt ${abs} ${dag(abs)} achter.`;
      // Geen mijlpaal → geen tweede zin; de status zegt al genoeg.
      deel2 = mijlpaalZin;
      break;
  }

  return { deel1, deel2 };
}

// ── Kleurpalet per status ─────────────────────────────────────────────────────

function palette(status: PlanningStatus) {
  switch (status) {
    case "op-schema":
      return {
        bar:     "bg-emerald-500",
        trackFg: "#10b981",
        text:    "text-emerald-700",
        accent:  "#10b981",
      };
    case "licht-achter":
      return {
        bar:     "bg-amber-500",
        trackFg: "#f59e0b",
        text:    "text-amber-700",
        accent:  "#f59e0b",
      };
    case "fors-achter":
    case "overschreden":
      return {
        bar:     "bg-red-500",
        trackFg: "#ef4444",
        text:    "text-red-700",
        accent:  "#ef4444",
      };
  }
}

// ── Mini-tijdsstrook ──────────────────────────────────────────────────────────

const TRACK_Y = 11;
const TRACK_H = 6;
const CY = TRACK_Y + TRACK_H / 2;

function MiniTijdsstrook({
  projectStart,
  projectEnd,
  today,
  mijlpalen,
  status,
}: Pick<SituatieStrookProps, "projectStart" | "projectEnd" | "today" | "mijlpalen" | "status">) {
  const now = today ?? new Date();

  if (!projectStart || !projectEnd || projectEnd <= projectStart) {
    return (
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-slate-200" />
        <span className="text-xs text-slate-400">Geen planningsdatums</span>
      </div>
    );
  }

  const total = projectEnd.getTime() - projectStart.getTime();
  const toPercent = (d: Date) =>
    Math.min(100, Math.max(0, ((d.getTime() - projectStart.getTime()) / total) * 100));

  const todayPct = toPercent(now);
  const cl = palette(status);

  const relevantMijlpalen = mijlpalen.filter(
    (m) => m.date >= projectStart && m.date <= projectEnd,
  );

  // Vandaag-label verbergen wanneer te dicht bij de randen (voorkomt overlap)
  const showVandaagLabel = todayPct >= 12 && todayPct <= 88;

  return (
    <div className="mt-4 select-none">
      {/* Puur CSS — geen SVG viewBox-distortie, capsule aan beide uiteinden */}
      <div className="relative" style={{ height: 32 }}>

        {/* Track achtergrond: volledige breedte, capsule */}
        <div
          className="absolute bg-slate-200"
          style={{ left: 0, right: 0, top: TRACK_Y, height: TRACK_H, borderRadius: TRACK_H / 2 }}
          aria-hidden="true"
        />

        {/* Afgelegde deel: capsule aan beide kanten */}
        <div
          className="absolute"
          style={{
            left: 0,
            top: TRACK_Y,
            height: TRACK_H,
            width: `${todayPct}%`,
            backgroundColor: cl.trackFg,
            opacity: 0.4,
            borderRadius: TRACK_H / 2,
          }}
          aria-hidden="true"
        />

        {/* Mijlpaal-ruitjes: 12 × 12 px, gecentreerd op de trackbalk */}
        {relevantMijlpalen.map((m, i) => (
          <div
            key={i}
            className="absolute border-2 border-white"
            style={{
              left: `${toPercent(m.date)}%`,
              top: CY,
              width: 12,
              height: 12,
              transform: "translate(-50%, -50%) rotate(45deg)",
              backgroundColor: cl.accent,
            }}
            aria-hidden="true"
          />
        ))}

        {/* Vandaag: dunne verticale lijn, altijd 1.5 px breed */}
        <div
          className="absolute"
          style={{
            left: `${todayPct}%`,
            top: TRACK_Y - 5,
            height: TRACK_H + 10,
            width: 1.5,
            transform: "translateX(-50%)",
            backgroundColor: cl.accent,
            opacity: 0.6,
            borderRadius: 2,
          }}
          aria-hidden="true"
        />
      </div>

      {/* Labels: absoluut gepositioneerd zodat "vandaag" de werkelijke positie volgt */}
      <div className="relative mt-1 h-4">
        <span className="absolute left-0 text-xs text-slate-400 whitespace-nowrap">
          {projectStart.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
        </span>

        {showVandaagLabel && (
          <span
            className={`absolute text-xs font-medium whitespace-nowrap ${cl.text}`}
            style={{ left: `${todayPct}%`, transform: "translateX(-50%)" }}
          >
            vandaag
          </span>
        )}

        <span className="absolute right-0 text-xs text-slate-400 whitespace-nowrap text-right">
          {projectEnd.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      </div>
    </div>
  );
}

// ── Hoofd-component ───────────────────────────────────────────────────────────

export function SituatieStrook(props: SituatieStrookProps) {
  const { status, isWeatherDependent } = props;
  const cl = palette(status);
  const { deel1, deel2 } = buildZin(props);

  return (
    <div className="flex gap-3">
      {/* Accentbalk links */}
      <div className={`w-1 shrink-0 rounded-full self-stretch min-h-[2.5rem] ${cl.bar}`} aria-hidden="true" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Situatiezin */}
        <p className="text-base font-semibold text-slate-800 leading-snug">
          {deel1}
          {deel2 && (
            <>
              {" "}
              <span className="font-normal text-slate-600">{deel2}</span>
            </>
          )}
        </p>

        {/* Weersafhankelijk indicator */}
        {isWeatherDependent && (
          <p className="flex items-center gap-1 mt-1 text-xs text-slate-500">
            <CloudRain size={12} aria-hidden="true" />
            weersafhankelijk project
          </p>
        )}

        {/* Mini-tijdsstrook */}
        <MiniTijdsstrook
          projectStart={props.projectStart}
          projectEnd={props.projectEnd}
          today={props.today}
          mijlpalen={props.mijlpalen}
          status={status}
        />
      </div>
    </div>
  );
}
