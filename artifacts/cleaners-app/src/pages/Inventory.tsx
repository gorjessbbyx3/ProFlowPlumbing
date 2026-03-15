import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/Layout";
import { Card, Badge } from "@/components/ui";
import { Plus, Trash2, Pencil, X, Package, AlertTriangle, SprayCan, Wrench, Bath } from "lucide-react";

type InventoryItem = {
  id: number;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minStock: number | null;
  cost: string | null;
  supplier: string | null;
  notes: string | null;
};

const CATEGORIES = [
  { value: "cleaning_supplies", label: "Cleaning Supplies", icon: SprayCan, color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "cleaning_tools", label: "Cleaning Tools", icon: Wrench, color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "toiletries", label: "Toiletries", icon: Bath, color: "bg-pink-100 text-pink-700 border-pink-200" },
];

const UNITS = ["units", "bottles", "boxes", "rolls", "packs", "bags", "gallons", "cans", "pairs"];

type FormState = { name: string; category: string; quantity: string; unit: string; minStock: string; cost: string; supplier: string; notes: string };
const emptyForm: FormState = { name: "", category: "cleaning_supplies", quantity: "0", unit: "units", minStock: "5", cost: "", supplier: "", notes: "" };

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [filter, setFilter] = useState("");

  const fetchItems = async () => {
    try {
      const res = await fetch("/api/inventory");
      if (!res.ok) throw new Error("Failed to fetch inventory");
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error("Failed to fetch inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      category: form.category,
      quantity: parseInt(form.quantity),
      unit: form.unit,
      minStock: parseInt(form.minStock) || 0,
      cost: form.cost || undefined,
      supplier: form.supplier || undefined,
      notes: form.notes || undefined,
    };

    if (editingId) {
      await fetch(`/api/inventory/${editingId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } else {
      await fetch("/api/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    fetchItems();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this item?")) return;
    await fetch(`/api/inventory/${id}`, { method: "DELETE" });
    fetchItems();
  };

  const openEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      category: item.category,
      quantity: item.quantity.toString(),
      unit: item.unit,
      minStock: (item.minStock || 0).toString(),
      cost: item.cost || "",
      supplier: item.supplier || "",
      notes: item.notes || "",
    });
    setShowForm(true);
  };

  const quickAdjust = async (id: number, delta: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const newQty = Math.max(0, item.quantity + delta);
    await fetch(`/api/inventory/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quantity: newQty }) });
    fetchItems();
  };

  const filtered = filter ? items.filter(i => i.category === filter) : items;
  const lowStock = items.filter(i => i.minStock && i.quantity <= i.minStock);
  const getCat = (val: string) => CATEGORIES.find(c => c.value === val);

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <PageHeader
        title="Inventory"
        description={`${items.length} items tracked${lowStock.length > 0 ? ` · ${lowStock.length} low stock` : ""}`}
        action={
          <button onClick={() => { setEditingId(null); setForm(emptyForm); setShowForm(true); }} className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition min-h-[44px]">
            <Plus className="w-4 h-4" /> Add Item
          </button>
        }
      />

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-amber-800">Low Stock Alert</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStock.map(item => (
              <span key={item.id} className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
                {item.name} ({item.quantity} {item.unit})
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Category Filters */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilter("")} className={`px-4 py-2 rounded-xl text-sm font-bold transition ${!filter ? "bg-primary text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
          All ({items.length})
        </button>
        {CATEGORIES.map(cat => {
          const count = items.filter(i => i.category === cat.value).length;
          return (
            <button key={cat.value} onClick={() => setFilter(cat.value)} className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-1.5 ${filter === cat.value ? "bg-primary text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              <cat.icon className="w-4 h-4" /> {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Form */}
      {showForm && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg">{editingId ? "Edit Item" : "Add Item"}</h3>
            <button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Item Name *</label>
              <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2" placeholder="e.g. All-Purpose Cleaner" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
              <input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
              <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Min. Stock Level</label>
              <input type="number" value={form.minStock} onChange={e => setForm({ ...form, minStock: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cost per Unit ($)</label>
              <input type="number" step="0.01" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
              <input type="text" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="bg-primary text-white px-6 py-2.5 rounded-lg font-bold hover:opacity-90">{editingId ? "Update" : "Add Item"}</button>
            </div>
          </form>
        </Card>
      )}

      {/* Item Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading inventory...</div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No items yet. Add your first inventory item.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => {
            const cat = getCat(item.category);
            const isLow = item.minStock && item.quantity <= item.minStock;
            return (
              <Card key={item.id} className={`p-4 ${isLow ? "border-amber-300 bg-amber-50/30" : ""}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-bold text-slate-900">{item.name}</h4>
                    {cat && <Badge className={cat.color + " mt-1"}>{cat.label}</Badge>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(item)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(item.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`text-2xl font-black ${isLow ? "text-amber-600" : "text-slate-900"}`}>
                    {item.quantity}
                  </div>
                  <span className="text-sm text-slate-500">{item.unit}</span>
                  {isLow && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => quickAdjust(item.id, -1)} className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 font-bold text-lg hover:bg-rose-200 transition flex items-center justify-center">-</button>
                  <button onClick={() => quickAdjust(item.id, 1)} className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 font-bold text-lg hover:bg-emerald-200 transition flex items-center justify-center">+</button>
                  {item.cost && <span className="text-sm text-slate-500 ml-auto">${item.cost}/unit</span>}
                </div>
                {item.supplier && <p className="text-xs text-slate-400 mt-2">Supplier: {item.supplier}</p>}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
