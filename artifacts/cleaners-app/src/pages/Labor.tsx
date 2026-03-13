import React, { useState } from "react";
import { useListLaborEntries, useCreateLaborEntry, useUpdateLaborEntry, useDeleteLaborEntry, useListEmployees } from "@workspace/api-client-react";
import type { ListLaborEntriesQueryResult, ListEmployeesQueryResult } from "@workspace/api-client-react";
import { getListLaborEntriesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, Badge } from "@/components/ui";
import { PageHeader } from "@/components/Layout";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2, X, Clock, Pencil } from "lucide-react";

type LaborItem = ListLaborEntriesQueryResult[number];
type EmployeeItem = ListEmployeesQueryResult[number];

type FormState = { employeeId: string; bookingId: string; date: string; hoursWorked: string; hourlyRate: string; totalPay: string; description: string };
const emptyForm: FormState = { employeeId: "", bookingId: "", date: "", hoursWorked: "", hourlyRate: "", totalPay: "", description: "" };

export default function Labor() {
  const queryClient = useQueryClient();
  const [filterEmployee, setFilterEmployee] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { data: entries, isLoading } = useListLaborEntries({ employeeId: filterEmployee ? parseInt(filterEmployee) : undefined, startDate: startDate || undefined, endDate: endDate || undefined });
  const { data: employees } = useListEmployees();
  const createEntry = useCreateLaborEntry();
  const updateEntry = useUpdateLaborEntry();
  const deleteEntry = useDeleteLaborEntry();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const calcTotal = (hours: string, rate: string) => {
    const h = parseFloat(hours) || 0;
    const r = parseFloat(rate) || 0;
    return (h * r).toFixed(2);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (entry: LaborItem) => {
    setEditingId(entry.id);
    setForm({
      employeeId: entry.employeeId.toString(),
      bookingId: entry.bookingId?.toString() ?? "",
      date: entry.date,
      hoursWorked: entry.hoursWorked,
      hourlyRate: entry.hourlyRate,
      totalPay: entry.totalPay,
      description: entry.description ?? "",
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalPay = form.totalPay || calcTotal(form.hoursWorked, form.hourlyRate);
    const payload = {
      employeeId: parseInt(form.employeeId),
      bookingId: form.bookingId ? parseInt(form.bookingId) : undefined,
      date: form.date,
      hoursWorked: form.hoursWorked,
      hourlyRate: form.hourlyRate,
      totalPay,
      description: form.description || undefined,
    };

    const onSuccess = () => {
      queryClient.invalidateQueries({ queryKey: getListLaborEntriesQueryKey() });
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
    };

    if (editingId) {
      updateEntry.mutate({ id: editingId, data: payload }, { onSuccess });
    } else {
      createEntry.mutate({ data: payload }, { onSuccess });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this labor entry?")) {
      deleteEntry.mutate({ id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListLaborEntriesQueryKey() }) });
    }
  };

  const totalLabor = entries?.reduce((sum: number, entry: LaborItem) => sum + parseFloat(entry.totalPay || "0"), 0) || 0;
  const totalHours = entries?.reduce((sum: number, entry: LaborItem) => sum + parseFloat(entry.hoursWorked || "0"), 0) || 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Labor & Payroll" subtitle={`${totalHours.toFixed(1)} hours · ${formatCurrency(totalLabor)} total`} action={<button onClick={openCreate} className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-medium hover:opacity-90 transition"><Plus className="w-4 h-4" /> Log Hours</button>} />

      <div className="flex flex-wrap gap-3">
        <select value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">All Employees</option>
          {employees?.map((emp: EmployeeItem) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
        </select>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
      </div>

      {showForm && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">{editingId ? "Edit Labor Entry" : "Log Labor Hours"}</h3>
            <button onClick={() => { setShowForm(false); setEditingId(null); }}><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Employee *</label>
              <select required value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                <option value="">Select Employee</option>
                {employees?.map((emp: EmployeeItem) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
              <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Hours Worked *</label>
              <input type="number" step="0.25" required value={form.hoursWorked} onChange={e => setForm({ ...form, hoursWorked: e.target.value, totalPay: calcTotal(e.target.value, form.hourlyRate) })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Hourly Rate *</label>
              <input type="number" step="0.01" required value={form.hourlyRate} onChange={e => setForm({ ...form, hourlyRate: e.target.value, totalPay: calcTotal(form.hoursWorked, e.target.value) })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Total Pay</label>
              <input type="number" step="0.01" value={form.totalPay} onChange={e => setForm({ ...form, totalPay: e.target.value })} className="w-full border rounded-lg px-3 py-2 bg-slate-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Booking ID (optional)</label>
              <input type="number" value={form.bookingId} onChange={e => setForm({ ...form, bookingId: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:opacity-90">{editingId ? "Update Entry" : "Save Entry"}</button>
            </div>
          </form>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading labor entries...</div>
      ) : !entries?.length ? (
        <Card className="p-12 text-center">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No labor entries yet. Log hours to start tracking payroll costs.</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {entries.map((entry: LaborItem) => {
            const empName = employees?.find((emp: EmployeeItem) => emp.id === entry.employeeId)?.name || `Employee #${entry.employeeId}`;
            return (
              <Card key={entry.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold">{empName}</p>
                    <p className="text-sm text-slate-500">{entry.date} &middot; {entry.hoursWorked}hrs @ {formatCurrency(entry.hourlyRate)}/hr{entry.description ? ` · ${entry.description}` : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-blue-600">{formatCurrency(entry.totalPay)}</span>
                  <button onClick={() => openEdit(entry)} className="text-blue-500 hover:text-blue-700"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(entry.id)} className="text-rose-500 hover:text-rose-700"><Trash2 className="w-4 h-4" /></button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
