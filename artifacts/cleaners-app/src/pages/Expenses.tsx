import React, { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, Badge } from "@/components/ui";
import { PageHeader } from "@/components/Layout";
import { formatCurrency, getStatusColor } from "@/lib/utils";
import { Plus, Trash2, X, DollarSign, Pencil, Camera, Image, Receipt } from "lucide-react";

const CATEGORIES = ["Supplies", "Fuel", "Equipment", "Insurance", "Marketing", "Vehicle", "Office", "Other"];

interface ExpenseItem {
  id: number; category: string; description: string; amount: string; date: string;
  vendor: string | null; notes: string | null; receiptImage: string | null;
  createdAt: string; updatedAt: string;
}

type FormState = { category: string; description: string; amount: string; date: string; vendor: string; notes: string };
const emptyForm: FormState = { category: "Supplies", description: "", amount: "", date: "", vendor: "", notes: "" };

export default function Expenses() {
  const queryClient = useQueryClient();
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [viewImage, setViewImage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Fetch expenses
  const fetchExpenses = async () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (filterCategory) params.set("category", filterCategory);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    const qs = params.toString();
    const res = await fetch(`/api/expenses${qs ? "?" + qs : ""}`);
    const data = await res.json();
    setExpenses(data);
    setIsLoading(false);
  };

  React.useEffect(() => { fetchExpenses(); }, [filterCategory, startDate, endDate]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, date: new Date().toISOString().split("T")[0] });
    setReceiptFile(null);
    setReceiptPreview(null);
    setShowForm(true);
  };

  const openEdit = (e: ExpenseItem) => {
    setEditingId(e.id);
    setForm({ category: e.category, description: e.description, amount: e.amount, date: e.date, vendor: e.vendor ?? "", notes: e.notes ?? "" });
    setReceiptFile(null);
    setReceiptPreview(e.receiptImage || null);
    setShowForm(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onload = () => setReceiptPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("category", form.category);
    fd.append("description", form.description);
    fd.append("amount", form.amount);
    fd.append("date", form.date);
    if (form.vendor) fd.append("vendor", form.vendor);
    if (form.notes) fd.append("notes", form.notes);
    if (receiptFile) fd.append("receiptImage", receiptFile);

    if (editingId) {
      await fetch(`/api/expenses/${editingId}`, { method: "PATCH", body: fd });
    } else {
      await fetch("/api/expenses", { method: "POST", body: fd });
    }

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setReceiptFile(null);
    setReceiptPreview(null);
    fetchExpenses();
  };

  const handleDelete = async (id: number) => {
    if (confirm("Delete this expense?")) {
      await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      fetchExpenses();
    }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        subtitle={`Total: ${formatCurrency(totalExpenses)}`}
        action={
          <button onClick={openCreate} className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition min-h-[44px]">
            <Plus className="w-4 h-4" /> New Expense
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="border rounded-xl px-3 py-2.5 text-sm font-medium bg-white min-h-[44px]">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border rounded-xl px-3 py-2.5 text-sm bg-white min-h-[44px]" />
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border rounded-xl px-3 py-2.5 text-sm bg-white min-h-[44px]" />
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-bold text-lg">{editingId ? "Edit Expense" : "New Expense"}</h3>
            <button onClick={() => { setShowForm(false); setEditingId(null); setReceiptFile(null); setReceiptPreview(null); }}><X className="w-5 h-5 text-slate-400" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Category *</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full border rounded-xl px-3 py-2.5">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Amount *</label>
                <input type="number" step="0.01" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="w-full border rounded-xl px-3 py-2.5" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Date *</label>
                <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full border rounded-xl px-3 py-2.5" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Vendor</label>
                <input type="text" value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} className="w-full border rounded-xl px-3 py-2.5" placeholder="Store name" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Description *</label>
                <input type="text" required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border rounded-xl px-3 py-2.5" placeholder="What was purchased" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full border rounded-xl px-3 py-2.5" rows={2} />
              </div>
            </div>

            {/* Receipt Upload */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Receipt Photo</label>
              <div className="flex flex-wrap gap-3 items-start">
                {receiptPreview ? (
                  <div className="relative">
                    <img src={receiptPreview} alt="Receipt" className="w-28 h-36 object-cover rounded-xl border-2 border-primary/20 shadow-sm cursor-pointer" onClick={() => setViewImage(receiptPreview)} />
                    <button
                      type="button"
                      onClick={() => { setReceiptFile(null); setReceiptPreview(null); }}
                      className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : null}
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => { if (fileRef.current) { fileRef.current.setAttribute("capture", "environment"); fileRef.current.click(); } }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 rounded-xl text-sm font-bold hover:bg-amber-100 transition min-h-[44px]"
                  >
                    <Camera className="w-4 h-4" /> Take Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (fileRef.current) { fileRef.current.removeAttribute("capture"); fileRef.current.click(); } }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-xl text-sm font-bold hover:bg-blue-100 transition min-h-[44px]"
                  >
                    <Image className="w-4 h-4" /> Upload Image
                  </button>
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </div>
            </div>

            <div className="pt-2">
              <button type="submit" className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:opacity-90 min-h-[44px]">
                {editingId ? "Update Expense" : "Save Expense"}
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Expense List */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading expenses...</div>
      ) : !expenses?.length ? (
        <Card className="p-12 text-center">
          <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No expenses recorded yet.</p>
          <button onClick={openCreate} className="mt-3 text-primary font-bold text-sm hover:underline">Add your first expense</button>
        </Card>
      ) : (
        <div className="grid gap-3">
          {expenses.map((e) => (
            <Card key={e.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {e.receiptImage ? (
                    <img
                      src={e.receiptImage}
                      alt="Receipt"
                      className="w-12 h-14 object-cover rounded-lg border border-slate-200 shrink-0 cursor-pointer hover:opacity-80 transition"
                      onClick={() => setViewImage(e.receiptImage)}
                    />
                  ) : (
                    <div className="w-12 h-14 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <Receipt className="w-5 h-5 text-slate-300" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{e.description}</p>
                    <p className="text-sm text-slate-500">{e.date} · {e.vendor || "No vendor"}</p>
                    {e.notes && <p className="text-xs text-slate-400 mt-0.5 truncate">{e.notes}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={getStatusColor(e.category)}>{e.category}</Badge>
                  <span className="font-bold text-rose-600 text-sm whitespace-nowrap">{formatCurrency(e.amount)}</span>
                  <button onClick={() => openEdit(e)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(e.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Full-size image viewer */}
      {viewImage && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={() => setViewImage(null)}>
          <img src={viewImage} alt="Receipt" className="max-w-full max-h-full object-contain rounded-lg" />
          <button onClick={() => setViewImage(null)} className="absolute top-4 right-4 p-2 bg-white/20 rounded-full text-white hover:bg-white/30">
            <X className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
}
