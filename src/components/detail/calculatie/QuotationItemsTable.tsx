import { useState } from "react";
import { Check, X, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { QuotationItem } from "../../../data/detail-types";

interface QuotationItemsTableProps {
  quotationName: string;
  items: QuotationItem[];
  onSaveRate: (rowName: string, newRate: number) => Promise<void>;
}

function formatEuro(value: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatQty(qty: number, uom: string): string {
  if (uom === "Square Meter") return `${qty.toFixed(3)} m²`;
  if (uom === "Meter") return `${qty.toFixed(2)} m`;
  return `${qty} st`;
}

export function QuotationItemsTable({ items, onSaveRate }: QuotationItemsTableProps) {
  const { t } = useTranslation();
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingRow, setSavingRow] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  function startEdit(item: QuotationItem) {
    setEditingRow(item.rowName);
    setEditValue(item.rate === 0 ? "" : String(item.rate).replace(".", ","));
    setSaveError(null);
  }

  function cancelEdit() {
    setEditingRow(null);
    setEditValue("");
    setSaveError(null);
  }

  async function commitEdit(item: QuotationItem) {
    const parsed = parseFloat(editValue.replace(",", "."));
    if (isNaN(parsed) || parsed < 0) {
      setSaveError(t("calculatie.save_error"));
      return;
    }
    setSavingRow(item.rowName);
    setSaveError(null);
    try {
      await onSaveRate(item.rowName, parsed);
      setEditingRow(null);
    } catch {
      setSaveError(t("calculatie.save_error"));
    } finally {
      setSavingRow(null);
    }
  }

  const grandTotal = items.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
            <th className="pb-2 pr-4 w-36">{t("calculatie.table.code")}</th>
            <th className="pb-2 pr-4">{t("calculatie.table.omschrijving")}</th>
            <th className="pb-2 pr-4 text-right w-24">{t("calculatie.table.aantal")}</th>
            <th className="pb-2 pr-4 text-right w-28">{t("calculatie.table.prijs")}</th>
            <th className="pb-2 text-right w-28">{t("calculatie.table.totaal")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => {
            const isEditing = editingRow === item.rowName;
            const isSaving = savingRow === item.rowName;

            return (
              <tr key={item.rowName} className="group align-top">
                <td className="py-2.5 pr-4 text-xs text-slate-400 font-mono leading-relaxed">
                  {item.itemCode}
                </td>
                <td className="py-2.5 pr-4">
                  <div className="font-medium text-slate-700">{item.itemName}</div>
                  {item.description && (
                    <div className="mt-0.5 text-xs text-slate-400 whitespace-pre-line leading-snug">
                      {item.description}
                    </div>
                  )}
                </td>
                <td className="py-2.5 pr-4 text-right text-slate-600 whitespace-nowrap">
                  {formatQty(item.qty, item.uom)}
                </td>
                <td className="py-2.5 pr-4 text-right">
                  {isEditing ? (
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-slate-400 text-xs">€</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit(item);
                          if (e.key === "Escape") cancelEdit();
                        }}
                        autoFocus
                        className="w-20 text-right border border-y-teal rounded px-1.5 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-y-teal"
                        placeholder="0,00"
                      />
                      <button
                        onClick={() => commitEdit(item)}
                        disabled={isSaving}
                        className="p-0.5 text-y-teal hover:text-teal-700 disabled:opacity-40"
                        aria-label="Opslaan"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={isSaving}
                        className="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-40"
                        aria-label="Annuleer"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(item)}
                      className="flex items-center justify-end gap-1.5 w-full text-right group/price"
                      aria-label={`Prijs bewerken voor ${item.itemName}`}
                    >
                      <span className={item.rate === 0 ? "text-slate-300" : "text-slate-700"}>
                        {formatEuro(item.rate)}
                      </span>
                      <Pencil
                        size={11}
                        className="text-slate-300 group-hover/price:text-y-teal opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-hidden
                      />
                    </button>
                  )}
                </td>
                <td className="py-2.5 text-right font-medium whitespace-nowrap">
                  {item.amount > 0 ? (
                    <span className="text-slate-700">{formatEuro(item.amount)}</span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
        {items.length > 0 && (
          <tfoot>
            <tr className="border-t-2 border-slate-200">
              <td colSpan={4} className="pt-2.5 pr-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Totaal
              </td>
              <td className="pt-2.5 text-right font-semibold text-slate-800">
                {formatEuro(grandTotal)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
      {saveError && (
        <p className="mt-2 text-xs text-red-600">{saveError}</p>
      )}
    </div>
  );
}
