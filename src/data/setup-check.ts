import { fetchList, callMethod, INSTANCE_ID } from "../bridge";
import { REQUIRED_CUSTOM_FIELDS, FIELD_NAMES, type CustomFieldSpec } from "./custom-fields-spec";

export interface SetupCheckResult {
  complete: boolean;
  missing: CustomFieldSpec[];
}

const urlParams = new URLSearchParams(window.location.search);

/** ?mock=wizard — forceert wizard lokaal met alle 4 velden als ontbrekend */
export const MOCK_WIZARD = urlParams.get("mock") === "wizard";

/** ?mock=noperm — forceert no-permission scherm (niet-System Manager) */
export const MOCK_NO_PERM = urlParams.get("mock") === "noperm";

export async function checkRequiredFields(): Promise<SetupCheckResult> {
  if (MOCK_WIZARD) return { complete: false, missing: [...REQUIRED_CUSTOM_FIELDS] };
  // Dev mode: geen Y-App parent, sla setup over
  if (!INSTANCE_ID) return { complete: true, missing: [] };

  console.time("[bouwmeester] checkRequiredFields");
  const existing = await fetchList<{ fieldname: string }>("Custom Field", {
    fields: ["fieldname"],
    filters: [
      ["dt", "=", "Project"],
      ["fieldname", "in", FIELD_NAMES],
    ],
    limit_page_length: 10,
  });

  console.timeEnd("[bouwmeester] checkRequiredFields");
  const existingNames = new Set(existing.map((f) => f.fieldname));
  const missing = REQUIRED_CUSTOM_FIELDS.filter((f) => !existingNames.has(f.fieldname));
  return { complete: missing.length === 0, missing };
}

export async function isSystemManager(): Promise<boolean> {
  if (MOCK_NO_PERM) return false;
  try {
    const userResult = await callMethod<{ message: string }>(
      "frappe.client.get_value",
      { doctype: "User", filters: { name: ["like", "%"] }, fieldname: "name" },
    );
    const user = userResult?.message;
    if (!user) return false;

    const roles = await fetchList<{ name: string }>("Has Role", {
      fields: ["name"],
      filters: [
        ["parent", "=", user],
        ["role", "=", "System Manager"],
      ],
      limit_page_length: 1,
    });
    return roles.length > 0;
  } catch {
    return false;
  }
}

export async function installCustomFields(
  specs: CustomFieldSpec[],
  onProgress?: (fieldname: string) => void,
): Promise<void> {
  for (const spec of specs) {
    if (MOCK_WIZARD) {
      await new Promise((r) => setTimeout(r, 600));
    } else {
      await callMethod("frappe.client.insert", {
        doc: { doctype: "Custom Field", ...spec },
      });
    }
    onProgress?.(spec.fieldname);
  }
}

export function downloadFieldsJson(specs: CustomFieldSpec[]): void {
  const fixtures = specs.map((spec) => ({
    doctype: "Custom Field",
    ...spec,
  }));
  const blob = new Blob([JSON.stringify(fixtures, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "bouwmeester-custom-fields.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
