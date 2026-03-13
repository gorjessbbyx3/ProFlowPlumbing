import React, { useState } from "react";
import { useListEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee } from "@workspace/api-client-react";
import { getListEmployeesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/Layout";
import { Card, Button, Modal, FormField, Badge } from "@/components/ui";
import { formatCurrency, getStatusColor } from "@/lib/utils";
import { Edit2, Trash2, Plus } from "lucide-react";
import type { Employee } from "@workspace/api-client-react";

export default function Employees() {
  const queryClient = useQueryClient();
  const { data: employees, isLoading } = useListEmployees();
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const deleteMutation = useDeleteEmployee();

  const [modalState, setModalState] = useState<{ isOpen: boolean; employee?: Employee }>({ isOpen: false });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      role: formData.get("role") as string,
      hourlyRate: formData.get("hourlyRate") as string,
      status: formData.get("status") as string,
    };

    if (modalState.employee) {
      updateMutation.mutate(
        { id: modalState.employee.id, data },
        { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() }); setModalState({ isOpen: false }); } }
      );
    } else {
      createMutation.mutate(
        { data },
        { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() }); setModalState({ isOpen: false }); } }
      );
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this employee?")) {
      deleteMutation.mutate({ id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() }) });
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader 
        title="Employees" 
        description="Manage your cleaning staff and their details."
        action={<Button onClick={() => setModalState({ isOpen: true })}><Plus className="w-4 h-4 mr-2"/> Add Employee</Button>}
      />

      <Card className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-border/60">
              <th className="p-4 font-bold text-slate-600 text-sm tracking-wider uppercase">Name</th>
              <th className="p-4 font-bold text-slate-600 text-sm tracking-wider uppercase">Contact</th>
              <th className="p-4 font-bold text-slate-600 text-sm tracking-wider uppercase">Role</th>
              <th className="p-4 font-bold text-slate-600 text-sm tracking-wider uppercase">Rate</th>
              <th className="p-4 font-bold text-slate-600 text-sm tracking-wider uppercase">Status</th>
              <th className="p-4 font-bold text-slate-600 text-sm tracking-wider uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {isLoading ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-500">Loading employees...</td></tr>
            ) : employees?.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-500">No employees found.</td></tr>
            ) : (
              employees?.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-4 font-bold text-slate-900">{emp.name}</td>
                  <td className="p-4">
                    <div className="text-sm text-slate-700">{emp.email || "-"}</div>
                    <div className="text-sm text-slate-500">{emp.phone || "-"}</div>
                  </td>
                  <td className="p-4 text-sm font-medium text-slate-700 capitalize">{emp.role}</td>
                  <td className="p-4 text-sm font-bold text-slate-900">{formatCurrency(emp.hourlyRate)}/hr</td>
                  <td className="p-4"><Badge className={getStatusColor(emp.status)}>{emp.status}</Badge></td>
                  <td className="p-4 text-right space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="outline" className="px-3 py-1.5 h-auto text-xs" onClick={() => setModalState({ isOpen: true, employee: emp })}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="destructive" className="px-3 py-1.5 h-auto text-xs" onClick={() => handleDelete(emp.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <Modal 
        isOpen={modalState.isOpen} 
        onClose={() => setModalState({ isOpen: false })} 
        title={modalState.employee ? "Edit Employee" : "Add Employee"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Full Name" name="name" required defaultValue={modalState.employee?.name} />
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Email" name="email" type="email" defaultValue={modalState.employee?.email || ""} />
            <FormField label="Phone" name="phone" defaultValue={modalState.employee?.phone || ""} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Role" name="role" type="select" defaultValue={modalState.employee?.role || "cleaner"} options={[
              { label: "Cleaner", value: "cleaner" },
              { label: "Supervisor", value: "supervisor" },
              { label: "Admin", value: "admin" }
            ]} />
            <FormField label="Hourly Rate ($)" name="hourlyRate" type="number" required defaultValue={modalState.employee?.hourlyRate || "15.00"} />
          </div>
          <FormField label="Status" name="status" type="select" defaultValue={modalState.employee?.status || "active"} options={[
            { label: "Active", value: "active" },
            { label: "Inactive", value: "inactive" }
          ]} />
          
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setModalState({ isOpen: false })}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending}>Save Employee</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
