import React, { useState } from "react";
import { useListBookings, useListEmployees, useListClients, useCreateBooking, useUpdateBooking, useDeleteBooking, useGenerateRecurringBookings } from "@workspace/api-client-react";
import { getListBookingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/Layout";
import { Card, Button, Modal, FormField, Badge } from "@/components/ui";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { Edit2, Trash2, Plus, Calendar as CalendarIcon, MapPin, Anchor, Car, Home, Camera, Repeat, FileText, Package, Navigation, ExternalLink, Share2 } from "lucide-react";
import type { Booking } from "@workspace/api-client-react";
import BookingPhotos from "@/components/BookingPhotos";
import SupplyUsageModal from "@/components/SupplyUsageModal";

export default function BookingsList() {
  const queryClient = useQueryClient();
  const { data: bookings, isLoading } = useListBookings();
  const { data: employees } = useListEmployees();
  const { data: clients } = useListClients();

  const createMutation = useCreateBooking();
  const updateMutation = useUpdateBooking();
  const deleteMutation = useDeleteBooking();
  const generateRecurring = useGenerateRecurringBookings();

  const [modalState, setModalState] = useState<{ isOpen: boolean; booking?: Booking }>({ isOpen: false });
  const [photoBookingId, setPhotoBookingId] = useState<number | null>(null);
  const [supplyBookingId, setSupplyBookingId] = useState<number | null>(null);
  const [invoiceMsg, setInvoiceMsg] = useState<string | null>(null);

  const handleAutoInvoice = async (bookingId: number) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/invoice`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        const fullUrl = window.location.origin + data.shareUrl;
        setInvoiceMsg(`Invoice ${data.invoiceNumber} created! Total: $${parseFloat(data.total).toFixed(2)}\n\nShare link: ${fullUrl}`);
        try { await navigator.clipboard.writeText(fullUrl); } catch {}
      } else {
        setInvoiceMsg(data.error || "Failed to create invoice");
      }
    } catch { setInvoiceMsg("Error creating invoice"); }
  };

  const handleNavigate = (booking: any) => {
    const loc = booking.location;
    if (booking.latitude && booking.longitude) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${booking.latitude},${booking.longitude}`, "_blank");
    } else if (loc) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(loc)}`, "_blank");
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const clientId = formData.get("clientId") as string;
    let clientInfo = { name: formData.get("clientName") as string, phone: formData.get("clientPhone") as string, email: formData.get("clientEmail") as string };
    if (clientId) {
      const c = clients?.find(cl => cl.id.toString() === clientId);
      if (c) clientInfo = { name: c.name, phone: c.phone || "", email: c.email || "" };
    }

    const recurrenceFrequency = formData.get("recurrenceFrequency") as string;

    const data: any = {
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
      recurrenceFrequency: recurrenceFrequency || undefined,
      recurrenceEndDate: formData.get("recurrenceEndDate") as string || undefined,
    };

    if (modalState.booking) {
      updateMutation.mutate(
        { id: modalState.booking.id, data },
        { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() }); setModalState({ isOpen: false }); } }
      );
    } else {
      createMutation.mutate(
        { data },
        {
          onSuccess: (newBooking: any) => {
            queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
            // Auto-generate recurring if frequency set
            if (recurrenceFrequency && newBooking?.id) {
              generateRecurring.mutate(
                { id: newBooking.id },
                { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() }) }
              );
            }
            setModalState({ isOpen: false });
          },
        }
      );
    }
  };

  const handleGenerateRecurring = (bookingId: number) => {
    generateRecurring.mutate(
      { id: bookingId },
      {
        onSuccess: (data: any) => {
          queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
          alert(`Generated ${data?.length || 0} future bookings!`);
        },
      }
    );
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
        action={<Button onClick={() => setModalState({ isOpen: true })}><Plus className="w-4 h-4 mr-2"/> Book a Job</Button>}
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
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(booking.status)}>{booking.status}</Badge>
                    {booking.recurrenceFrequency && (
                      <Badge className="bg-violet-100 text-violet-700 border-violet-200 flex items-center gap-1">
                        <Repeat className="w-3 h-3" /> {booking.recurrenceFrequency}
                      </Badge>
                    )}
                    {booking.parentBookingId && (
                      <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[10px]">recurring</Badge>
                    )}
                  </div>
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

              <div className="p-4 border-t border-border/50 bg-slate-50/50">
                <div className="flex gap-2 flex-wrap justify-end">
                  {booking.location && (
                    <Button variant="outline" className="h-10 px-3 text-xs" onClick={() => handleNavigate(booking)}>
                      <Navigation className="w-4 h-4 mr-1" /> Navigate
                    </Button>
                  )}
                  <Button variant="outline" className="h-10 px-3 text-xs" onClick={() => setPhotoBookingId(booking.id)}>
                    <Camera className="w-4 h-4 mr-1" /> Photos
                  </Button>
                  <Button variant="outline" className="h-10 px-3 text-xs" onClick={() => setSupplyBookingId(booking.id)}>
                    <Package className="w-4 h-4 mr-1" /> Supplies
                  </Button>
                  {booking.status === "completed" && (
                    <Button variant="outline" className="h-10 px-3 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => handleAutoInvoice(booking.id)}>
                      <FileText className="w-4 h-4 mr-1" /> Invoice
                    </Button>
                  )}
                  {booking.recurrenceFrequency && (
                    <Button variant="outline" className="h-10 px-3 text-xs" onClick={() => handleGenerateRecurring(booking.id)} disabled={generateRecurring.isPending}>
                      <Repeat className="w-4 h-4 mr-1" /> Generate
                    </Button>
                  )}
                  <Button variant="outline" className="h-10 px-3 text-xs" onClick={() => setModalState({ isOpen: true, booking })}>
                    <Edit2 className="w-4 h-4 mr-1" /> Edit
                  </Button>
                  <Button variant="destructive" className="h-10 px-3 text-xs" onClick={() => { if(confirm('Delete booking?')) deleteMutation.mutate({ id: booking.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() })}) }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Photo Modal */}
      {photoBookingId && (
        <BookingPhotos bookingId={photoBookingId} onClose={() => setPhotoBookingId(null)} />
      )}

      {/* Supply Usage Modal */}
      {supplyBookingId && (
        <SupplyUsageModal bookingId={supplyBookingId} onClose={() => { setSupplyBookingId(null); queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() }); }} />
      )}

      {/* Invoice Message */}
      {invoiceMsg && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setInvoiceMsg(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-emerald-50"><FileText className="w-5 h-5 text-emerald-600" /></div>
              <h3 className="font-bold text-lg">Invoice Created</h3>
            </div>
            <p className="text-sm text-slate-600 whitespace-pre-line">{invoiceMsg}</p>
            <p className="text-xs text-slate-400 mt-2">Link copied to clipboard</p>
            <button onClick={() => setInvoiceMsg(null)} className="mt-4 w-full bg-primary text-white py-2.5 rounded-xl font-bold text-sm">Done</button>
          </div>
        </div>
      )}

      <Modal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false })}
        title={modalState.booking ? "Edit Booking" : "Book a Job"}
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

          {/* Recurring Section */}
          <div className="p-4 bg-violet-50 border border-violet-100 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Repeat className="w-4 h-4 text-violet-600" />
              <h4 className="font-bold text-violet-800 text-sm">Recurring Booking</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Repeat" name="recurrenceFrequency" type="select" defaultValue={modalState.booking?.recurrenceFrequency || ""} options={[
                { label: "No repeat", value: "" },
                { label: "Weekly", value: "weekly" },
                { label: "Every 2 weeks", value: "biweekly" },
                { label: "Monthly", value: "monthly" },
              ]} />
              <FormField label="Until (optional)" name="recurrenceEndDate" type="date" defaultValue={modalState.booking?.recurrenceEndDate || ""} />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setModalState({ isOpen: false })}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending}>Save Booking</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
