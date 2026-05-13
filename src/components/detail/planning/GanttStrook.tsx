import { useState } from "react";
import { useTranslation } from "react-i18next";
import { getHolidaysInRange, getISOWeek } from "../../../data/planning-helpers";
import type { GanttData, GanttFase, GanttMijlpaal } from "./gantt-logica";
import { getPhaseColor, getPhaseBaselineColor } from "./phase-colors";
import type { Werksoort } from "../../../data/types";

// ── Constanten ────────────────────────────────────────────────────────────────

const LABEL_W     = 128; // px breedte fase-labelkolom (incl. 3px accentrand)
const WEEK_BAND_H = 16;  // px hoogte week-band (boven date-ticks, week/maand-zoom)
const HEADER_H    = 28;  // px hoogte date-ticks-rij
const MILE_H      = 38;  // px hoogte mijlpaalrij
const ROW_H       = 52;  // px hoogte per faserij (meer lucht)
const BAR_TOP     = 17;  // px — gecentreerd in 52px rij: top=17, bar=18, bottom=17
const BAR_H       = 18;  // px hoogte van balken

// ── Zoom-types ────────────────────────────────────────────────────────────────

export type GanttZoom = "week" | "maand" | "project";

function computeViewRange(
  zoom: GanttZoom,
  today: Date,
  projectStart: Date | null,
  projectEnd: Date | null,
): { viewStart: Date; viewEnd: Date } {
  const midnight = (d: Date) => { const r = new Date(d); r.setHours(0, 0, 0, 0); return r; };
  const offset = (n: number) => { const r = midnight(today); r.setDate(r.getDate() + n); return r; };

  if (zoom === "week") {
    const dow = today.getDay();
    const vs = offset(dow === 0 ? -6 : 1 - dow);
    const ve = new Date(vs); ve.setDate(ve.getDate() + 6); ve.setHours(23, 59, 59, 999);
    return { viewStart: vs, viewEnd: ve };
  }

  if (zoom === "maand") {
    const vs = offset(-14);
    const ve = offset(14); ve.setHours(23, 59, 59, 999);
    return { viewStart: vs, viewEnd: ve };
  }

  const vs = projectStart ? midnight(projectStart) : offset(-30);
  const ve = projectEnd ? new Date(projectEnd) : offset(60);
  ve.setHours(23, 59, 59, 999);
  return { viewStart: vs, viewEnd: ve };
}

// ── Percentage-helper ─────────────────────────────────────────────────────────

function makeToPercent(viewStart: Date, viewEnd: Date) {
  const total = viewEnd.getTime() - viewStart.getTime();
  if (total <= 0) return (_: Date) => 0;
  return (d: Date) => ((d.getTime() - viewStart.getTime()) / total) * 100;
}

// ── Weekend-banden ────────────────────────────────────────────────────────────

function weekendBands(viewStart: Date, viewEnd: Date, toPercent: (d: Date) => number) {
  const bands: Array<{ left: number; width: number }> = [];
  const cur = new Date(viewStart); cur.setHours(0, 0, 0, 0);

  while (cur <= viewEnd) {
    if (cur.getDay() === 6) {
      const sat = new Date(cur);
      const afterSun = new Date(cur); afterSun.setDate(afterSun.getDate() + 2);
      const l = toPercent(sat);
      const r = toPercent(afterSun);
      if (r > 0 && l < 100) bands.push({ left: l, width: r - l });
      cur.setDate(cur.getDate() + 7);
    } else {
      cur.setDate(cur.getDate() + 1);
    }
  }
  return bands;
}

// ── Header-ticks ──────────────────────────────────────────────────────────────

function headerTicks(
  zoom: GanttZoom,
  viewStart: Date,
  viewEnd: Date,
  toPercent: (d: Date) => number,
): Array<{ pct: number; label: string }> {
  const ticks: Array<{ pct: number; label: string }> = [];
  const cur = new Date(viewStart); cur.setHours(0, 0, 0, 0);

  if (zoom === "week") {
    while (cur <= viewEnd) {
      ticks.push({
        pct: toPercent(cur),
        label: cur.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric" }),
      });
      cur.setDate(cur.getDate() + 1);
    }
  } else if (zoom === "maand") {
    const dow = cur.getDay();
    if (dow !== 1) cur.setDate(cur.getDate() + (dow === 0 ? 1 : 8 - dow));
    while (cur <= viewEnd) {
      ticks.push({
        pct: toPercent(cur),
        label: cur.toLocaleDateString("nl-NL", { day: "numeric", month: "short" }),
      });
      cur.setDate(cur.getDate() + 7);
    }
  } else {
    cur.setDate(1);
    while (cur <= viewEnd) {
      ticks.push({
        pct: toPercent(cur),
        label: cur.toLocaleDateString("nl-NL", { month: "short", year: "2-digit" }),
      });
      cur.setMonth(cur.getMonth() + 1);
    }
  }
  return ticks;
}

