import React, { useState } from "react";
import { useListExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense } from "@workspace/api-client-react";
import { getListExpensesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, Badge } from "@/components/ui";
import { PageHeader } from "@/components/Layout";
import { formatCurrency, getStatusColor } from "@/lib/utils";
import { Plus, Trash2, X, DollarSign, Pencil } from "lucide-react";

const CATEGORIES = ["Supplies", "Fuel", "Equipment", "Insurance", "Marketing", "Vehicle", "Office", "Other"];

export default function Expenses() {
  const queryClient = useQueryClient();
  const [filterCategory, setFilterCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { data: expenses, isLoading } = useListExpenses({ category: filterCategory || undefined, startDate: startDate || undefined, endDate: endDate || undefined });
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: "Supplies", description: "", amount: "", date: "", vendor: "", notes: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createExpense.mutate(
      { data: form },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
          setShowForm(false);
          setForm({ category: "Supplies", description: "", amount: "", date: "", vendor: "", notes: "" });
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this expense?")) {
      deleteExpense.mutate({ id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() }) });
    }
  };

  const totalExpenses = expenses?.reduce((sum: number, e: any) => sum + parseFloat(e.amount || "0"), 0) || 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Expenses" subtitle={`Total: ${formatCurrency(totalExpenses)}`} action={<button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-medium hover:opacity-90 transition"><Plus className="w-4 h-4" /> New Expense</button>} />

      <div className="flex flex-wrap gap-3">
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" placeholder="Start Date" />
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" placeholder="End Date" />
      </div>

      {showForm && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">New Expense</h3>
            <button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Amount *</label>
              <input type="number" step="0.01" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
              <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vendor</label>
              <input type="text" value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
              <input type="text" required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={2} />
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:opacity-90">Save Expense</button>
            </div>
          </form>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading expenses...</div>
      ) : !expenses?.length ? (
        <Card className="p-12 text-center">
          <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No expenses recorded yet.</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {expenses.map((e: any) => (
            <Card key={e.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <p className="font-semibold">{e.description}</p>
                  <p className="text-sm text-slate-500">{e.date} &middot; {e.vendor || "No vendor"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={getStatusColor(e.category)}>{e.category}</Badge>
                <span className="font-semibold text-rose-600">{formatCurrency(e.amount)}</span>
                <button onClick={() => handleDelete(e.id)} className="text-rose-500 hover:text-rose-700"><Trash2 className="w-4 h-4" /></button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
