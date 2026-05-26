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
    // DEPRECATED (RONDE 5C) — wordt verwijderd in RONDE 6+.
    // Alleen nog lezen als fallback wanneer project_type leeg is.
    // Primaire bron is nu het standaard ERPNext-veld project_type (Link → Project Type).
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
  {
    dt: "Project",
    fieldname: "custom_project_manager",
    label: "Projectleider",
    fieldtype: "Link",
    options: "User",
    insert_after: "custom_weersafhankelijk",
  },
  {
    dt: "Project",
    fieldname: "custom_address",
    label: "Adres",
    fieldtype: "Small Text",
    insert_after: "custom_project_manager",
  },
  {
    dt: "Project User",
    fieldname: "custom_role",
    label: "Rol",
    fieldtype: "Select",
    options: "projectleider\nuitvoerder\nwerkvoorbereider\ncalculator\nanders",
    insert_after: "user",
  },
  {
    dt: "Sales Order",
    fieldname: "custom_is_meerwerk",
    label: "Is meerwerk",
    fieldtype: "Check",
    default: "0",
    insert_after: "customer",
  },
  {
    // Koppelt een keukenblad-offerte aan het Bouwmeester-project dat via
    // DoordrukkenWizard is aangemaakt. Gezet door quotationsService.linkQuotationToProject().
    dt: "Quotation",
    fieldname: "kbf_project",
    label: "Bouwmeester Project",
    fieldtype: "Link",
    options: "Project",
    insert_after: "customer_address",
  },
  {
    dt: "Task",
    fieldname: "custom_wacht_op",
    label: "Wacht op",
    fieldtype: "Select",
    options: "\nVoorgaande taak\nWeer\nVergunning of keuring\nOnderaannemer\nMateriaal\nAnders",
    insert_after: "status",
  },
  {
    dt: "Task",
    fieldname: "custom_wacht_op_toelichting",
    label: "Wacht op (toelichting)",
    fieldtype: "Small Text",
    insert_after: "custom_wacht_op",
  },
];

export const FIELD_NAMES = REQUIRED_CUSTOM_FIELDS.map((f) => f.fieldname);
