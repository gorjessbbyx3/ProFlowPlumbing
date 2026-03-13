import React, { useState } from "react";
import { useListShifts, useListEmployees, useCreateShift, useUpdateShift, useDeleteShift } from "@workspace/api-client-react";
import { getListShiftsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/Layout";
import { Card, Button, Modal, FormField, Badge } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { Plus, Clock, User, FileText, Trash2, Edit, CalendarDays } from "lucide-react";
import type { ListShiftsQueryResult } from "@workspace/api-client-react";

type Shift = ListShiftsQueryResult[number];

export default function Scheduling() {
  const queryClient = useQueryClient();
  const { data: shifts, isLoading } = useListShifts();
  const { data: employees } = useListEmployees();
  
  const createMutation = useCreateShift();
  const updateMutation = useUpdateShift();
  const deleteMutation = useDeleteShift();

  const [modalState, setModalState] = useState<{ isOpen: boolean; shift?: Shift }>({ isOpen: false });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      employeeId: parseInt(formData.get("employeeId") as string, 10),
      date: formData.get("date") as string,
      startTime: formData.get("startTime") as string,
      endTime: formData.get("endTime") as string,
      notes: formData.get("notes") as string,
    };

    if (modalState.shift) {
      updateMutation.mutate(
        { id: modalState.shift.id, data },
        { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListShiftsQueryKey() }); setModalState({ isOpen: false }); } }
      );
    } else {
      createMutation.mutate(
        { data },
        { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListShiftsQueryKey() }); setModalState({ isOpen: false }); } }
      );
    }
  };

  const getEmployeeName = (id: number) => employees?.find(e => e.id === id)?.name || "Unknown";

  return (
    <div className="animate-fade-in pb-12">
      <PageHeader 
        title="Schedule" 
        description="Manage employee shifts and availability."
        action={<Button onClick={() => setModalState({ isOpen: true })}><Plus className="w-4 h-4 mr-2"/> Assign Shift</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-3 text-center p-8 text-slate-500">Loading schedule...</div>
        ) : shifts?.length === 0 ? (
          <div className="col-span-3 text-center p-12 bg-white rounded-3xl border border-dashed border-slate-300">
            <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-1">No shifts scheduled</h3>
            <p className="text-slate-500 mb-4">Click "Assign Shift" to schedule an employee.</p>
          </div>
        ) : (
          shifts?.map(shift => (
            <Card key={shift.id} className="p-5 flex flex-col group relative">
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <button onClick={() => setModalState({ isOpen: true, shift })} className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => { if(confirm('Delete shift?')) deleteMutation.mutate({ id: shift.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListShiftsQueryKey() })}) }} className="p-1.5 bg-rose-100 text-rose-600 rounded-lg hover:bg-rose-200">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="mb-4">
                <Badge className="bg-primary/10 text-primary border-primary/20 mb-2">{formatDate(shift.date)}</Badge>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-slate-400" />
                  {getEmployeeName(shift.employeeId)}
                </h3>
              </div>
              <div className="space-y-2 mt-auto">
                <div className="flex items-center gap-3 text-slate-600 text-sm font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <Clock className="w-4 h-4 text-primary" />
                  {shift.startTime} - {shift.endTime}
                </div>
                {shift.notes && (
                  <div className="flex items-start gap-3 text-slate-500 text-sm bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <FileText className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <p className="italic leading-snug">{shift.notes}</p>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      <Modal 
        isOpen={modalState.isOpen} 
        onClose={() => setModalState({ isOpen: false })} 
        title={modalState.shift ? "Edit Shift" : "Assign Shift"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Employee" name="employeeId" type="select" required defaultValue={modalState.shift?.employeeId?.toString() || ""} options={employees?.map(e => ({ label: e.name, value: e.id.toString() })) || []} />
          <FormField label="Date" name="date" type="date" required defaultValue={modalState.shift?.date} />
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Start Time" name="startTime" type="time" required defaultValue={modalState.shift?.startTime} />
            <FormField label="End Time" name="endTime" type="time" required defaultValue={modalState.shift?.endTime} />
          </div>
          <FormField label="Notes" name="notes" type="textarea" defaultValue={modalState.shift?.notes || ""} />
          
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setModalState({ isOpen: false })}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending}>Save Shift</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
