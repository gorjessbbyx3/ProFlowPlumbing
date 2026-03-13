import React, { useState } from "react";
import { useListBookings, useListEmployees, useListClients, useCreateBooking, useUpdateBooking, useDeleteBooking } from "@workspace/api-client-react";
import { getListBookingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/Layout";
import { Card, Button, Modal, FormField, Badge } from "@/components/ui";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { Edit2, Trash2, Plus, Calendar as CalendarIcon, MapPin, Anchor, Car, Home } from "lucide-react";
import type { Booking } from "@workspace/api-client-react";

export default function Bookings() {
  const queryClient = useQueryClient();
  const { data: bookings, isLoading } = useListBookings();
  const { data: employees } = useListEmployees();
  const { data: clients } = useListClients();
  
  const createMutation = useCreateBooking();
  const updateMutation = useUpdateBooking();
  const deleteMutation = useDeleteBooking();

  const [modalState, setModalState] = useState<{ isOpen: boolean; booking?: Booking }>({ isOpen: false });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Auto-fill client info if a client was selected
    const clientId = formData.get("clientId") as string;
    let clientInfo = { name: formData.get("clientName") as string, phone: formData.get("clientPhone") as string, email: formData.get("clientEmail") as string };
    if (clientId) {
      const c = clients?.find(cl => cl.id.toString() === clientId);
      if (c) clientInfo = { name: c.name, phone: c.phone || "", email: c.email || "" };
    }

    const data = {
      clientId: clientId ? parseInt(clientId, 10) : undefined,
      employeeId: formData.get("employeeId") ? parseInt(formData.get("employeeId") as string, 10) : undefined,
      serviceType: formData.get("serviceType") as string,
      status: formData.get("status") as string,
      date: formData.get("date") as string,
      time: formData.get("time") as string,
      location: formData.get("location") as string,
      notes: formData.get("notes") as string,
      estimatedPrice: formData.get("estimatedPrice") as string,
      clientName: clientInfo.name,
      clientPhone: clientInfo.phone,
      clientEmail: clientInfo.email,
    };

    if (modalState.booking) {
      updateMutation.mutate(
        { id: modalState.booking.id, data },
        { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() }); setModalState({ isOpen: false }); } }
      );
    } else {
      createMutation.mutate(
        { data },
        { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() }); setModalState({ isOpen: false }); } }
      );
    }
  };

  const getServiceIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('boat')) return <Anchor className="w-4 h-4" />;
    if (t.includes('car')) return <Car className="w-4 h-4" />;
    return <Home className="w-4 h-4" />;
  };

  return (
    <div className="animate-fade-in pb-12">
      <PageHeader 
        title="Bookings" 
        description="Manage client jobs and service appointments."
        action={<Button onClick={() => setModalState({ isOpen: true })}><Plus className="w-4 h-4 mr-2"/> New Booking</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center p-8 text-slate-500">Loading bookings...</div>
        ) : bookings?.length === 0 ? (
           <div className="col-span-full text-center p-12 bg-white rounded-3xl border border-dashed border-slate-300">
             <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
             <h3 className="text-lg font-bold text-slate-900">No bookings yet</h3>
           </div>
        ) : (
          bookings?.map(booking => (
            <Card key={booking.id} className="flex flex-col group relative">
              <div className="p-5 border-b border-border/50 flex justify-between items-start bg-slate-50/50">
                <div>
                  <Badge className={getStatusColor(booking.status)}>{booking.status}</Badge>
                  <h3 className="text-xl font-bold text-slate-900 mt-2">{booking.clientName}</h3>
                  <p className="text-sm text-slate-500 font-medium flex items-center gap-1.5 mt-1">
                    {getServiceIcon(booking.serviceType)} {booking.serviceType}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-primary">{formatCurrency(booking.estimatedPrice)}</p>
                </div>
              </div>
              
              <div className="p-5 space-y-3 flex-1">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <CalendarIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{formatDate(booking.date)}</p>
                    <p>{booking.time}</p>
                  </div>
                </div>
                
                {booking.location && (
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <p className="truncate" title={booking.location}>{booking.location}</p>
                  </div>
                )}
                
                {booking.employeeId && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-border/50 text-sm">
                    <span className="font-semibold text-slate-700">Assigned: </span>
                    <span className="text-slate-600">{employees?.find(e => e.id === booking.employeeId)?.name || "Unknown"}</span>
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t border-border/50 bg-slate-50/50 flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="outline" className="h-9 px-3 text-xs" onClick={() => setModalState({ isOpen: true, booking })}>
                  <Edit2 className="w-4 h-4 mr-2" /> Edit
                </Button>
                <Button variant="destructive" className="h-9 px-3 text-xs" onClick={() => { if(confirm('Delete booking?')) deleteMutation.mutate({ id: booking.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() })}) }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      <Modal 
        isOpen={modalState.isOpen} 
        onClose={() => setModalState({ isOpen: false })} 
        title={modalState.booking ? "Edit Booking" : "New Booking"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Existing Client (Optional)" name="clientId" type="select" defaultValue={modalState.booking?.clientId?.toString() || ""} options={clients?.map(c => ({ label: c.name, value: c.id.toString() })) || []} />
            <FormField label="Assign Employee" name="employeeId" type="select" defaultValue={modalState.booking?.employeeId?.toString() || ""} options={employees?.map(e => ({ label: e.name, value: e.id.toString() })) || []} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-primary/5 border border-primary/10 rounded-2xl">
            <FormField label="Client Name" name="clientName" required={!modalState.booking?.clientId} defaultValue={modalState.booking?.clientName || ""} />
            <FormField label="Phone" name="clientPhone" defaultValue={modalState.booking?.clientPhone || ""} />
            <FormField label="Email" name="clientEmail" defaultValue={modalState.booking?.clientEmail || ""} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Service Type" name="serviceType" type="select" required defaultValue={modalState.booking?.serviceType || "Car Detail"} options={[
              { label: "Car Detail", value: "Car Detail" },
              { label: "Boat Detail", value: "Boat Detail" },
              { label: "Condo Cleaning", value: "Condo Cleaning" },
              { label: "Other", value: "Other" }
            ]} />
            <FormField label="Status" name="status" type="select" defaultValue={modalState.booking?.status || "scheduled"} options={[
              { label: "Scheduled", value: "scheduled" },
              { label: "In Progress", value: "in progress" },
              { label: "Completed", value: "completed" },
              { label: "Cancelled", value: "cancelled" }
            ]} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Date" name="date" type="date" required defaultValue={modalState.booking?.date} />
            <FormField label="Time" name="time" type="time" required defaultValue={modalState.booking?.time} />
          </div>

          <FormField label="Location" name="location" defaultValue={modalState.booking?.location || ""} />
          <FormField label="Estimated Price ($)" name="estimatedPrice" type="number" defaultValue={modalState.booking?.estimatedPrice || ""} />
          <FormField label="Notes" name="notes" type="textarea" defaultValue={modalState.booking?.notes || ""} />
          
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setModalState({ isOpen: false })}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending}>Save Booking</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
