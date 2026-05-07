import { fetchList, callMethod, INSTANCE_ID } from "../bridge";
import { REQUIRED_CUSTOM_FIELDS, FIELD_NAMES, type CustomFieldSpec } from "./custom-fields-spec";

export async function validateAndUpdateFieldOptions(): Promise<void> {
  if (!INSTANCE_ID) return;

  const selectFields = REQUIRED_CUSTOM_FIELDS.filter(
    (f) => f.fieldtype === "Select" && f.options,
  );

  for (const spec of selectFields) {
    try {
      const result = await callMethod<{ name: string; options: string } | null>(
        "frappe.client.get_value",
        {
          doctype: "Custom Field",
          filters: { dt: spec.dt, fieldname: spec.fieldname },
          fieldname: ["name", "options"],
        },
      );

      const currentOptions = result?.options?.trim() ?? "";
      const specOptions = spec.options?.trim() ?? "";

      if (currentOptions === specOptions) {
        console.log(
          `[bouwmeester] Field ${spec.fieldname} options up to date (${specOptions.split("\n").length} opties)`,
        );
        continue;
      }

      if (!result?.name) {
        console.warn(`[bouwmeester] No document name found for ${spec.fieldname}, skipping update`);
        continue;
      }

      await callMethod("frappe.client.set_value", {
        doctype: "Custom Field",
        name: result.name,
        fieldname: "options",
        value: specOptions,
      });

      console.log(
        `[bouwmeester] Field ${spec.fieldname} options updated: ${currentOptions.split("\n").length}→${specOptions.split("\n").length} opties`,
      );
    } catch (e) {
      console.warn(`[bouwmeester] Could not validate options for ${spec.fieldname}:`, e);
    }
  }
}

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
    const user = await callMethod<string>("frappe.auth.get_logged_user", {});
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
