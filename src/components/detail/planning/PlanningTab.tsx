import type { ProjectDetail, ProjectTask, TimesheetMap } from "../../../data/detail-types";
import { countWorkingDays } from "../../../data/planning-helpers";
import { SituatieStrook, type PlanningStatus, type MijlpaalMark } from "./SituatieStrook";
import { computeWerkvoorraad } from "./werkvoorraad-logica";
import { WerkvoorraadStrook } from "./WerkvoorraadStrook";

interface PlanningTabProps {
  detail: ProjectDetail;
  tasks: ProjectTask[];
  timesheets: TimesheetMap;
  today?: Date;
}

// ── Schema-berekening ─────────────────────────────────────────────────────────

function computePlanning(detail: ProjectDetail, tasks: ProjectTask[], today: Date) {
  const { startDate, endDate, percentComplete, isWeatherDependent } = detail;

  const mijlpalen: MijlpaalMark[] = tasks
    .filter((t) => t.isMilestone && t.expectedEndDate)
    .sort((a, b) => a.expectedEndDate!.getTime() - b.expectedEndDate!.getTime())
    .map((t) => ({ date: t.expectedEndDate!, subject: t.subject }));

  const volgendeMijlpaal = (() => {
    const komende = mijlpalen.filter((m) => m.date > today);
    if (!komende.length) return null;
    return {
      subject: komende[0].subject,
      overDagen: countWorkingDays(today, komende[0].date),
    };
  })();

  // Opleverdatum al verstreken?
  if (endDate && today > endDate) {
    const overdueDagen = countWorkingDays(endDate, today);
    return {
      status: "overschreden" as PlanningStatus,
      achterstandDagen: overdueDagen,
      volgendeMijlpaal,
      isWeatherDependent,
      projectStart: startDate,
      projectEnd: endDate,
      mijlpalen,
    };
  }

  // Geen datums: niet te berekenen
  if (!startDate || !endDate) {
    return {
      status: "op-schema" as PlanningStatus,
      achterstandDagen: 0,
      volgendeMijlpaal,
      isWeatherDependent,
      projectStart: startDate,
      projectEnd: endDate,
      mijlpalen,
    };
  }

  const totalDagen = countWorkingDays(startDate, endDate);
  const verlopenDagen = countWorkingDays(startDate, today);

  // Verwachte voortgang op basis van verstreken werkdagen
  const verwachtPct = totalDagen > 0 ? (verlopenDagen / totalDagen) * 100 : 0;
  const afwijkingPct = verwachtPct - percentComplete;
  const achterstandDagen =
    totalDagen > 0 ? Math.round((afwijkingPct / 100) * totalDagen) : 0;

  const status: PlanningStatus =
    achterstandDagen > 5
      ? "fors-achter"
      : achterstandDagen > 0
        ? "licht-achter"
        : "op-schema";

  return {
    status,
    achterstandDagen,
    volgendeMijlpaal,
    isWeatherDependent,
    projectStart: startDate,
    projectEnd: endDate,
    mijlpalen,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PlanningTab({ detail, tasks, timesheets, today }: PlanningTabProps) {
  const now = today ?? new Date();
  const planning = computePlanning(detail, tasks, now);
  const werkvoorraad = computeWerkvoorraad(tasks, timesheets, now);

  return (
    <div className="py-4">
      <SituatieStrook
        status={planning.status}
        achterstandDagen={planning.achterstandDagen}
        volgendeMijlpaal={planning.volgendeMijlpaal}
        isWeatherDependent={planning.isWeatherDependent}
        projectStart={planning.projectStart}
        projectEnd={planning.projectEnd}
        today={now}
        mijlpalen={planning.mijlpalen}
      />
      <WerkvoorraadStrook items={werkvoorraad} />
    </div>
  );
}
