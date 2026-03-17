import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Package } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface InventoryItem { id: number; name: string; category: string; quantity: number; unit: string; cost: string | null; }
interface Usage { id: number; bookingId: number; inventoryId: number; quantityUsed: number; unitCost: string | null; itemName: string; unit: string; }

export default function SupplyUsageModal({ bookingId, onClose }: { bookingId: number; onClose: () => void }) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [usages, setUsages] = useState<Usage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState("");
  const [qty, setQty] = useState("1");

  const load = async () => {
    const [invRes, usageRes] = await Promise.all([
      fetch("/api/inventory"),
      fetch(`/api/bookings/${bookingId}/supplies`),
    ]);
    setInventory(await invRes.json());
    setUsages(await usageRes.json());
    setLoading(false);
  };
  useEffect(() => { load(); }, [bookingId]);

  const handleAdd = async () => {
    if (!selectedItem || !qty) return;
    await fetch(`/api/bookings/${bookingId}/supplies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inventoryId: parseInt(selectedItem), quantityUsed: parseInt(qty) }),
    });
    setSelectedItem("");
    setQty("1");
    load();
  };

  const handleDelete = async (usageId: number) => {
    await fetch(`/api/bookings/${bookingId}/supplies/${usageId}`, { method: "DELETE" });
    load();
  };

  const totalCost = usages.reduce((s, u) => s + (parseFloat(u.unitCost || "0") * u.quantityUsed), 0);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Package className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-lg">Parts & Materials Used</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100"><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Add supply */}
          <div className="flex gap-2">
            <select value={selectedItem} onChange={e => setSelectedItem(e.target.value)} className="flex-1 border rounded-xl px-3 py-2.5 text-sm min-h-[44px]">
              <option value="">Select item...</option>
              {inventory.filter(i => i.quantity > 0).map(i => (
                <option key={i.id} value={i.id}>{i.name} ({i.quantity} {i.unit} left){i.cost ? ` · $${i.cost}/ea` : ""}</option>
              ))}
            </select>
            <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} className="w-16 border rounded-xl px-2 py-2.5 text-sm text-center min-h-[44px]" />
            <button onClick={handleAdd} disabled={!selectedItem} className="bg-primary text-white px-3 rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-40 min-h-[44px]">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Usage list */}
          {loading ? <p className="text-center text-slate-400 py-4">Loading...</p> : usages.length === 0 ? (
            <div className="text-center py-6">
              <Package className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No parts logged for this job yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {usages.map(u => (
                <div key={u.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <p className="font-semibold text-sm text-slate-800">{u.itemName}</p>
                    <p className="text-xs text-slate-500">{u.quantityUsed} {u.unit} × {formatCurrency(u.unitCost || "0")} = {formatCurrency(parseFloat(u.unitCost || "0") * u.quantityUsed)}</p>
                  </div>
                  <button onClick={() => handleDelete(u.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}

          {/* Total */}
          {usages.length > 0 && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/10">
              <span className="font-bold text-primary text-sm">Total Parts Cost</span>
              <span className="font-black text-primary">{formatCurrency(totalCost)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
