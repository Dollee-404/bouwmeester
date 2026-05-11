import { fetchList, fetchAll, callMethod, INSTANCE_ID } from "../bridge";
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

/** ?mock=wizard — forceert wizard lokaal met alle velden als ontbrekend */
export const MOCK_WIZARD = urlParams.get("mock") === "wizard";

/** ?mock=noperm — forceert no-permission scherm (niet-System Manager) */
export const MOCK_NO_PERM = urlParams.get("mock") === "noperm";

/** ?mock=migration — toont migratiescherm met voorbeelddata (dev only) */
export const MOCK_MIGRATION = urlParams.get("mock") === "migration";

export async function checkRequiredFields(): Promise<SetupCheckResult> {
  if (MOCK_WIZARD) return { complete: false, missing: [...REQUIRED_CUSTOM_FIELDS] };
  // Dev mode: geen Y-App parent, sla setup over
  if (!INSTANCE_ID) return { complete: true, missing: [] };

  console.time("[bouwmeester] checkRequiredFields");
  const existing = await fetchList<{ fieldname: string }>("Custom Field", {
    fields: ["fieldname"],
    filters: [
      ["dt", "in", [...new Set(REQUIRED_CUSTOM_FIELDS.map((f) => f.dt))]],
      ["fieldname", "in", FIELD_NAMES],
    ],
    limit_page_length: 20,
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

export interface MigrationResult {
  migrated: number;
  addressWarnings: string[];
}

export async function runProjectManagerMigration(): Promise<{ migrated: number }> {
  if (!INSTANCE_ID) return { migrated: 0 };

  const projects = await fetchAll<{
    name: string;
    custom_project_manager: string;
  }>("Project", ["name", "custom_project_manager"], [
    ["custom_project_manager", "!=", ""],
  ]);

  let migrated = 0;
  for (const project of projects) {
    if (!project.custom_project_manager) continue;

    const existing = await fetchList<{ name: string }>("Project User", {
      fields: ["name"],
      filters: [
        ["parent", "=", project.name],
        ["user", "=", project.custom_project_manager],
      ],
      limit_page_length: 1,
    });

    if (existing.length > 0) continue;

    try {
      await callMethod("frappe.client.insert", {
        doc: {
          doctype: "Project User",
          parent: project.name,
          parenttype: "Project",
          parentfield: "users",
          user: project.custom_project_manager,
          custom_role: "projectleider",
          // Voorkomt dat ERPNext probeert een welkomstmail te sturen
          welcome_email_sent: 1,
        },
      });
      migrated++;
    } catch (e) {
      console.warn(`[bouwmeester] Migratie mislukt voor ${project.name}:`, e);
    }
  }

  return { migrated };
}

export async function checkAddressWarnings(): Promise<string[]> {
  if (!INSTANCE_ID) return [];

  const projects = await fetchAll<{
    project_name: string;
    custom_address: string;
    customer: string;
  }>("Project", ["project_name", "custom_address", "customer"], [
    ["custom_address", "!=", ""],
  ]);

  const warnings: string[] = [];
  for (const project of projects) {
    if (!project.customer) continue;
    try {
      const result = await callMethod<{ customer_primary_address: string | null }>(
        "frappe.client.get_value",
        {
          doctype: "Customer",
          filters: { name: project.customer },
          fieldname: ["customer_primary_address"],
        },
      );
      if (!result?.customer_primary_address) {
        warnings.push(project.project_name);
      }
    } catch {
      // negeer — adreswaarschuwing is informatief, blokkeert niet
    }
  }
  return warnings;
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
