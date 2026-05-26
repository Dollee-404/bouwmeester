# Documenten-tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vervang de Documenten-tab placeholder door een read-only bestandenlijst die projectbijlagen toont uit het ERPNext `File` doctype.

**Architecture:** Nieuwe servicelaag-methode `getProjectFiles` volgt hetzelfde patroon als `getProjectQuotations` — interface → ERPNext-implementatie → mock-implementatie → proxy. `DocumentenTab` component laadt de data zelf (lazy, alleen actief bij tab-selectie). Bestandslinks worden opgebouwd als `${ERPNEXT_URL}${fileUrl}` via de al-geëxporteerde constante `ERPNEXT_URL` uit `src/bridge/index.ts` (regel 12: `DEV_ERPNEXT_URL` in dev-direct, `params.get("erpUrl")` in Y-App mode).

**Tech Stack:** React 19, TypeScript 5, Tailwind CSS 4, i18next, lucide-react. Verificatie via `npm run build`. Geen test-framework — visuele verificatie via mock-mode en dev-direct.

---

## Bestandsstructuur

| Bestand | Wijziging |
|---------|-----------|
| `src/data/detail-types.ts` | Voeg `ProjectFile` interface toe |
| `src/data/project-detail-service.ts` | Voeg `getProjectFiles` toe aan interface, exports en proxy |
| `src/data/project-detail-service-erpnext.ts` | Voeg `RawFile` + `getProjectFiles` implementatie toe |
| `src/data/project-detail-service-mock.ts` | Voeg `MOCK_FILES` + `getProjectFiles` implementatie toe |
| `src/components/detail/documenten/DocumentenTab.tsx` | Nieuw — bestandenlijst component |
| `src/i18n/nl.json` | Voeg `documenten` sectie toe |
| `src/i18n/en.json` | Voeg `documenten` sectie toe |
| `src/components/detail/DetailPanel.tsx` | Vervang `documenten` placeholder door `<DocumentenTab>` |

---

## Task 1: Service-laag — ProjectFile type + getProjectFiles in alle lagen

**Files:**
- Modify: `src/data/detail-types.ts`
- Modify: `src/data/project-detail-service.ts`
- Modify: `src/data/project-detail-service-erpnext.ts`
- Modify: `src/data/project-detail-service-mock.ts`

### Doel
Voeg de `ProjectFile` interface toe en implementeer `getProjectFiles` in de interface, ERPNext-service en mock-service. **Alle vier bestanden moeten in één keer bijgewerkt worden** — anders faalt de TypeScript-build omdat de interface een methode vereist die de implementaties nog niet hebben.

- [ ] **Stap 1: Voeg `ProjectFile` toe aan detail-types.ts**

Lees `src/data/detail-types.ts` volledig (115 regels).

Voeg **aan het einde van het bestand** (na regel 115) toe:

```typescript
export interface ProjectFile {
  /** ERPNext File docname (bijv. "FILE-0001") */
  name: string;
  /** Originele bestandsnaam (bijv. "tekening-v2.pdf") */
  fileName: string;
  /** Relatief URL-pad in ERPNext (bijv. "/files/tekening-v2.pdf") */
  fileUrl: string;
  /** Bestandsgrootte in bytes — null als ERPNext het niet registreert */
  fileSize: number | null;
  createdAt: Date;
  isPrivate: boolean;
}
```

- [ ] **Stap 2: Voeg `getProjectFiles` toe aan project-detail-service.ts**

Lees `src/data/project-detail-service.ts` volledig (69 regels).

**Stap 2a:** Voeg `ProjectFile` toe aan de import bovenaan:

Zoek:
```typescript
import type {
  ProjectDetail,
  ProjectTask,
  TimesheetMap,
  ActivityItem,
  ProjectFinancials,
  CreatePhasesResult,
  QuotationItem,
  ProjectQuotation,
} from "./detail-types";
```

Vervang door:
```typescript
import type {
  ProjectDetail,
  ProjectTask,
  TimesheetMap,
  ActivityItem,
  ProjectFinancials,
  CreatePhasesResult,
  QuotationItem,
  ProjectQuotation,
  ProjectFile,
} from "./detail-types";
```

**Stap 2b:** Voeg de methode toe aan de `ProjectDetailService` interface. Zoek:
```typescript
  updateQuotationItemRate(
```
Voeg **daarvóór** in:
```typescript
  /** Haal alle bestandsbijlagen op die aan dit project gekoppeld zijn in ERPNext. */
  getProjectFiles(projectId: string): Promise<ProjectFile[]>;
```

