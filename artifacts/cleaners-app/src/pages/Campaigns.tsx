import React, { useState } from "react";
import { useListCampaigns, useCreateCampaign, useUpdateCampaign, useDeleteCampaign } from "@workspace/api-client-react";
import { getListCampaignsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, Badge } from "@/components/ui";
import { PageHeader } from "@/components/Layout";
import { formatCurrency, getStatusColor } from "@/lib/utils";
import { Plus, Trash2, X, Megaphone } from "lucide-react";

const TYPES = ["Flyer", "Social Media", "Email", "Promotion", "Outreach", "Referral", "Other"];
const STATUSES = ["planned", "active", "completed"];

export default function Campaigns() {
  const queryClient = useQueryClient();
  const { data: campaigns, isLoading } = useListCampaigns();
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const deleteCampaign = useDeleteCampaign();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", type: "Flyer", status: "planned", startDate: "", endDate: "", budget: "", targetAudience: "", description: "", notes: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCampaign.mutate(
      { data: form },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
          setShowForm(false);
          setForm({ name: "", type: "Flyer", status: "planned", startDate: "", endDate: "", budget: "", targetAudience: "", description: "", notes: "" });
        },
      }
    );
  };

  const handleStatusChange = (id: number, status: string) => {
    updateCampaign.mutate({ id, data: { status } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() }) });
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this campaign?")) {
      deleteCampaign.mutate({ id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() }) });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Campaign Manager" subtitle="Plan and track marketing campaigns" action={<button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-medium hover:opacity-90 transition"><Plus className="w-4 h-4" /> New Campaign</button>} />

      {showForm && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">New Campaign</h3>
            <button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Budget</label>
              <input type="number" step="0.01" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Target Audience</label>
              <input type="text" value={form.targetAudience} onChange={e => setForm({ ...form, targetAudience: e.target.value })} className="w-full border rounded-lg px-3 py-2" placeholder="e.g., South Oahu residents, boat owners" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={2} />
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:opacity-90">Create Campaign</button>
            </div>
          </form>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading campaigns...</div>
      ) : !campaigns?.length ? (
        <Card className="p-12 text-center">
          <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No campaigns yet. Create your first marketing campaign to start tracking.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((c: any) => (
            <Card key={c.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mt-1">
                    <Megaphone className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{c.name}</h3>
                    <p className="text-sm text-slate-500">{c.type}{c.targetAudience ? ` · ${c.targetAudience}` : ""}</p>
                    {c.description && <p className="text-sm text-slate-600 mt-1">{c.description}</p>}
                    <div className="flex gap-4 mt-2 text-xs text-slate-400">
                      {c.startDate && <span>Start: {c.startDate}</span>}
                      {c.endDate && <span>End: {c.endDate}</span>}
                      {c.budget && <span>Budget: {formatCurrency(c.budget)}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <select value={c.status} onChange={e => handleStatusChange(c.id, e.target.value)} className="text-sm border rounded-lg px-2 py-1">
                    {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                  <Badge className={getStatusColor(c.status)}>{c.status}</Badge>
                  <button onClick={() => handleDelete(c.id)} className="text-rose-500 hover:text-rose-700"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
