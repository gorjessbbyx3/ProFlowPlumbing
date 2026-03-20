import React, { useState, useEffect } from "react";
import { useListCampaigns, useCreateCampaign, useUpdateCampaign, useDeleteCampaign } from "@workspace/api-client-react";
import type { ListCampaignsQueryResult } from "@workspace/api-client-react";
import { getListCampaignsQueryKey } from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, Badge } from "@/components/ui";
import { PageHeader } from "@/components/Layout";
import { formatCurrency, getStatusColor } from "@/lib/utils";
import {
  Plus, Trash2, X, Megaphone, Pencil, TrendingUp, DollarSign,
  Zap, Target, BarChart3, Snowflake, Star, Users, MapPin,
  FileText, ChevronDown, ChevronUp, Wrench
} from "lucide-react";

type CampaignItem = ListCampaignsQueryResult[number];

const TYPES = ["Flyer", "Social Media", "Email", "Promotion", "Outreach", "Referral", "Door-to-Door", "Google Ads", "Nextdoor", "Other"];
const STATUSES = ["planned", "active", "paused", "completed"];

// ── Campaign Templates ──
const TEMPLATES = [
  {
    key: "winterize",
    icon: Snowflake,
    color: "bg-blue-50 text-blue-600 border-blue-200",
    name: "Winterization Promo",
    description: "Seasonal pipe insulation & freeze prevention",
    defaults: {
      name: "Winter Pipe Protection Special",
      type: "Flyer",
      targetAudience: "Homeowners in mountain/elevated areas",
      description: "Offer pipe insulation, heat tape installation, and outdoor faucet covers at a bundled discount before cold season hits.",
      budget: "500",
      notes: "Best launched Oct-Nov. Include before/after photos of burst pipe damage for urgency.",
    },
  },
  {
    key: "emergency",
    icon: Zap,
    color: "bg-red-50 text-red-600 border-red-200",
    name: "Emergency Service Awareness",
    description: "24/7 emergency plumbing — top of mind",
    defaults: {
      name: "24/7 Emergency Plumbing — We're On Call",
      type: "Social Media",
      targetAudience: "All local residents",
      description: "Multi-channel push highlighting fast response times, 24/7 availability, and no overtime charges for emergencies.",
      budget: "750",
      notes: "Run Google Ads with 'emergency plumber near me' keywords. Add testimonials from past emergency calls.",
    },
  },
  {
    key: "referral",
    icon: Star,
    color: "bg-amber-50 text-amber-600 border-amber-200",
    name: "Referral Bonus Program",
    description: "$50 off for both referrer & new customer",
    defaults: {
      name: "Refer a Friend — $50 Off for Both",
      type: "Referral",
      targetAudience: "Existing satisfied customers",
      description: "Give every completed customer a referral card. When their friend books, both get $50 off their next service.",
      budget: "300",
      notes: "Track referrals by adding source to work orders. Print referral cards with unique codes.",
    },
  },
  {
    key: "neighborhood",
    icon: MapPin,
    color: "bg-green-50 text-green-600 border-green-200",
    name: "New Neighborhood Blitz",
    description: "Door hangers & flyers for a target area",
    defaults: {
      name: "Neighborhood Flyer Drop",
      type: "Door-to-Door",
      targetAudience: "Specific neighborhood / subdivision",
      description: "Print 500 door hangers with a first-time customer discount. Target neighborhoods with older homes (20+ years) where plumbing issues are more common.",
      budget: "350",
      notes: "Track which neighborhood each new customer comes from. Best areas: older subdivisions, recent water main break zones.",
    },
  },
  {
    key: "reviews",
    icon: Users,
    color: "bg-purple-50 text-purple-600 border-purple-200",
    name: "Google Reviews Push",
    description: "Build 5-star reputation fast",
    defaults: {
      name: "5-Star Reviews Campaign",
      type: "Email",
      targetAudience: "Recent completed customers (last 90 days)",
      description: "Send follow-up texts/emails after every completed job with a direct link to leave a Google review. Offer a small incentive like 10% off next service.",
      budget: "100",
      notes: "Goal: 20+ new reviews in 30 days. Create a QR code for the review link to hand out on-site.",
    },
  },
  {
    key: "maintenance",
    icon: Wrench,
    color: "bg-teal-50 text-teal-600 border-teal-200",
    name: "Annual Maintenance Plan",
    description: "Recurring revenue with yearly inspections",
    defaults: {
      name: "Annual Plumbing Inspection Plan",
      type: "Promotion",
      targetAudience: "Homeowners, property managers, landlords",
      description: "Sell annual plumbing inspection plans — one yearly visit to check water heater, check for leaks, test water pressure, inspect exposed pipes. $149/year or $14/mo.",
      budget: "400",
      notes: "This builds recurring revenue. Upsell repairs found during inspections. Great for property managers with multiple units.",
    },
  },
];

type FormState = {
  name: string; type: string; status: string; startDate: string;
  endDate: string; budget: string; amountSpent: string; targetAudience: string;
  description: string; notes: string;
};
const emptyForm: FormState = {
  name: "", type: "Flyer", status: "planned", startDate: "", endDate: "",
  budget: "", amountSpent: "", targetAudience: "", description: "", notes: "",
};