**Stap 2c:** Voeg `ProjectFile` toe aan de re-exports. Zoek:
```typescript
export type {
  ProjectDetail,
  ProjectTask,
  TimesheetMap,
  ActivityItem,
  ProjectFinancials,
  CreatePhasesResult,
  QuotationItem,
  ProjectQuotation,
};
```
Vervang door:
```typescript
export type {
  ProjectDetail,
  ProjectTask,
  TimesheetMap,
  ActivityItem,
  ProjectFinancials,
  CreatePhasesResult,
  QuotationItem,
  ProjectQuotation,
  ProjectFile,
};
```

**Stap 2d:** Voeg de proxy-methode toe aan het `projectDetailService` object. Zoek:
```typescript
  updateQuotationItemRate: async (quotationName, rowName, newRate, allItems) =>
    (await getService()).updateQuotationItemRate(quotationName, rowName, newRate, allItems),
```
Voeg **daarvóór** in:
```typescript
  getProjectFiles: async (projectId) =>
    (await getService()).getProjectFiles(projectId),
```

- [ ] **Stap 3: Voeg `getProjectFiles` toe aan project-detail-service-erpnext.ts**

Lees `src/data/project-detail-service-erpnext.ts` regels 1–20 (imports) en regels 438–497 (einde van het bestand).

**Stap 3a:** Voeg `ProjectFile` toe aan de imports. Zoek:
```typescript
import type {
  ProjectDetail,
  ProjectTeamMember,
  ProjectTask,
  TimesheetMap,
  ActivityItem,
  ProjectFinancials,
  CreatePhasesResult,
  QuotationItem,
  ProjectQuotation,
} from "./detail-types";
```
Vervang door:
```typescript
import type {
  ProjectDetail,
  ProjectTeamMember,
  ProjectTask,
  TimesheetMap,
  ActivityItem,
  ProjectFinancials,
  CreatePhasesResult,
  QuotationItem,
  ProjectQuotation,
  ProjectFile,
} from "./detail-types";
```

**Stap 3b:** Zoek de plek waar de Raw-interfaces staan (na `RawQuotation`) en voeg `RawFile` toe:

```typescript
interface RawFile {
  name: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  creation: string;
  is_private: 0 | 1;
}
```

**Stap 3c:** Voeg `getProjectFiles` toe aan het `erpnextDetailService` object, **vóór** `updateQuotationItemRate`. Zoek:
```typescript
  async updateQuotationItemRate(
```
Voeg **daarvóór** in:
```typescript
  async getProjectFiles(projectId: string): Promise<ProjectFile[]> {
    const files = await fetchList<RawFile>("File", {
      filters: [
        ["attached_to_doctype", "=", "Project"],
        ["attached_to_name", "=", projectId],
      ],
      fields: ["name", "file_name", "file_url", "file_size", "creation", "is_private"],
      order_by: "creation desc",
      limit_page_length: 100,
    });

    return files.map((f): ProjectFile => ({
      name: f.name,
      fileName: f.file_name,
      fileUrl: f.file_url,
      fileSize: f.file_size,
      createdAt: new Date(f.creation),
      isPrivate: f.is_private === 1,
    }));
  },

```

- [ ] **Stap 4: Voeg `getProjectFiles` toe aan project-detail-service-mock.ts**

Lees `src/data/project-detail-service-mock.ts` regels 1–15 (imports) en de laatste 30 regels.

**Stap 4a:** Voeg `ProjectFile` toe aan de imports. Zoek:
```typescript
import type {
  ProjectDetail,
  ProjectTask,
  TimesheetMap,
  ActivityItem,
  ProjectFinancials,
  CreatePhasesResult,
  ProjectQuotation,
} from "./detail-types";
```
Vervang door:
```typescript
import type {
  ProjectDetail,
  ProjectTask,
  TimesheetMap,
  ActivityItem,
  ProjectFinancials,
  CreatePhasesResult,
  ProjectQuotation,
  ProjectFile,
} from "./detail-types";
```

**Stap 4b:** Voeg `MOCK_FILES` toe direct vóór de `export const mockDetailService` declaratie:

```typescript
const MOCK_FILES: Record<string, ProjectFile[]> = {
  "PROJ-0009": [
    {
      name: "FILE-0001",
      fileName: "bestek-renovatie-gemeentehuis.pdf",
      fileUrl: "/files/bestek-renovatie-gemeentehuis.pdf",
      fileSize: 2_451_200,
      createdAt: new Date("2026-02-15T09:00:00"),
      isPrivate: false,
    },
    {
      name: "FILE-0002",
      fileName: "plattegrond-begane-grond.dwg",
      fileUrl: "/files/plattegrond-begane-grond.dwg",
      fileSize: 912_384,
      createdAt: new Date("2026-02-15T09:05:00"),
      isPrivate: false,
    },
    {
      name: "FILE-0003",
      fileName: "veiligheids-en-gezondheidsplan.docx",
      fileUrl: "/files/veiligheids-en-gezondheidsplan.docx",
      fileSize: 148_992,
      createdAt: new Date("2026-03-01T14:30:00"),
      isPrivate: true,
    },
  ],
};
```

