import type { UnlinkedQuotation } from "./detail-types";
import type { QuotationsService } from "./quotations-service";

const MOCK_UNLINKED: UnlinkedQuotation[] = [
  {
    name: "QTN-MOCK-001",
    customerName: "Papendrecht Vastgoed BV",
    transactionDate: new Date("2026-05-20"),
    meetdatum: new Date("2026-05-18"),
    inmeter: "J. de Vries",
    itemCount: 7,
  },
  {
    name: "QTN-MOCK-002",
    customerName: "Eelke Dollee",
    transactionDate: new Date("2026-05-22"),
    meetdatum: new Date("2026-05-21"),
    inmeter: "R. Bakker",
    itemCount: 4,
  },
];

// In-memory koppeling per sessie (mock only)
const linked = new Set<string>();

export const mockQuotationsService: QuotationsService = {
  async getUnlinkedQuotations(): Promise<UnlinkedQuotation[]> {
    await new Promise((r) => setTimeout(r, 200));
    return MOCK_UNLINKED.filter((q) => !linked.has(q.name));
  },

  async linkQuotationToProject(quotationName: string): Promise<void> {
    await new Promise((r) => setTimeout(r, 300));
    linked.add(quotationName);
  },
};
