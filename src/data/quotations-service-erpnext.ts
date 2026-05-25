import { fetchList, updateDocument } from "../bridge";
import type { UnlinkedQuotation } from "./detail-types";
import type { QuotationsService } from "./quotations-service";

interface RawQuotation {
  name: string;
  party_name: string;
  transaction_date: string;   // "YYYY-MM-DD"
  kbf_meetdatum: string | null;
  kbf_inmeter: string | null;
  kbf_project: string | null;
  total_qty: number | null;   // proxy voor regelaantal
}

export const erpnextQuotationsService: QuotationsService = {
  async getUnlinkedQuotations(): Promise<UnlinkedQuotation[]> {
    const all = await fetchList<RawQuotation>("Quotation", {
      filters: [["kbf_opname", "=", 1]],
      fields: [
        "name",
        "party_name",
        "transaction_date",
        "kbf_meetdatum",
        "kbf_inmeter",
        "kbf_project",
        "total_qty",
      ],
      order_by: "transaction_date desc",
      limit_page_length: 200,
    });

    // Filter client-side: alleen opnames zonder project-koppeling
    return all
      .filter((q) => !q.kbf_project)
      .map((q): UnlinkedQuotation => ({
        name: q.name,
        customerName: q.party_name,
        transactionDate: new Date(q.transaction_date),
        meetdatum: q.kbf_meetdatum ? new Date(q.kbf_meetdatum) : null,
        inmeter: q.kbf_inmeter ?? null,
        itemCount: Math.round(q.total_qty ?? 0),
      }));
  },

  async linkQuotationToProject(quotationName: string, projectId: string): Promise<void> {
    await updateDocument("Quotation", quotationName, { kbf_project: projectId });
  },
};