**Stap 4c:** Voeg `getProjectFiles` toe aan `mockDetailService`, **vóór** `updateQuotationItemRate`. Zoek:
```typescript
  async updateQuotationItemRate(
```
Voeg **daarvóór** in:
```typescript
  async getProjectFiles(projectId: string): Promise<ProjectFile[]> {
    await new Promise((r) => setTimeout(r, MOCK_DELAY_MS));
    return MOCK_FILES[projectId] ?? [];
  },

```

- [ ] **Stap 5: Controleer dat de build slaagt**

```bash
cd /home/eelke/Documenten/Github/Y-App/bouwmeester
npm run build
```

Verwacht: `✓ built in ...ms` — geen TypeScript-fouten.

- [ ] **Stap 6: Commit**

```bash
git add src/data/detail-types.ts \
        src/data/project-detail-service.ts \
        src/data/project-detail-service-erpnext.ts \
        src/data/project-detail-service-mock.ts
git commit -m "documenten-tab: ProjectFile type + getProjectFiles service-methode"
```

---

## Task 2: DocumentenTab component + i18n

**Files:**
- Create: `src/components/detail/documenten/DocumentenTab.tsx`
- Modify: `src/i18n/nl.json`
- Modify: `src/i18n/en.json`

### Doel
Maak de `DocumentenTab` component die bestanden laadt en toont. Voeg i18n-strings toe voor beide talen.

- [ ] **Stap 1: Voeg i18n-strings toe aan nl.json**

Lees `src/i18n/nl.json`. Het bestand eindigt op:

```json
    }
  }
}
```

Zoek de allerlaatste drie regels en vervang de sluit-`}` van het hele object door:

```json
    }
  },
  "documenten": {
    "title": "Projectbestanden",
    "empty_title": "Geen bestanden gevonden",
    "empty_body": "Voeg bestanden toe aan dit project via ERPNext.",
    "loading": "Bestanden laden…",
    "error": "Bestanden konden niet worden geladen.",
    "download": "Downloaden",
    "private": "Privé"
  }
}
```

- [ ] **Stap 2: Voeg i18n-strings toe aan en.json**

Lees `src/i18n/en.json`. Hetzelfde patroon: vervang de sluit-`}` van het hele JSON-object door:

```json
    }
  },
  "documenten": {
    "title": "Project files",
    "empty_title": "No files found",
    "empty_body": "Add files to this project via ERPNext.",
    "loading": "Loading files…",
    "error": "Failed to load files.",
    "download": "Download",
    "private": "Private"
  }
}
```

- [ ] **Stap 3: Controleer dat de JSON valide is**

```bash
node -e "require('./src/i18n/nl.json'); require('./src/i18n/en.json'); console.log('JSON OK')"
```

Verwacht: `JSON OK`

- [ ] **Stap 4: Maak DocumentenTab.tsx aan**

```bash
mkdir -p /home/eelke/Documenten/Github/Y-App/bouwmeester/src/components/detail/documenten
```

Schrijf `src/components/detail/documenten/DocumentenTab.tsx` met de volgende inhoud:

```typescript
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { File, FileText, Image, Download, Lock } from "lucide-react";
import { projectDetailService } from "../../../data/project-detail-service";
import type { ProjectFile } from "../../../data/detail-types";
import { ERPNEXT_URL } from "../../../bridge";

function getFileIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") {
    return <FileText size={15} className="text-red-400 shrink-0" aria-hidden="true" />;
  }
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) {
    return <Image size={15} className="text-blue-400 shrink-0" aria-hidden="true" />;
  }
  return <File size={15} className="text-slate-400 shrink-0" aria-hidden="true" />;
}

function formatFileSize(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${Math.round(bytes / 1_000)} KB`;
  return `${bytes} B`;
}

interface DocumentenTabProps {
  projectId: string;
}

