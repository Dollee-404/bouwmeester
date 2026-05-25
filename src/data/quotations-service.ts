import type { UnlinkedQuotation } from "./detail-types";

export interface QuotationsService {
  /** Haal alle keukenblad-opnames op die nog niet aan een project zijn gekoppeld. */
  getUnlinkedQuotations(): Promise<UnlinkedQuotation[]>;
  /** Sla kbf_project op de Quotation op — koppelt de opname aan het nieuwe project. */
  linkQuotationToProject(quotationName: string, projectId: string): Promise<void>;
}
