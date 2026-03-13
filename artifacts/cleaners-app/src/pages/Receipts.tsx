import React, { useState } from "react";
import { useListReceipts, useCreateReceipt, useDeleteReceipt } from "@workspace/api-client-react";
import { getListReceiptsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, Badge } from "@/components/ui";
import { PageHeader } from "@/components/Layout";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2, X, Receipt } from "lucide-react";

export default function Receipts() {
  const queryClient = useQueryClient();
  const { data: receipts, isLoading } = useListReceipts();
  const createReceipt = useCreateReceipt();
  const deleteReceipt = useDeleteReceipt();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ invoiceId: "", amount: "", paymentMethod: "cash", paymentDate: "", notes: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createReceipt.mutate(
      { data: { ...form, invoiceId: form.invoiceId ? parseInt(form.invoiceId) : undefined } as any },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListReceiptsQueryKey() });
          setShowForm(false);
          setForm({ invoiceId: "", amount: "", paymentMethod: "cash", paymentDate: "", notes: "" });
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this receipt?")) {
      deleteReceipt.mutate({ id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListReceiptsQueryKey() }) });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Receipts" subtitle="Track payment receipts" action={<button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-medium hover:opacity-90 transition"><Plus className="w-4 h-4" /> New Receipt</button>} />

      {showForm && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">New Receipt</h3>
            <button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Amount *</label>
              <input type="number" step="0.01" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method *</label>
              <select value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                <option value="cash">Cash</option>
                <option value="check">Check</option>
                <option value="card">Card</option>
                <option value="venmo">Venmo</option>
                <option value="zelle">Zelle</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Payment Date *</label>
              <input type="date" required value={form.paymentDate} onChange={e => setForm({ ...form, paymentDate: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Invoice ID (optional)</label>
              <input type="number" value={form.invoiceId} onChange={e => setForm({ ...form, invoiceId: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={2} />
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:opacity-90">Save Receipt</button>
            </div>
          </form>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading receipts...</div>
      ) : !receipts?.length ? (
        <Card className="p-12 text-center">
          <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No receipts yet. Add your first receipt to start tracking payments.</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {receipts.map((r: any) => (
            <Card key={r.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold">{formatCurrency(r.amount)}</p>
                  <p className="text-sm text-slate-500">{r.paymentDate} &middot; {r.paymentMethod}{r.invoiceId ? ` · Invoice #${r.invoiceId}` : ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {r.notes && <span className="text-sm text-slate-400">{r.notes}</span>}
                <button onClick={() => handleDelete(r.id)} className="text-rose-500 hover:text-rose-700"><Trash2 className="w-4 h-4" /></button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