// ── Week-markeringen (week-zoom en maand-zoom) ────────────────────────────────

function computeWeekMarks(
  viewStart: Date,
  viewEnd: Date,
  toPercent: (d: Date) => number,
): Array<{ weekNum: number; pct: number; widthPct: number }> {
  const marks: Array<{ weekNum: number; pct: number; widthPct: number }> = [];
  // Terug naar de maandag op of vóór viewStart
  const cur = new Date(viewStart);
  cur.setHours(0, 0, 0, 0);
  const dow = cur.getDay() || 7; // 1=ma … 7=zo
  if (dow !== 1) cur.setDate(cur.getDate() - (dow - 1));

  while (cur <= viewEnd) {
    const weekNum = getISOWeek(cur);
    const nextMon = new Date(cur);
    nextMon.setDate(nextMon.getDate() + 7);
    const startPct = toPercent(cur);
    const endPct   = toPercent(nextMon);
    if (endPct > 0 && startPct < 100) {
      marks.push({ weekNum, pct: Math.max(0, startPct), widthPct: Math.min(100, endPct) - Math.max(0, startPct) });
    }
    cur.setDate(cur.getDate() + 7);
  }
  return marks;
}

// ── Fase-balk ─────────────────────────────────────────────────────────────────
//
// Kleurconventie:
//   Baseline (gepland): slate-200 — subtiel, "dit is de planning"
//   Voortgang (gedaan): slate-500 — uniform voor alle fases, geen waarschuwingskleur
//   Kritiek pad: zichtbaar via 3px linker-accentbalk in de labelkolom (zie faserij-renderer)
//   Mijlpalen:   amber — "aankomend event", correct gebruik van deze kleur
//   Oranje/amber is NIET voor fase-voortgang; dat is de accentkleur voor let-op en events.

function FaseBalk({
  fase,
  phaseIndex,
  werksoort,
  toPercent,
}: {
  fase: GanttFase;
  phaseIndex: number;
  werksoort: Werksoort | null;
  toPercent: (d: Date) => number;
}) {
  const { plannedStart, plannedEnd, progress } = fase;
  if (!plannedStart || !plannedEnd) return null;

  const startPct = toPercent(plannedStart);
  const endPct   = toPercent(plannedEnd);
  const bWidth   = endPct - startPct;
  if (bWidth <= 0) return null;

  if (endPct < 0 || startPct > 100) return null;

  const progressWidth = bWidth * (progress / 100);

  return (
    <>
      {/* Baseline: volledige geplande duur — lichte fase-tint van het werksoort-palet */}
      <div
        className="absolute"
        style={{
          left: `${startPct}%`,
          width: `${bWidth}%`,
          top: BAR_TOP,
          height: BAR_H,
          backgroundColor: getPhaseBaselineColor(phaseIndex, werksoort),
          borderRadius: 9,
        }}
        aria-hidden="true"
      />
      {/* Voortgang: diepe fase-kleur uit het werksoort-palet */}
      {progressWidth > 0 && (
        <div
          className="absolute"
          style={{
            left: `${startPct}%`,
            width: `${progressWidth}%`,
            top: BAR_TOP,
            height: BAR_H,
            backgroundColor: getPhaseColor(phaseIndex, werksoort),
            borderRadius: 9,
          }}
          aria-hidden="true"
        />
      )}
    </>
  );
}

// ── Mijlpaal-ruit ──────────────────────────────────────────────────────────────

function MijlpaalRuit({
  mijlpaal,
  toPercent,
}: {
  mijlpaal: GanttMijlpaal;
  toPercent: (d: Date) => number;
}) {
  const pct = toPercent(mijlpaal.date);
  if (pct < 0 || pct > 100) return null;

  return (
    <div
      className="absolute border-2 border-white"
      title={`${mijlpaal.subject} — ${mijlpaal.date.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}`}
      style={{
        left: `${pct}%`,
        top: "50%",
        width: 12,
        height: 12,
        transform: "translate(-50%, -50%) rotate(45deg)",
        backgroundColor: "#f59e0b",
      }}
      aria-hidden="true"
    />
  );
}