export default function Campaigns() {
  const queryClient = useQueryClient();
  const { data: campaigns, isLoading } = useListCampaigns();
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const deleteCampaign = useDeleteCampaign();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showTemplates, setShowTemplates] = useState(false);
  const [expandedROI, setExpandedROI] = useState<number | null>(null);

  // Fetch ROI stats for all campaigns
  const { data: roiStats } = useQuery({
    queryKey: ["campaigns", "roi"],
    queryFn: async () => {
      const res = await fetch("/api/campaigns/stats/roi");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const roiMap = new Map<number, any>();
  (roiStats || []).forEach((r: any) => roiMap.set(r.id, r));

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setShowTemplates(false);
  };

  const useTemplate = (template: typeof TEMPLATES[number]) => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      name: template.defaults.name,
      type: template.defaults.type,
      targetAudience: template.defaults.targetAudience,
      description: template.defaults.description,
      budget: template.defaults.budget,
      notes: template.defaults.notes,
    });
    setShowForm(true);
    setShowTemplates(false);
  };

  const openEdit = (c: CampaignItem) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      type: c.type,
      status: c.status,
      startDate: c.startDate ?? "",
      endDate: c.endDate ?? "",
      budget: c.budget ?? "",
      amountSpent: (c as any).amountSpent ?? "",
      targetAudience: c.targetAudience ?? "",
      description: c.description ?? "",
      notes: c.notes ?? "",
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      name: form.name, type: form.type, status: form.status || undefined,
      startDate: form.startDate || undefined, endDate: form.endDate || undefined,
      budget: form.budget || undefined, amountSpent: form.amountSpent || undefined,
      targetAudience: form.targetAudience || undefined,
      description: form.description || undefined, notes: form.notes || undefined,
    };
    const onSuccess = () => {
      queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
      queryClient.invalidateQueries({ queryKey: ["campaigns", "roi"] });
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
    };
    if (editingId) {
      updateCampaign.mutate({ id: editingId, data: payload }, { onSuccess });
    } else {
      createCampaign.mutate({ data: payload }, { onSuccess });
    }
  };

  const handleStatusChange = (id: number, status: string) => {
    updateCampaign.mutate({ id, data: { status } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
        queryClient.invalidateQueries({ queryKey: ["campaigns", "roi"] });
      },
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this campaign?")) {
      deleteCampaign.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
          queryClient.invalidateQueries({ queryKey: ["campaigns", "roi"] });
        },
      });
    }
  };

  // Aggregate stats
  const activeCampaigns = campaigns?.filter((c: CampaignItem) => c.status === "active") || [];
  const totalBudget = campaigns?.reduce((s: number, c: CampaignItem) => s + parseFloat(c.budget || "0"), 0) || 0;
  const totalSpent = (roiStats || []).reduce((s: number, r: any) => s + parseFloat(r.amountSpent || "0"), 0);
  const totalRevenue = (roiStats || []).reduce((s: number, r: any) => s + (r.completedRevenue || 0), 0);
  const totalWorkOrders = (roiStats || []).reduce((s: number, r: any) => s + (r.workOrderCount || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns"
        subtitle="Plan, launch, and track marketing campaigns"
        action={
          <div className="flex gap-2">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-xl font-medium hover:bg-slate-200 transition"
            >
              <FileText className="w-4 h-4" /> Templates
            </button>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-medium hover:opacity-90 transition"
            >
              <Plus className="w-4 h-4" /> New Campaign
            </button>
          </div>
        }
      />

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Active", value: activeCampaigns.length, icon: Megaphone, color: "text-emerald-600 bg-emerald-50" },
          { label: "Budget", value: formatCurrency(totalBudget), icon: DollarSign, color: "text-blue-600 bg-blue-50" },
          { label: "Spent", value: formatCurrency(totalSpent), icon: BarChart3, color: "text-amber-600 bg-amber-50" },
          { label: "Revenue", value: formatCurrency(totalRevenue), icon: TrendingUp, color: "text-primary bg-primary/10" },
        ].map((stat) => (
          <Card key={stat.label} className="p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{stat.label}</p>
              <p className="text-lg font-bold text-slate-900">{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Templates */}
      {showTemplates && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Campaign Templates</h3>
            <button onClick={() => setShowTemplates(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-slate-500 mb-4">Pick a template to pre-fill your campaign with proven strategies for plumbing businesses.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TEMPLATES.map((t) => (
              <button
                key={t.key}
                onClick={() => useTemplate(t)}
                className={`text-left p-4 rounded-xl border-2 hover:shadow-md transition-all ${t.color}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <t.icon className="w-5 h-5" />
                  <span className="font-semibold text-sm">{t.name}</span>
                </div>
                <p className="text-xs opacity-75 leading-relaxed">{t.description}</p>
                <p className="text-xs font-bold mt-2 opacity-60">Budget: ${t.defaults.budget}</p>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Create / Edit Form */}
      {showForm && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">{editingId ? "Edit Campaign" : "New Campaign"}</h3>
            <button onClick={() => { setShowForm(false); setEditingId(null); }}><X className="w-5 h-5 text-slate-400" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Campaign Name *</label>
              <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
              <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
              <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Budget ($)</label>
              <input type="number" step="0.01" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} className="w-full border rounded-lg px-3 py-2" placeholder="e.g., 500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Amount Spent ($)</label>
              <input type="number" step="0.01" value={form.amountSpent} onChange={e => setForm({ ...form, amountSpent: e.target.value })} className="w-full border rounded-lg px-3 py-2" placeholder="Track actual spend" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Target Audience</label>
              <input type="text" value={form.targetAudience} onChange={e => setForm({ ...form, targetAudience: e.target.value })} className="w-full border rounded-lg px-3 py-2" placeholder="e.g., Homeowners with 20+ yr old homes" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={2} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={2} />
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:opacity-90 transition">
                {editingId ? "Update Campaign" : "Create Campaign"}
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Campaign List */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading campaigns...</div>
      ) : !campaigns?.length ? (
        <Card className="p-12 text-center">
          <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-2">No campaigns yet.</p>
          <p className="text-sm text-slate-400 mb-4">Start with a template or create a blank campaign.</p>
          <button onClick={() => setShowTemplates(true)} className="text-primary font-medium text-sm hover:underline">Browse Templates</button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns?.map((c: CampaignItem) => {
            const roi = roiMap.get(c.id);
            const budget = parseFloat(c.budget || "0");
            const spent = parseFloat(roi?.amountSpent || "0");
            const budgetPct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
            const revenue = roi?.completedRevenue || 0;
            const workOrders = roi?.workOrderCount || 0;
            const roiPct = parseFloat(roi?.roi || "0");
            const isExpanded = expandedROI === c.id;

            return (
              <Card key={c.id} className="overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mt-1 shrink-0">
                        <Megaphone className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-lg leading-tight">{c.name}</h3>
                        <p className="text-sm text-slate-500 mt-0.5">{c.type}{c.targetAudience ? ` · ${c.targetAudience}` : ""}</p>
                        {c.description && <p className="text-sm text-slate-600 mt-1 line-clamp-2">{c.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={c.status}
                        onChange={e => handleStatusChange(c.id, e.target.value)}
                        className="text-sm border rounded-lg px-2 py-1"
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </select>
                      <button onClick={() => openEdit(c)} className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>

                  {/* ROI Summary Bar */}
                  <div className="mt-4 flex items-center gap-4 text-sm">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>Budget: {formatCurrency(budget)}</span>
                        <span>{formatCurrency(spent)} spent ({budgetPct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${budgetPct > 90 ? "bg-rose-500" : budgetPct > 60 ? "bg-amber-500" : "bg-emerald-500"}`}
                          style={{ width: `${budgetPct}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs text-slate-500">Revenue</span>
                      <p className="font-bold text-slate-900">{formatCurrency(revenue)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs text-slate-500">ROI</span>
                      <p className={`font-bold ${roiPct > 0 ? "text-emerald-600" : roiPct < 0 ? "text-rose-600" : "text-slate-400"}`}>
                        {roiPct > 0 ? "+" : ""}{roiPct}%
                      </p>
                    </div>
                    <button
                      onClick={() => setExpandedROI(isExpanded ? null : c.id)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded ROI Details */}
                {isExpanded && (
                  <ROIDetails campaignId={c.id} />
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ROIDetails({ campaignId }: { campaignId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["campaigns", campaignId, "roi"],
    queryFn: async () => {
      const res = await fetch(`/api/campaigns/${campaignId}/roi`);
      if (!res.ok) return null;
      return res.json();
    },
  });

  if (isLoading) return <div className="px-5 pb-4 text-sm text-slate-400">Loading ROI data...</div>;
  if (!data) return <div className="px-5 pb-4 text-sm text-slate-400">No data available.</div>;

  return (
    <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-900">{data.workOrderCount}</p>
          <p className="text-xs text-slate-500">Work Orders</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-emerald-600">{data.completedCount}</p>
          <p className="text-xs text-slate-500">Completed</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(data.totalRevenue)}</p>
          <p className="text-xs text-slate-500">Total Pipeline</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-primary">{formatCurrency(data.completedRevenue)}</p>
          <p className="text-xs text-slate-500">Collected</p>
        </div>
      </div>

      {data.workOrders?.length > 0 ? (
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Linked Work Orders</p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {data.workOrders.map((wo: any) => (
              <div key={wo.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 text-sm border border-slate-100">
                <div className="flex items-center gap-2 min-w-0">
                  <Wrench className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{wo.clientName || "—"}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500 truncate">{wo.serviceType}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge className={getStatusColor(wo.status)}>{wo.status}</Badge>
                  <span className="font-medium">{formatCurrency(wo.estimatedPrice || 0)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-400 text-center py-2">No work orders linked yet. Set "Campaign" when creating work orders to track ROI.</p>
      )}
    </div>
  );
}
