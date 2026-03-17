import React, { useState, useEffect, useMemo } from "react";
import { Card, Badge } from "@/components/ui";
import { PageHeader } from "@/components/Layout";
import { formatCurrency } from "@/lib/utils";
import {
  Droplets, Wrench, ShowerHead, AlertTriangle, Building2, Pencil, Trash2, Plus, X, Clock,
  Check, Crown, Star, Zap, Shield, ChevronDown, ChevronUp, DollarSign, Tag
} from "lucide-react";

interface Service {
  id: number; category: string; name: string; description: string | null;
  basePrice: string; unit: string; durationEstimate: string | null; sortOrder: number;
}
interface Plan {
  id: number; name: string; tier: string; frequency: string; price: string;
  description: string | null; features: string[]; discountPct: string; sortOrder: number;
}

const CATEGORIES = ["Drain Services", "Pipe Repair", "Water Heater", "Emergency", "Commercial"];
const categoryIcon: Record<string, React.ReactNode> = {
  "Drain Services": <Droplets className="w-5 h-5" />,
  "Pipe Repair": <Wrench className="w-5 h-5" />,
  "Water Heater": <ShowerHead className="w-5 h-5" />,
  "Emergency": <AlertTriangle className="w-5 h-5" />,
  "Commercial": <Building2 className="w-5 h-5" />,
};
const categoryColor: Record<string, string> = {
  "Drain Services": "from-blue-500 to-blue-600",
  "Pipe Repair": "from-cyan-500 to-teal-600",
  "Water Heater": "from-amber-500 to-orange-600",
  "Emergency": "from-rose-500 to-red-600",
  "Commercial": "from-slate-600 to-slate-700",
};
const tierIcon: Record<string, React.ReactNode> = { basic: <Star className="w-5 h-5" />, standard: <Zap className="w-5 h-5" />, premium: <Crown className="w-5 h-5" /> };
const tierColor: Record<string, string> = { basic: "from-slate-500 to-slate-600", standard: "from-primary to-blue-700", premium: "from-amber-500 to-amber-600" };
const tierBorder: Record<string, string> = { basic: "border-slate-200", standard: "border-primary/30 ring-2 ring-primary/10", premium: "border-amber-300 ring-2 ring-amber-100" };

const emptyService = { category: "Drain Services", name: "", description: "", basePrice: "", unit: "per job", durationEstimate: "" };
const emptyPlan = { name: "", tier: "standard", frequency: "monthly", price: "", description: "", features: [""], discountPct: "0" };