// ── Hoofd-component ───────────────────────────────────────────────────────────

export interface GanttStrookProps {
  data: GanttData;
  werksoort?: Werksoort | null;
  today?: Date;
  onFaseClick?: (faseId: string) => void;
}

export function GanttStrook({ data, werksoort = null, today, onFaseClick }: GanttStrookProps) {
  const { t } = useTranslation();
  const [zoom, setZoom] = useState<GanttZoom>("project");
  const now = today ?? new Date();

  const { fases, mijlpalen, projectStart, projectEnd } = data;

  if (fases.length === 0 && mijlpalen.length === 0) {
    return (
      <div className="mt-6">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          {t("planning.gantt.tijdlijn")}
        </h3>
        <div className="py-8 text-center">
          <p className="text-sm text-slate-400">{t("planning.gantt.leeg")}</p>
        </div>
      </div>
    );
  }

  const { viewStart, viewEnd } = computeViewRange(zoom, now, projectStart, projectEnd);
  const toPercent = makeToPercent(viewStart, viewEnd);
  const todayPct  = toPercent(now);

  // Weekend-arcering en feestdagen alleen in week- en maand-zoom
  const bands = zoom !== "project" ? weekendBands(viewStart, viewEnd, toPercent) : [];

  // Feestdag-arcering: volledige dag (zelfde metafoor als weekends, maar geel en na weekends
  // gerenderd zodat feestdag altijd wint bij overlap).
  const holidayBands = zoom !== "project"
    ? getHolidaysInRange(viewStart, viewEnd).flatMap(h => {
        const dayStart = new Date(h.date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        const l = toPercent(dayStart);
        const r = toPercent(dayEnd);
        if (r <= 0 || l >= 100) return [];
        return [{
          left: l,
          width: r - l,
          label: `${h.name} — ${dayStart.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}`,
        }];
      })
    : [];
  const ticks = headerTicks(zoom, viewStart, viewEnd, toPercent);
  const weekMarks = zoom !== "project" ? computeWeekMarks(viewStart, viewEnd, toPercent) : [];

  const showWeekBand = zoom !== "project";
  const totalHeight = (showWeekBand ? WEEK_BAND_H : 0) + HEADER_H + MILE_H + fases.length * ROW_H;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          {t("planning.gantt.tijdlijn")}
        </h3>
        <div className="flex gap-1">
          {(["week", "maand", "project"] as GanttZoom[]).map(z => (
            <button
              key={z}
              type="button"
              onClick={() => setZoom(z)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                zoom === z
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {z === "week"
                ? t("planning.gantt.zoom_week")
                : z === "maand"
                  ? t("planning.gantt.zoom_maand")
                  : t("planning.gantt.zoom_project")}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
        <div className="flex" style={{ minWidth: LABEL_W + 280 }}>

          {/* ── Labelkolom ─────────────────────────────────────────────────── */}
          {/* Kritiek-pad: 3px linker-accentbalk per faserij (consistent met SituatieStrook) */}
          <div className="flex-none flex flex-col border-r border-slate-100" style={{ width: LABEL_W }}>
            {showWeekBand && (
              <div style={{ height: WEEK_BAND_H }} className="bg-slate-50 border-b border-slate-200" />
            )}
            <div style={{ height: HEADER_H }} className="border-b border-slate-100" />
            <div
              style={{ height: MILE_H }}
              className="flex items-center px-3 border-b border-slate-200"
            >
              <span className="text-xs text-slate-400 font-medium">{t("planning.gantt.mijlpalen")}</span>
            </div>
            {fases.map(fase => (
              <div
                key={fase.id}
                style={{
                  height: ROW_H,
                  borderLeft: fase.isCritical ? "3px solid #334155" : "3px solid transparent",
                }}
                className="flex items-center border-t border-slate-100"
              >
                <span
                  className="text-xs font-medium text-slate-700 truncate px-3"
                  title={fase.subject}
                >
                  {fase.subject}
                </span>
              </div>
            ))}
          </div>

          {/* ── Grafiekkolom ────────────────────────────────────────────────── */}
          <div
            className="flex-1 relative overflow-hidden"
            style={{ height: totalHeight }}
          >
            {/* Weekend-arcering */}
            {bands.map((b, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 bg-slate-50"
                style={{ left: `${b.left}%`, width: `${b.width}%` }}
                aria-hidden="true"
              />
            ))}

            {/* Feestdag-arcering — puur visueel, geen pointer-events (fase-rijen liggen er overheen) */}
            {holidayBands.map((b, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0"
                style={{ left: `${b.left}%`, width: `${b.width}%`, backgroundColor: "#fef9c3", pointerEvents: "none" }}
                aria-hidden="true"
              />
            ))}

            {/* Vandaag-lijn */}
            {todayPct >= 0 && todayPct <= 100 && (
              <div
                className="absolute top-0 bottom-0"
                style={{
                  left: `${todayPct}%`,
                  width: 1.5,
                  backgroundColor: "#3b82f6",
                  opacity: 0.5,
                  transform: "translateX(-50%)",
                }}
                aria-hidden="true"
              />
            )}

            {/* ── Week-band (boven date-ticks, alleen week/maand-zoom) ─────── */}
            {showWeekBand && (
              <div
                className="relative bg-slate-50 border-b border-slate-200 overflow-hidden"
                style={{ height: WEEK_BAND_H }}
              >
                {/* Verticale scheidingslijnen tussen week-kolommen (maand-zoom) */}
                {zoom === "maand" && weekMarks.slice(1).map((wm, i) => (
                  <div
                    key={`div-${i}`}
                    className="absolute inset-y-0 border-l border-slate-200"
                    style={{ left: `${wm.pct}%` }}
                  />
                ))}

                {/* Week-labels gecentreerd in elke week-kolom; onderdrukken bij < 8% zichtbaar */}
                {weekMarks.map((wm, i) => (
                  wm.widthPct >= 8 && (
                    <div
                      key={i}
                      className="absolute inset-y-0 flex items-center justify-center overflow-hidden"
                      style={{ left: `${wm.pct}%`, width: `${wm.widthPct}%` }}
                    >
                      <span className={`whitespace-nowrap ${
                        zoom === "week"
                          ? "text-xs font-bold text-slate-700 tracking-wide"
                          : "text-[10px] font-semibold text-slate-500"
                      }`}>
                        {zoom === "week"
                          ? t("planning.gantt.week_lang", { n: wm.weekNum })
                          : t("planning.gantt.week_kort", { n: wm.weekNum })}
                      </span>
                    </div>
                  )
                ))}
              </div>
            )}

            {/* ── Date-ticks (dag/maandag labels + feestdag hover-targets) ─── */}
            <div
              className="relative border-b border-slate-200"
              style={{ height: HEADER_H }}
            >
              {/* Datumticks */}
              {ticks.map((t, i) => (
                <span
                  key={i}
                  className="absolute text-[10px] text-slate-400 whitespace-nowrap"
                  style={{ left: `${t.pct}%`, bottom: 4, transform: "translateX(-50%)" }}
                >
                  {t.label}
                </span>
              ))}

              {/* Feestdag hover-targets — hier bereikbaar, onder de week-band */}
              {holidayBands.map((b, i) => (
                <div
                  key={`ht-${i}`}
                  className="absolute top-0 bottom-0 cursor-default"
                  title={b.label}
                  style={{
                    left: `${b.left}%`,
                    width: `${b.width}%`,
                    borderBottom: "2px solid #fde68a",
                  }}
                />
              ))}
            </div>

            {/* ── Mijlpaalrij ────────────────────────────────────────────── */}
            <div
              className="relative border-b border-slate-200"
              style={{ height: MILE_H }}
            >
              {mijlpalen.map(m => (
                <MijlpaalRuit key={m.id} mijlpaal={m} toPercent={toPercent} />
              ))}
            </div>

            {/* ── Faserijen ──────────────────────────────────────────────── */}
            {fases.map((fase, i) => (
              <div
                key={fase.id}
                style={{ height: ROW_H }}
                className={`relative border-t border-slate-100 ${onFaseClick ? "cursor-pointer hover:bg-slate-50" : ""}`}
                onClick={onFaseClick ? () => onFaseClick(fase.id) : undefined}
              >
                <FaseBalk fase={fase} phaseIndex={i} werksoort={werksoort} toPercent={toPercent} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
