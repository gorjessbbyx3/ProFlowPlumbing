import React, { useState } from "react";
import { useListFollowups, useCreateFollowup, useUpdateFollowup, useDeleteFollowup } from "@workspace/api-client-react";
import type { ListFollowupsQueryResult } from "@workspace/api-client-react";
import { getListFollowupsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, Badge } from "@/components/ui";
import { PageHeader } from "@/components/Layout";
import { getStatusColor } from "@/lib/utils";
import { Plus, Trash2, X, PhoneCall, Pencil } from "lucide-react";

type FollowupItem = ListFollowupsQueryResult[number];

const STATUSES = ["pending", "contacted", "converted", "lost"];

type FormState = { clientName: string; clientPhone: string; clientEmail: string; reason: string; dueDate: string; status: string; notes: string };
const emptyForm: FormState = { clientName: "", clientPhone: "", clientEmail: "", reason: "", dueDate: "", status: "pending", notes: "" };

export default function Followups() {
  const queryClient = useQueryClient();
  const { data: followups, isLoading } = useListFollowups();
  const createFollowup = useCreateFollowup();
  const updateFollowup = useUpdateFollowup();
  const deleteFollowup = useDeleteFollowup();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (f: FollowupItem) => {
    setEditingId(f.id);
    setForm({
      clientName: f.clientName,
      clientPhone: f.clientPhone ?? "",
      clientEmail: f.clientEmail ?? "",
      reason: f.reason,
      dueDate: f.dueDate,
      status: f.status,
      notes: f.notes ?? "",
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      clientName: form.clientName,
      reason: form.reason,
      dueDate: form.dueDate,
      clientPhone: form.clientPhone || undefined,
      clientEmail: form.clientEmail || undefined,
      status: form.status || undefined,
      notes: form.notes || undefined,
    };

    const onSuccess = () => {
      queryClient.invalidateQueries({ queryKey: getListFollowupsQueryKey() });
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
    };

    if (editingId) {
      updateFollowup.mutate({ id: editingId, data: payload }, { onSuccess });
    } else {
      createFollowup.mutate({ data: payload }, { onSuccess });
    }
  };

  const handleStatusChange = (id: number, status: string) => {
    updateFollowup.mutate({ id, data: { status } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListFollowupsQueryKey() }) });
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this follow-up?")) {
      deleteFollowup.mutate({ id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListFollowupsQueryKey() }) });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Follow-Ups" subtitle="Track client & lead follow-ups" action={<button onClick={openCreate} className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-medium hover:opacity-90 transition"><Plus className="w-4 h-4" /> New Follow-Up</button>} />

      {showForm && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">{editingId ? "Edit Follow-Up" : "New Follow-Up"}</h3>
            <button onClick={() => { setShowForm(false); setEditingId(null); }}><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Client Name *</label>
              <input type="text" required value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input type="text" value={form.clientPhone} onChange={e => setForm({ ...form, clientPhone: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input type="email" value={form.clientEmail} onChange={e => setForm({ ...form, clientEmail: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Due Date *</label>
              <input type="date" required value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Reason *</label>
              <input type="text" required value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className="w-full border rounded-lg px-3 py-2" placeholder="e.g., Quote follow-up, Service inquiry" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={2} />
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:opacity-90">{editingId ? "Update Follow-Up" : "Save Follow-Up"}</button>
            </div>
          </form>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading follow-ups...</div>
      ) : !followups?.length ? (
        <Card className="p-12 text-center">
          <PhoneCall className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No follow-ups yet. Add clients or leads you need to follow up with.</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {followups?.map((f: FollowupItem) => (
            <Card key={f.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                  <PhoneCall className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <p className="font-semibold">{f.clientName}</p>
                  <p className="text-sm text-slate-500">Due: {f.dueDate} &middot; {f.reason}</p>
                  {f.clientPhone && <p className="text-xs text-slate-400">{f.clientPhone}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <select value={f.status} onChange={e => handleStatusChange(f.id, e.target.value)} className="text-sm border rounded-lg px-2 py-1">
                  {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
                <Badge className={getStatusColor(f.status)}>{f.status}</Badge>
                <button onClick={() => openEdit(f)} className="text-blue-500 hover:text-blue-700"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(f.id)} className="text-rose-500 hover:text-rose-700"><Trash2 className="w-4 h-4" /></button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
