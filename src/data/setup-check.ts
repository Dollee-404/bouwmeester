import { fetchList, callMethod, INSTANCE_ID } from "../bridge";
import { REQUIRED_CUSTOM_FIELDS, FIELD_NAMES, type CustomFieldSpec } from "./custom-fields-spec";

export interface SetupCheckResult {
  complete: boolean;
  missing: CustomFieldSpec[];
}

export async function checkRequiredFields(): Promise<SetupCheckResult> {
  // Dev mode: geen Y-App parent, sla setup over
  if (!INSTANCE_ID) return { complete: true, missing: [] };

  const existing = await fetchList<{ fieldname: string }>("Custom Field", {
    fields: ["fieldname"],
    filters: [
      ["dt", "=", "Project"],
      ["fieldname", "in", FIELD_NAMES],
    ],
    limit_page_length: 10,
  });

  const existingNames = new Set(existing.map((f) => f.fieldname));
  const missing = REQUIRED_CUSTOM_FIELDS.filter((f) => !existingNames.has(f.fieldname));
  return { complete: missing.length === 0, missing };
}

export async function isSystemManager(): Promise<boolean> {
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
    await callMethod("frappe.client.insert", {
      doc: { doctype: "Custom Field", ...spec },
    });
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
