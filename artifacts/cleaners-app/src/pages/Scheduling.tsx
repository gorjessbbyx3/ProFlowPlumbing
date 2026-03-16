import React, { useState, useMemo } from "react";
import { useListShifts, useListEmployees, useCreateShift, useUpdateShift, useDeleteShift } from "@workspace/api-client-react";
import { getListShiftsQueryKey } from "@workspace/api-client-react";
import type { ListShiftsQueryResult, ListEmployeesQueryResult } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/Layout";
import { Card, Button, Modal, FormField, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Plus, ChevronLeft, ChevronRight, Trash2, Edit, CalendarDays } from "lucide-react";

type Shift = ListShiftsQueryResult[number];
type Employee = ListEmployeesQueryResult[number];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FULL_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function getWeekDates(baseDate: Date): Date[] {
  const day = baseDate.getDay();
  const start = new Date(baseDate);
  start.setDate(start.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function formatDateISO(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDateShort(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function Scheduling() {
  const queryClient = useQueryClient();
  const { data: shifts, isLoading } = useListShifts();
  const { data: employees } = useListEmployees();
  const createMutation = useCreateShift();
  const updateMutation = useUpdateShift();
  const deleteMutation = useDeleteShift();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [modalState, setModalState] = useState<{ isOpen: boolean; shift?: Shift; prefillDate?: string }>({ isOpen: false });

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);
  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];

  const shiftsByDate = useMemo(() => {
    const map: Record<string, Shift[]> = {};
    shifts?.forEach(shift => {
      if (!map[shift.date]) map[shift.date] = [];
      map[shift.date].push(shift);
    });
    return map;
  }, [shifts]);

  const getEmployeeName = (id: number) => employees?.find((e: Employee) => e.id === id)?.name || "Unknown";

  const prevWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };

  const nextWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

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

  const handleDelete = (id: number) => {
    if (confirm("Delete this shift?")) {
      deleteMutation.mutate({ id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListShiftsQueryKey() }) });
    }
  };

  const todayStr = formatDateISO(new Date());

  const weekLabel = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Weekly Schedule"
        subtitle="View and manage employee shifts by week"
        action={<Button onClick={() => setModalState({ isOpen: true })}><Plus className="w-4 h-4 mr-2" /> Assign Shift</Button>}
      />

      <div className="flex items-center justify-between bg-white rounded-2xl border border-border/60 p-4 shadow-sm">
        <button onClick={prevWeek} className="p-2 rounded-xl hover:bg-slate-100 transition"><ChevronLeft className="w-5 h-5" /></button>
        <div className="flex items-center gap-3">
          <CalendarDays className="w-5 h-5 text-primary" />
          <span className="font-bold text-lg">{weekLabel}</span>
          <button onClick={goToday} className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full hover:bg-primary/20 transition">Today</button>
        </div>
        <button onClick={nextWeek} className="p-2 rounded-xl hover:bg-slate-100 transition"><ChevronRight className="w-5 h-5" /></button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading schedule...</div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {weekDates.map((date, i) => {
            const dateStr = formatDateISO(date);
            const dayShifts = shiftsByDate[dateStr] || [];
            const isToday = dateStr === todayStr;

            return (
              <div
                key={dateStr}
                className={cn(
                  "min-h-[200px] rounded-2xl border p-3 flex flex-col transition-colors",
                  isToday ? "bg-primary/5 border-primary/30" : "bg-white border-border/60"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-center">
                    <div className={cn("text-xs font-bold uppercase tracking-wider", isToday ? "text-primary" : "text-slate-400")}>{DAYS[i]}</div>
                    <div className={cn(
                      "text-lg font-bold mt-0.5",
                      isToday ? "text-primary bg-primary/10 w-8 h-8 rounded-full flex items-center justify-center mx-auto" : "text-slate-700"
                    )}>
                      {date.getDate()}
                    </div>
                  </div>
                  <button
                    onClick={() => setModalState({ isOpen: true, prefillDate: dateStr })}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-primary transition"
                    title="Add shift"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 space-y-1.5 overflow-y-auto">
                  {dayShifts.map(shift => (
                    <div
                      key={shift.id}
                      className="bg-primary/10 border border-primary/20 rounded-lg p-2 text-xs group relative cursor-pointer hover:bg-primary/15 transition"
                    >
                      <div className="font-bold text-primary truncate">{getEmployeeName(shift.employeeId)}</div>
                      <div className="text-slate-500 mt-0.5">{shift.startTime} - {shift.endTime}</div>
                      {shift.notes && <div className="text-slate-400 truncate mt-0.5 italic">{shift.notes}</div>}
                      <div className="absolute top-1 right-1 flex gap-1">
                        <button onClick={() => setModalState({ isOpen: true, shift })} className="p-0.5 bg-white rounded shadow-sm hover:bg-slate-100">
                          <Edit className="w-3 h-3 text-slate-500" />
                        </button>
                        <button onClick={() => handleDelete(shift.id)} className="p-0.5 bg-white rounded shadow-sm hover:bg-rose-50">
                          <Trash2 className="w-3 h-3 text-rose-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false })}
        title={modalState.shift ? "Edit Shift" : "Assign Shift"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Employee" name="employeeId" type="select" required defaultValue={modalState.shift?.employeeId?.toString() || ""} options={employees?.map((e: Employee) => ({ label: e.name, value: e.id.toString() })) || []} />
          <FormField label="Date" name="date" type="date" required defaultValue={modalState.shift?.date || modalState.prefillDate || ""} />
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
