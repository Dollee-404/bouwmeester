# yappBridge

postMessage RPC client voor Y-App extensies. Alle ERPNext-calls gaan via dit kanaal — de iframe heeft geen eigen sessie.

## Gebruik

```typescript
import { fetchList, fetchDocument, updateDocument, callMethod, createDocument } from "../bridge";

// Lijst ophalen
const projects = await fetchList<{ name: string; project_name: string }>("Project", {
  fields: ["name", "project_name"],
  filters: [["status", "!=", "Cancelled"]],
  limit_page_length: 100,
});

// Document ophalen
const project = await fetchDocument<{ name: string }>("Project", "PROJ-0001");

// Document updaten
await updateDocument("Project", "PROJ-0001", { custom_bouwmeester_status: "Gegund" });

// Nieuw document aanmaken (workaround via frappe.client.insert)
await createDocument("Project", { project_name: "Nieuw project", status: "Open" });

// Frappe method aanroepen
const result = await callMethod<{ message: string }>("frappe.client.get_value", {
  doctype: "User",
  fieldname: "name",
});
```

## URL-params (bij module load uitgelezen)

| Export | Param | Fallback |
|--------|-------|---------|
| `HOST_ORIGIN` | `?host=` | `"*"` |
| `INSTANCE_ID` | `?instance=` | `""` |
| `ERPNEXT_URL` | `?erpUrl=` | `""` |
| `LANG` | `?lang=` | `"nl"` |

`INSTANCE_ID === ""` betekent: geen Y-App parent aanwezig → gebruik mock-service.