export function DocumentenTab({ projectId }: DocumentenTabProps) {
  const { t } = useTranslation();
  const [files, setFiles] = useState<ProjectFile[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    projectDetailService
      .getProjectFiles(projectId)
      .then((data) => {
        if (!cancelled) setFiles(data);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("[DocumentenTab] getProjectFiles mislukt:", err);
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [projectId]);

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-slate-400 animate-pulse">
        {t("documenten.loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center text-sm text-red-500">
        {t("documenten.error")}
      </div>
    );
  }

  if (!files || files.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm font-medium text-slate-600">{t("documenten.empty_title")}</p>
        <p className="mt-1 text-xs text-slate-400">{t("documenten.empty_body")}</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-800 mb-3">{t("documenten.title")}</h3>
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 overflow-hidden">
        {files.map((file) => {
          const href = ERPNEXT_URL ? `${ERPNEXT_URL}${file.fileUrl}` : file.fileUrl;
          const size = formatFileSize(file.fileSize);
          const date = file.createdAt.toLocaleDateString("nl-NL");

          return (
            <li
              key={file.name}
              className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-slate-50 transition-colors"
            >
              {getFileIcon(file.fileName)}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{file.fileName}</p>
                <p className="text-xs text-slate-400">
                  {size && `${size} · `}{date}
                </p>
              </div>

              {file.isPrivate && (
                <span
                  className="flex items-center gap-1 text-xs text-slate-400 shrink-0"
                  title={t("documenten.private")}
                >
                  <Lock size={11} aria-hidden="true" />
                  <span className="hidden sm:inline">{t("documenten.private")}</span>
                </span>
              )}

              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${t("documenten.download")} ${file.fileName}`}
                className="shrink-0 p-1.5 rounded text-slate-400 hover:text-y-teal hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-y-teal transition-colors"
              >
                <Download size={14} aria-hidden="true" />
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

- [ ] **Stap 5: Controleer dat de build slaagt**

```bash
npm run build
```

Verwacht: geen fouten. `ERPNEXT_URL` is geëxporteerd uit `src/bridge/index.ts` op regel 12.

- [ ] **Stap 6: Commit**

```bash
git add src/components/detail/documenten/DocumentenTab.tsx \
        src/i18n/nl.json \
        src/i18n/en.json
git commit -m "documenten-tab: DocumentenTab component + i18n strings"
```

---

## Task 3: Wire DocumentenTab into DetailPanel

**Files:**
- Modify: `src/components/detail/DetailPanel.tsx`

### Doel
Vervang de `documenten` placeholder door `<DocumentenTab>`.

- [ ] **Stap 1: Lees de relevante secties van DetailPanel.tsx**

Lees regels 1–18 (imports) en regels 225–265 (tab-routing).

- [ ] **Stap 2: Voeg import toe**

Zoek:
```typescript
import { CalculatieTab } from "./calculatie/CalculatieTab";
```

Vervang door:
```typescript
import { CalculatieTab } from "./calculatie/CalculatieTab";
import { DocumentenTab } from "./documenten/DocumentenTab";
```

- [ ] **Stap 3: Voeg documenten-case toe**

De tab-routing eindigt in een else-tak. Zoek exact:

```tsx
              ) : (
                <div className="py-12 text-center text-sm text-slate-400">
                  {t("tab.not_available")}
                </div>
              )}
```

Vervang door:

```tsx
              ) : activeTab === "documenten" ? (
                <DocumentenTab projectId={detail!.id} />
              ) : (
                <div className="py-12 text-center text-sm text-slate-400">
                  {t("tab.not_available")}
                </div>
              )}
```

- [ ] **Stap 4: Controleer dat de build slaagt**

```bash
npm run build
```

Verwacht: geen fouten.

- [ ] **Stap 5: Commit**

```bash
git add src/components/detail/DetailPanel.tsx
git commit -m "documenten-tab: wire DocumentenTab in DetailPanel"
```

**STOP: Eelke opent een project (PROJ-0009 in mock-mode), klikt op Documenten, en ziet 3 bestanden: een PDF, een DWG en een DOCX (met privé-markering). Eelke opent ook een ander project en ziet de lege staat. Eelke verifieert downloadknop en hover-state.**

---

## Spec coverage controle

| Vereiste | Taak |
|----------|------|
| Documenten-tab vervangt placeholder | Task 3 |
| Bestandsnaam, grootte, datum | Task 2 (`file.fileName`, `formatFileSize`, `toLocaleDateString`) |
| Download-link per bestand | Task 2 (`<a href={href} target="_blank">`) |
| Links werken in dev-direct EN Y-App mode | Task 2 (`ERPNEXT_URL` uit bridge) |
| Privé-bestanden gemarkeerd | Task 2 (`Lock` icon + label) |
| Bestandstypeicoontje (PDF / afbeelding / generiek) | Task 2 (`getFileIcon`) |
| Loading-staat | Task 2 (animate-pulse) |
| Error-staat | Task 2 (rode foutmelding) |
| Lege staat | Task 2 (empty-state) |
| ERPNext `File` doctype implementatie | Task 1 (`fetchList("File", ...)`) |
| Mock voor lokaal testen | Task 1 (`MOCK_FILES` voor PROJ-0009) |
| i18n nl + en | Task 2 |