export default function PricingServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [serviceForm, setServiceForm] = useState(emptyService);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [planForm, setPlanForm] = useState(emptyPlan);

  const load = async () => {
    try {
      const [sRes, pRes] = await Promise.all([fetch("/api/services"), fetch("/api/membership-plans")]);
      setServices(await sRes.json()); setPlans(await pRes.json());
    } catch (e) { console.error("Failed to load pricing:", e); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => {
    const map: Record<string, Service[]> = {};
    services.forEach(s => { if (!map[s.category]) map[s.category] = []; map[s.category].push(s); });
    return map;
  }, [services]);

  // Service CRUD
  const openCreateService = () => { setEditingServiceId(null); setServiceForm(emptyService); setShowServiceForm(true); };
  const openEditService = (s: Service) => { setEditingServiceId(s.id); setServiceForm({ category: s.category, name: s.name, description: s.description || "", basePrice: s.basePrice, unit: s.unit, durationEstimate: s.durationEstimate || "" }); setShowServiceForm(true); };
  const submitService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingServiceId) await fetch(`/api/services/${editingServiceId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(serviceForm) });
      else await fetch("/api/services", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(serviceForm) });
    } catch (e) { console.error(e); }
    setShowServiceForm(false); load();
  };
  const deleteService = async (id: number) => { if (confirm("Delete this service?")) { try { await fetch(`/api/services/${id}`, { method: "DELETE" }); } catch (e) { console.error(e); } load(); } };

  // Plan CRUD
  const openCreatePlan = () => { setEditingPlanId(null); setPlanForm(emptyPlan); setShowPlanForm(true); };
  const openEditPlan = (p: Plan) => { setEditingPlanId(p.id); setPlanForm({ name: p.name, tier: p.tier, frequency: p.frequency, price: p.price, description: p.description || "", features: p.features.length ? p.features : [""], discountPct: p.discountPct }); setShowPlanForm(true); };
  const submitPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...planForm, features: planForm.features.filter(f => f.trim()) };
      if (editingPlanId) await fetch(`/api/membership-plans/${editingPlanId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      else await fetch("/api/membership-plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } catch (e) { console.error(e); }
    setShowPlanForm(false); load();
  };
  const deletePlan = async (id: number) => { if (confirm("Delete this plan?")) { try { await fetch(`/api/membership-plans/${id}`, { method: "DELETE" }); } catch (e) { console.error(e); } load(); } };

  const addFeature = () => setPlanForm({ ...planForm, features: [...planForm.features, ""] });
  const removeFeature = (i: number) => setPlanForm({ ...planForm, features: planForm.features.filter((_, idx) => idx !== i) });
  const updateFeature = (i: number, v: string) => { const f = [...planForm.features]; f[i] = v; setPlanForm({ ...planForm, features: f }); };

  if (loading) return <div className="text-center py-12 text-slate-500">Loading pricing...</div>;

  return (
    <div className="space-y-8 pb-12">
      {/* ─── Service Pricing ─── */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Service Pricing</h2>
            <p className="text-slate-500 text-sm mt-0.5">{services.length} services across {Object.keys(grouped).length} categories</p>
          </div>
          <button onClick={openCreateService} className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl font-bold hover:opacity-90 min-h-[44px] text-sm">
            <Plus className="w-4 h-4" /> Add Service
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
          <button onClick={() => setActiveCategory(null)} className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition ${!activeCategory ? "bg-primary text-white shadow-md" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}>
            All
          </button>
          {CATEGORIES.filter(c => grouped[c]).map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition ${activeCategory === cat ? "bg-primary text-white shadow-md" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}>
              {categoryIcon[cat]} {cat}
            </button>
          ))}
        </div>

        {/* Service Form */}
        {showServiceForm && (
          <Card className="p-5 mb-5">
            <div className="flex justify-between items-center mb-4"><h3 className="font-bold">{editingServiceId ? "Edit Service" : "New Service"}</h3><button onClick={() => setShowServiceForm(false)}><X className="w-5 h-5 text-slate-400" /></button></div>
            <form onSubmit={submitService} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-semibold mb-1">Category *</label><select value={serviceForm.category} onChange={e => setServiceForm({ ...serviceForm, category: e.target.value })} className="w-full border rounded-xl px-3 py-2.5">{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
              <div><label className="block text-sm font-semibold mb-1">Service Name *</label><input required value={serviceForm.name} onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })} className="w-full border rounded-xl px-3 py-2.5" /></div>
              <div><label className="block text-sm font-semibold mb-1">Base Price *</label><input type="number" step="0.01" required value={serviceForm.basePrice} onChange={e => setServiceForm({ ...serviceForm, basePrice: e.target.value })} className="w-full border rounded-xl px-3 py-2.5" /></div>
              <div><label className="block text-sm font-semibold mb-1">Unit</label><input value={serviceForm.unit} onChange={e => setServiceForm({ ...serviceForm, unit: e.target.value })} className="w-full border rounded-xl px-3 py-2.5" placeholder="per job, per vehicle, etc." /></div>
              <div><label className="block text-sm font-semibold mb-1">Duration Estimate</label><input value={serviceForm.durationEstimate} onChange={e => setServiceForm({ ...serviceForm, durationEstimate: e.target.value })} className="w-full border rounded-xl px-3 py-2.5" placeholder="e.g. 2-3 hrs" /></div>
              <div className="md:col-span-2"><label className="block text-sm font-semibold mb-1">Description</label><input value={serviceForm.description} onChange={e => setServiceForm({ ...serviceForm, description: e.target.value })} className="w-full border rounded-xl px-3 py-2.5" /></div>
              <div className="md:col-span-2"><button type="submit" className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:opacity-90 min-h-[44px]">{editingServiceId ? "Update" : "Save"} Service</button></div>
            </form>
          </Card>
        )}

        {/* Service Cards by Category */}
        {(activeCategory ? [[activeCategory, grouped[activeCategory] || []]] : Object.entries(grouped)).map(([cat, items]: any) => (
          <div key={cat} className="mb-6">
            <div className="flex items-center gap-2.5 mb-3">
              <div className={`p-2 rounded-xl bg-gradient-to-br ${categoryColor[cat] || "from-slate-500 to-slate-600"} text-white`}>
                {categoryIcon[cat] || <Tag className="w-5 h-5" />}
              </div>
              <h3 className="font-bold text-lg text-slate-800">{cat}</h3>
              <span className="text-xs text-slate-400 font-medium">{items.length} services</span>
            </div>
            <div className="grid gap-2">
              {items.map((s: Service) => (
                <Card key={s.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-900">{s.name}</p>
                        {s.durationEstimate && <span className="flex items-center gap-1 text-xs text-slate-400"><Clock className="w-3 h-3" />{s.durationEstimate}</span>}
                      </div>
                      {s.description && <p className="text-sm text-slate-500 mt-0.5">{s.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="text-lg font-black text-primary">{formatCurrency(s.basePrice)}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{s.unit}</p>
                      </div>
                      <button onClick={() => openEditService(s)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteService(s.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ─── Membership Plans ─── */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Membership Plans</h2>
            <p className="text-slate-500 text-sm mt-0.5">Recurring maintenance plans for homeowners and businesses</p>
          </div>
          <button onClick={openCreatePlan} className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl font-bold hover:opacity-90 min-h-[44px] text-sm">
            <Plus className="w-4 h-4" /> Add Plan
          </button>
        </div>

        {/* Plan Form */}
        {showPlanForm && (
          <Card className="p-5 mb-5">
            <div className="flex justify-between items-center mb-4"><h3 className="font-bold">{editingPlanId ? "Edit Plan" : "New Plan"}</h3><button onClick={() => setShowPlanForm(false)}><X className="w-5 h-5 text-slate-400" /></button></div>
            <form onSubmit={submitPlan} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-semibold mb-1">Plan Name *</label><input required value={planForm.name} onChange={e => setPlanForm({ ...planForm, name: e.target.value })} className="w-full border rounded-xl px-3 py-2.5" /></div>
                <div><label className="block text-sm font-semibold mb-1">Price / month *</label><input type="number" step="0.01" required value={planForm.price} onChange={e => setPlanForm({ ...planForm, price: e.target.value })} className="w-full border rounded-xl px-3 py-2.5" /></div>
                <div><label className="block text-sm font-semibold mb-1">Tier</label><select value={planForm.tier} onChange={e => setPlanForm({ ...planForm, tier: e.target.value })} className="w-full border rounded-xl px-3 py-2.5"><option value="basic">Basic</option><option value="standard">Standard</option><option value="premium">Premium</option></select></div>
                <div><label className="block text-sm font-semibold mb-1">Discount %</label><input type="number" value={planForm.discountPct} onChange={e => setPlanForm({ ...planForm, discountPct: e.target.value })} className="w-full border rounded-xl px-3 py-2.5" /></div>
              </div>
              <div><label className="block text-sm font-semibold mb-1">Description</label><input value={planForm.description} onChange={e => setPlanForm({ ...planForm, description: e.target.value })} className="w-full border rounded-xl px-3 py-2.5" /></div>
              <div>
                <label className="block text-sm font-semibold mb-2">Features</label>
                {planForm.features.map((f, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input value={f} onChange={e => updateFeature(i, e.target.value)} className="flex-1 border rounded-xl px-3 py-2" placeholder={`Feature ${i + 1}`} />
                    {planForm.features.length > 1 && <button type="button" onClick={() => removeFeature(i)} className="p-2 text-rose-400 hover:bg-rose-50 rounded-lg"><X className="w-4 h-4" /></button>}
                  </div>
                ))}
                <button type="button" onClick={addFeature} className="text-primary text-sm font-bold hover:underline">+ Add feature</button>
              </div>
              <button type="submit" className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:opacity-90 min-h-[44px]">{editingPlanId ? "Update" : "Save"} Plan</button>
            </form>
          </Card>
        )}

        {/* Plan Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map(plan => (
            <Card key={plan.id} className={`overflow-hidden ${tierBorder[plan.tier] || "border-slate-200"} relative`}>
              {plan.tier === "premium" && <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 to-amber-600" />}
              {plan.tier === "standard" && <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary to-blue-600" />}

              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl bg-gradient-to-br ${tierColor[plan.tier] || "from-slate-500 to-slate-600"} text-white`}>
                      {tierIcon[plan.tier] || <Star className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{plan.name}</h3>
                      <p className="text-xs text-slate-400 capitalize">{plan.tier} tier</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEditPlan(plan)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => deletePlan(plan.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-900">{formatCurrency(plan.price)}</span>
                    <span className="text-sm text-slate-400 font-medium">/{plan.frequency}</span>
                  </div>
                  {parseFloat(plan.discountPct) > 0 && (
                    <Badge className="bg-emerald-100 text-emerald-700 mt-1">{plan.discountPct}% off add-ons</Badge>
                  )}
                </div>

                {plan.description && <p className="text-sm text-slate-500 mb-4">{plan.description}</p>}

                <div className="space-y-2.5">
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Check className="w-3 h-3 text-emerald-600" />
                      </div>
                      <span className="text-sm text-slate-700">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
