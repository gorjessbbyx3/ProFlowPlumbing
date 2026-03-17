import React, { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/Layout";
import { Card, Badge } from "@/components/ui";
import { Plus, Trash2, Pencil, X, FileText, Printer, Download, Share2 } from "lucide-react";

type LineItem = { description: string; quantity: number; unitPrice: number; total: number };
type PO = {
  id: number;
  poNumber: string;
  vendor: string;
  status: string;
  items: LineItem[];
  subtotal: string;
  tax: string;
  total: string;
  notes: string | null;
  date: string;
};

type FormState = {
  vendor: string;
  date: string;
  notes: string;
  items: LineItem[];
};

const emptyItem: LineItem = { description: "", quantity: 1, unitPrice: 0, total: 0 };
function todayLocal() {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
const emptyForm: FormState = { vendor: "", date: todayLocal(), notes: "", items: [{ ...emptyItem }] };

export default function PurchaseOrders() {
  const [orders, setOrders] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [viewingPO, setViewingPO] = useState<PO | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/purchase-orders");
      if (!res.ok) throw new Error("Failed to fetch purchase orders");
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      console.error("Failed to fetch purchase orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const updateLineItem = (idx: number, field: keyof LineItem, value: string | number) => {
    const newItems = [...form.items];
    const updated = { ...newItems[idx], [field]: value };
    if (field === "quantity" || field === "unitPrice") {
      updated.total = updated.quantity * updated.unitPrice;
    }
    newItems[idx] = updated;
    setForm({ ...form, items: newItems });
  };

  const addLineItem = () => setForm({ ...form, items: [...form.items, { ...emptyItem }] });
  const removeLineItem = (idx: number) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });

  const subtotal = form.items.reduce((s, i) => s + i.total, 0);
  const tax = subtotal * 0.04712; // Hawaii GET
  const total = subtotal + tax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const poNumber = editingId ? orders.find(o => o.id === editingId)?.poNumber : `PO-${Date.now().toString(36).toUpperCase()}`;
    const payload = {
      poNumber,
      vendor: form.vendor,
      date: form.date,
      notes: form.notes || undefined,
      items: form.items,
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2),
      status: editingId ? (orders.find(o => o.id === editingId)?.status || "draft") : "draft",
    };

    if (editingId) {
      await fetch(`/api/purchase-orders/${editingId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } else {
      await fetch("/api/purchase-orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    fetchOrders();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this PO?")) return;
    await fetch(`/api/purchase-orders/${id}`, { method: "DELETE" });
    fetchOrders();
  };

  const openEdit = (po: PO) => {
    setEditingId(po.id);
    setForm({ vendor: po.vendor, date: po.date, notes: po.notes || "", items: po.items.map((i: LineItem) => ({ ...i })) });
    setShowForm(true);
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<html><head><title>Purchase Order</title><style>
      body { font-family: -apple-system, sans-serif; padding: 40px; color: #1a1a1a; }
      h1 { font-size: 28px; margin-bottom: 4px; }
      .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 3px solid #003087; padding-bottom: 20px; }
      .meta { color: #666; font-size: 14px; }
      .meta strong { color: #333; }
      table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      th { background: #003087; color: white; padding: 10px; text-align: left; font-size: 13px; }
      td { padding: 10px; border-bottom: 1px solid #eee; font-size: 14px; }
      .totals { text-align: right; margin-top: 20px; }
      .totals div { margin: 4px 0; font-size: 14px; }
      .totals .grand { font-size: 20px; font-weight: bold; color: #003087; border-top: 2px solid #003087; padding-top: 8px; margin-top: 8px; }
      .notes { margin-top: 30px; padding: 15px; background: #f8f9fa; border-radius: 8px; font-size: 13px; }
      .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; }
      @media print { body { padding: 20px; } }
    </style></head><body>${content.innerHTML}<div class="footer">ProFlow Plumbing</div></body></html>`);
    win.document.close();
    win.print();
  };

  const handleShare = async () => {
    if (!viewingPO) return;
    const text = `Purchase Order ${viewingPO.poNumber}\nVendor: ${viewingPO.vendor}\nDate: ${viewingPO.date}\nTotal: $${viewingPO.total}\n\nItems:\n${viewingPO.items.map(i => `- ${i.description} x${i.quantity} @ $${i.unitPrice} = $${i.total.toFixed(2)}`).join("\n")}`;
    if (navigator.share) {
      await navigator.share({ title: `PO ${viewingPO.poNumber}`, text });
    } else {
      await navigator.clipboard.writeText(text);
      alert("Copied to clipboard!");
    }
  };

  const statusColor = (s: string) => s === "received" ? "bg-emerald-100 text-emerald-700" : s === "submitted" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600";

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <PageHeader
        title="Purchase Orders"
        description="Create and manage supply orders"
        action={
          <button onClick={() => { setEditingId(null); setForm(emptyForm); setShowForm(true); }} className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition min-h-[44px]">
            <Plus className="w-4 h-4" /> New PO
          </button>
        }
      />

      {/* Form */}
      {showForm && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg">{editingId ? "Edit PO" : "New Purchase Order"}</h3>
            <button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vendor *</label>
                <input type="text" required value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} className="w-full border rounded-lg px-3 py-2" placeholder="e.g. Costco, Home Depot" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </div>
            </div>

            {/* Line Items */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Items</label>
              <div className="space-y-2">
                {form.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      {idx === 0 && <span className="text-xs text-slate-500">Description</span>}
                      <input type="text" required value={item.description} onChange={e => updateLineItem(idx, "description", e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div className="col-span-2">
                      {idx === 0 && <span className="text-xs text-slate-500">Qty</span>}
                      <input type="number" min="1" required value={item.quantity} onChange={e => updateLineItem(idx, "quantity", parseInt(e.target.value) || 0)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div className="col-span-2">
                      {idx === 0 && <span className="text-xs text-slate-500">Price</span>}
                      <input type="number" step="0.01" required value={item.unitPrice || ""} onChange={e => updateLineItem(idx, "unitPrice", parseFloat(e.target.value) || 0)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div className="col-span-2">
                      {idx === 0 && <span className="text-xs text-slate-500">Total</span>}
                      <div className="px-3 py-2 bg-slate-50 border rounded-lg text-sm font-bold text-slate-700">${item.total.toFixed(2)}</div>
                    </div>
                    <div className="col-span-1">
                      {form.items.length > 1 && (
                        <button type="button" onClick={() => removeLineItem(idx)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addLineItem} className="mt-2 text-sm font-bold text-primary hover:underline flex items-center gap-1">
                <Plus className="w-4 h-4" /> Add Line Item
              </button>
            </div>

            {/* Totals */}
            <div className="text-right space-y-1 pt-2 border-t">
              <p className="text-sm text-slate-600">Subtotal: <span className="font-bold">${subtotal.toFixed(2)}</span></p>
              <p className="text-sm text-slate-600">Tax (4.712%): <span className="font-bold">${tax.toFixed(2)}</span></p>
              <p className="text-lg font-black text-primary">Total: ${total.toFixed(2)}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={2} />
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium">Cancel</button>
              <button type="submit" className="bg-primary text-white px-6 py-2.5 rounded-lg font-bold hover:opacity-90">{editingId ? "Update PO" : "Create PO"}</button>
            </div>
          </form>
        </Card>
      )}

      {/* PO List */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading...</div>
      ) : orders.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No purchase orders yet.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {orders.map(po => (
            <Card key={po.id} className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg text-slate-900">{po.poNumber}</h3>
                    <Badge className={statusColor(po.status)}>{po.status}</Badge>
                  </div>
                  <p className="text-sm text-slate-500">{po.vendor} · {po.date} · {po.items.length} items</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-primary">${po.total}</span>
                  <button onClick={() => setViewingPO(po)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg" title="View/Print"><Printer className="w-4 h-4" /></button>
                  <button onClick={() => openEdit(po)} className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(po.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Print Preview Modal */}
      {viewingPO && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewingPO(null)}>
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-6 py-4 rounded-t-3xl flex items-center justify-between z-10">
              <h2 className="font-bold text-lg">Purchase Order Preview</h2>
              <div className="flex gap-2">
                <button onClick={handleShare} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg" title="Share"><Share2 className="w-5 h-5" /></button>
                <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90"><Printer className="w-4 h-4" /> Print / Save PDF</button>
                <button onClick={() => setViewingPO(null)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div ref={printRef} className="p-8">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "30px", borderBottom: "3px solid #003087", paddingBottom: "20px" }}>
                <div>
                  <h1 style={{ fontSize: "28px", fontWeight: "bold", margin: 0 }}>PURCHASE ORDER</h1>
                  <p style={{ color: "#003087", fontWeight: "bold", fontSize: "16px", marginTop: "4px" }}>{viewingPO.poNumber}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontWeight: "bold", fontSize: "18px" }}>ProFlow Plumbing</p>
                  <p style={{ color: "#666", fontSize: "14px" }}>Date: {viewingPO.date}</p>
                  <p style={{ color: "#666", fontSize: "14px" }}>Status: {viewingPO.status}</p>
                </div>
              </div>
              <p style={{ fontSize: "14px", marginBottom: "20px" }}><strong>Vendor:</strong> {viewingPO.vendor}</p>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ background: "#003087", color: "white", padding: "10px", textAlign: "left" }}>Description</th>
                    <th style={{ background: "#003087", color: "white", padding: "10px", textAlign: "center", width: "80px" }}>Qty</th>
                    <th style={{ background: "#003087", color: "white", padding: "10px", textAlign: "right", width: "100px" }}>Unit Price</th>
                    <th style={{ background: "#003087", color: "white", padding: "10px", textAlign: "right", width: "100px" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingPO.items.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: "10px", borderBottom: "1px solid #eee" }}>{item.description}</td>
                      <td style={{ padding: "10px", borderBottom: "1px solid #eee", textAlign: "center" }}>{item.quantity}</td>
                      <td style={{ padding: "10px", borderBottom: "1px solid #eee", textAlign: "right" }}>${item.unitPrice.toFixed(2)}</td>
                      <td style={{ padding: "10px", borderBottom: "1px solid #eee", textAlign: "right", fontWeight: "bold" }}>${item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ textAlign: "right", marginTop: "20px" }}>
                <div style={{ fontSize: "14px", margin: "4px 0" }}>Subtotal: ${viewingPO.subtotal}</div>
                <div style={{ fontSize: "14px", margin: "4px 0" }}>Tax: ${viewingPO.tax}</div>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#003087", borderTop: "2px solid #003087", paddingTop: "8px", marginTop: "8px" }}>Total: ${viewingPO.total}</div>
              </div>
              {viewingPO.notes && (
                <div style={{ marginTop: "30px", padding: "15px", background: "#f8f9fa", borderRadius: "8px", fontSize: "13px" }}>
                  <strong>Notes:</strong> {viewingPO.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
