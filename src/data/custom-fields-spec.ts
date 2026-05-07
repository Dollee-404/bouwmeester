export interface CustomFieldSpec {
  dt: string;
  fieldname: string;
  label: string;
  fieldtype: string;
  options?: string;
  insert_after?: string;
  default?: string;
}

export const REQUIRED_CUSTOM_FIELDS: CustomFieldSpec[] = [
  {
    dt: "Project",
    fieldname: "custom_bouwmeester_status",
    label: "Bouwmeester Status",
    fieldtype: "Select",
    options: "Lead\nCalculatie\nGegund\nIn uitvoering\nOplevering\nAfgerond\nVerloren\nGeannuleerd",
    insert_after: "status",
    default: "Lead",
  },
  {
    dt: "Project",
    fieldname: "custom_werksoort",
    label: "Werksoort",
    fieldtype: "Select",
    options: "\nRenovatie\nNieuwbouw\nSloop\nVerbouw\nOnderhoud",
    insert_after: "custom_bouwmeester_status",
  },
  {
    dt: "Project",
    fieldname: "custom_budget_hours",
    label: "Budget uren",
    fieldtype: "Float",
    insert_after: "estimated_costing",
  },
  {
    dt: "Project",
    fieldname: "custom_weersafhankelijk",
    label: "Weersafhankelijk",
    fieldtype: "Check",
    insert_after: "custom_werksoort",
  },
];

export const FIELD_NAMES = REQUIRED_CUSTOM_FIELDS.map((f) => f.fieldname);
