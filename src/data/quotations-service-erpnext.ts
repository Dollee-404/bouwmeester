import { fetchList, fetchDocument, updateDocument } from "../bridge";
import type { UnlinkedQuotation } from "./detail-types";
import type { QuotationsService } from "./quotations-service";

interface RawQuotationDoc {
  name: string;
  party_name: string;
  transaction_date: string;
  kbf_meetdatum: string | null;
  kbf_inmeter: string | null;
  kbf_project: string | null;
  items: Array<{ qty: number }>;
}

export const erpnextQuotationsService: QuotationsService = {
  async getUnlinkedQuotations(): Promise<UnlinkedQuotation[]> {
    // kbf_project is a Link field — Frappe blocks it in list queries.
    // Fetch names only, then load each document to check kbf_project.
    const names = await fetchList<{ name: string }>("Quotation", {
      filters: [["kbf_opname", "=", 1]],
      fields: ["name"],
      order_by: "transaction_date desc",
      limit_page_length: 200,
    });

    const docs = await Promise.all(
      names.map((r) => fetchDocument<RawQuotationDoc>("Quotation", r.name))
    );

    return docs
      .filter((q) => !q.kbf_project)
      .map((q): UnlinkedQuotation => ({
        name: q.name,
        customerName: q.party_name,
        transactionDate: new Date(q.transaction_date),
        meetdatum: q.kbf_meetdatum ? new Date(q.kbf_meetdatum) : null,
        inmeter: q.kbf_inmeter ?? null,
        itemCount: q.items?.length ?? 0,
      }));
  },

  async linkQuotationToProject(quotationName: string, projectId: string): Promise<void> {
    await updateDocument("Quotation", quotationName, { kbf_project: projectId });
  },
};
