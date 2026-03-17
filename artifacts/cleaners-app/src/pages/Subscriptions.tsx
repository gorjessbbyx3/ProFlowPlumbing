import React, { useState, useEffect } from "react";
import { Card, Badge } from "@/components/ui";
import { PageHeader } from "@/components/Layout";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2, Pencil, X, Repeat, TrendingUp, Users, DollarSign, Calendar } from "lucide-react";

interface Sub { id: number; clientId: number|null; clientName: string; serviceType: string; frequency: string; price: string; nextServiceDate: string; status: string; location: string|null; notes: string|null; }
interface MrrStats { mrr: string; arr: string; activeCount: number; weeklyRevenue: string; biweeklyRevenue: string; monthlyRevenue: string; }

const FREQUENCIES = ["weekly", "biweekly", "monthly"];
const emptyForm = { clientName: "", serviceType: "", frequency: "weekly", price: "", nextServiceDate: "", location: "", notes: "" };

export default function Subscriptions() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [stats, setStats] = useState<MrrStats|null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number|null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    try {
      const [subsRes, statsRes] = await Promise.all([fetch("/api/subscriptions"), fetch("/api/subscriptions/stats/mrr")]);
      setSubs(await subsRes.json()); setStats(await statsRes.json());
    } catch (e) { console.error("Failed to load subscriptions:", e); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditingId(null); setForm({ ...emptyForm, nextServiceDate: new Date().toISOString().split("T")[0] }); setShowForm(true); };
  const openEdit = (s: Sub) => { setEditingId(s.id); setForm({ clientName: s.clientName, serviceType: s.serviceType, frequency: s.frequency, price: s.price, nextServiceDate: s.nextServiceDate, location: s.location || "", notes: s.notes || "" }); setShowForm(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) await fetch(`/api/subscriptions/${editingId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      else await fetch("/api/subscriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    } catch (e) { console.error(e); }
    setShowForm(false); load();
  };
  const handleDelete = async (id: number) => { if (confirm("Cancel this subscription?")) { try { await fetch(`/api/subscriptions/${id}`, { method: "DELETE" }); } catch (e) { console.error(e); } load(); } };
  const toggleStatus = async (s: Sub) => {
    try { await fetch(`/api/subscriptions/${s.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: s.status === "active" ? "paused" : "active" }) }); } catch (e) { console.error(e); }
    load();
  };

  const freqLabel = (f: string) => f === "weekly" ? "Weekly" : f === "biweekly" ? "Bi-weekly" : "Monthly";
  const freqColor = (f: string) => f === "weekly" ? "bg-blue-100 text-blue-700" : f === "biweekly" ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700";

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <PageHeader title="Subscriptions" subtitle="Recurring revenue & client contracts" action={<button onClick={openCreate} className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl font-bold hover:opacity-90 min-h-[44px]"><Plus className="w-4 h-4" /> New Subscription</button>} />

      {/* MRR Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4 text-center"><DollarSign className="w-5 h-5 text-emerald-500 mx-auto mb-1" /><p className="text-2xl font-black text-emerald-700">{formatCurrency(stats.mrr)}</p><p className="text-xs font-bold text-slate-400 uppercase">Monthly MRR</p></Card>
          <Card className="p-4 text-center"><TrendingUp className="w-5 h-5 text-blue-500 mx-auto mb-1" /><p className="text-2xl font-black text-blue-700">{formatCurrency(stats.arr)}</p><p className="text-xs font-bold text-slate-400 uppercase">Annual ARR</p></Card>
          <Card className="p-4 text-center"><Users className="w-5 h-5 text-purple-500 mx-auto mb-1" /><p className="text-2xl font-black text-purple-700">{stats.activeCount}</p><p className="text-xs font-bold text-slate-400 uppercase">Active Clients</p></Card>
          <Card className="p-4 text-center"><Repeat className="w-5 h-5 text-amber-500 mx-auto mb-1" /><p className="text-2xl font-black text-amber-700">{formatCurrency(stats.weeklyRevenue)}/wk</p><p className="text-xs font-bold text-slate-400 uppercase">Weekly Rev</p></Card>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg">{editingId ? "Edit Subscription" : "New Subscription"}</h3><button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-slate-400" /></button></div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-semibold mb-1">Client Name *</label><input required value={form.clientName} onChange={e => setForm({...form, clientName: e.target.value})} className="w-full border rounded-xl px-3 py-2.5" /></div>
            <div><label className="block text-sm font-semibold mb-1">Service Type *</label><input required value={form.serviceType} onChange={e => setForm({...form, serviceType: e.target.value})} className="w-full border rounded-xl px-3 py-2.5" placeholder="e.g. Condo Cleaning" /></div>
            <div><label className="block text-sm font-semibold mb-1">Frequency *</label><select value={form.frequency} onChange={e => setForm({...form, frequency: e.target.value})} className="w-full border rounded-xl px-3 py-2.5">{FREQUENCIES.map(f => <option key={f} value={f}>{freqLabel(f)}</option>)}</select></div>
            <div><label className="block text-sm font-semibold mb-1">Price per Visit *</label><input type="number" step="0.01" required value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="w-full border rounded-xl px-3 py-2.5" /></div>
            <div><label className="block text-sm font-semibold mb-1">Next Service Date *</label><input type="date" required value={form.nextServiceDate} onChange={e => setForm({...form, nextServiceDate: e.target.value})} className="w-full border rounded-xl px-3 py-2.5" /></div>
            <div><label className="block text-sm font-semibold mb-1">Location</label><input value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="w-full border rounded-xl px-3 py-2.5" /></div>
            <div className="md:col-span-2"><label className="block text-sm font-semibold mb-1">Notes</label><textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full border rounded-xl px-3 py-2.5" rows={2} /></div>
            <div className="md:col-span-2"><button type="submit" className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:opacity-90 min-h-[44px]">{editingId ? "Update" : "Save"} Subscription</button></div>
          </form>
        </Card>
      )}

      {/* List */}
      {loading ? <div className="text-center py-12 text-slate-500">Loading...</div> : !subs.length ? (
        <Card className="p-12 text-center"><Repeat className="w-12 h-12 text-slate-200 mx-auto mb-3" /><p className="text-slate-500 font-medium">No subscriptions yet.</p><button onClick={openCreate} className="mt-2 text-primary font-bold text-sm hover:underline">Add your first recurring client</button></Card>
      ) : (
        <div className="grid gap-3">
          {subs.map(s => (
            <Card key={s.id} className={`p-4 border-l-4 ${s.status === "active" ? "border-l-emerald-500" : "border-l-slate-300"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap"><p className="font-bold text-slate-900">{s.clientName}</p><Badge className={freqColor(s.frequency)}>{freqLabel(s.frequency)}</Badge>{s.status !== "active" && <Badge className="bg-slate-100 text-slate-500">{s.status}</Badge>}</div>
                  <p className="text-sm text-slate-600 mt-0.5">{s.serviceType}{s.location ? ` · ${s.location}` : ""}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400"><span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Next: {s.nextServiceDate}</span><span className="font-bold text-emerald-600 text-sm">{formatCurrency(s.price)}/visit</span></div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => toggleStatus(s)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${s.status === "active" ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>{s.status === "active" ? "Pause" : "Resume"}</button>
                  <button onClick={() => openEdit(s)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(s.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
