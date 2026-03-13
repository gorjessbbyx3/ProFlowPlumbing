import React, { useState } from "react";
import { useListInvoices, useCreateInvoice, useUpdateInvoice, useDeleteInvoice, useListBookings } from "@workspace/api-client-react";
import { getListInvoicesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/Layout";
import { Card, Button, Modal, FormField, Badge } from "@/components/ui";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { Edit2, Trash2, Plus, Download, CheckCircle } from "lucide-react";
import type { Invoice } from "@workspace/api-client-react";

export default function Invoices() {
  const queryClient = useQueryClient();
  const { data: invoices, isLoading } = useListInvoices();
  const { data: bookings } = useListBookings();
  
  const createMutation = useCreateInvoice();
  const updateMutation = useUpdateInvoice();
  const deleteMutation = useDeleteInvoice();

  const [modalState, setModalState] = useState<{ isOpen: boolean; invoice?: Invoice }>({ isOpen: false });

  const handleMarkPaid = (id: number) => {
    updateMutation.mutate(
      { id, data: { status: "paid", paidDate: new Date().toISOString() } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() }) }
    );
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const bookingIdStr = formData.get("bookingId") as string;
    
    // Attempt to pull clientName from booking if linked
    let clientName = formData.get("clientName") as string;
    if (bookingIdStr && bookings) {
      const b = bookings.find(x => x.id.toString() === bookingIdStr);
      if (b && !clientName) clientName = b.clientName || "";
    }

    const data = {
      bookingId: bookingIdStr ? parseInt(bookingIdStr, 10) : undefined,
      invoiceNumber: formData.get("invoiceNumber") as string,
      clientName: clientName,
      amount: formData.get("amount") as string,
      tax: formData.get("tax") as string || "0",
      total: formData.get("total") as string,
      status: formData.get("status") as string,
      dueDate: formData.get("dueDate") as string,
      description: formData.get("description") as string,
    };

    if (modalState.invoice) {
      updateMutation.mutate(
        { id: modalState.invoice.id, data },
        { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() }); setModalState({ isOpen: false }); } }
      );
    } else {
      createMutation.mutate(
        { data },
        { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() }); setModalState({ isOpen: false }); } }
      );
    }
  };

  // Auto-calculate total in form
  const handleAmountChange = (e: React.ChangeEvent<HTMLFormElement>) => {
    const amount = parseFloat(e.currentTarget.amount.value || "0");
    const tax = parseFloat(e.currentTarget.tax.value || "0");
    e.currentTarget.total.value = (amount + tax).toFixed(2);
  };

  return (
    <div className="animate-fade-in pb-12">
      <PageHeader 
        title="Invoices" 
        description="Billing and payment tracking."
        action={<Button onClick={() => setModalState({ isOpen: true })}><Plus className="w-4 h-4 mr-2"/> Create Invoice</Button>}
      />

      <Card className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-border/60">
              <th className="p-4 font-bold text-slate-600 text-sm tracking-wider uppercase">Invoice #</th>
              <th className="p-4 font-bold text-slate-600 text-sm tracking-wider uppercase">Client</th>
              <th className="p-4 font-bold text-slate-600 text-sm tracking-wider uppercase">Amount</th>
              <th className="p-4 font-bold text-slate-600 text-sm tracking-wider uppercase">Due Date</th>
              <th className="p-4 font-bold text-slate-600 text-sm tracking-wider uppercase">Status</th>
              <th className="p-4 font-bold text-slate-600 text-sm tracking-wider uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {isLoading ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-500">Loading invoices...</td></tr>
            ) : invoices?.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-500">No invoices generated yet.</td></tr>
            ) : (
              invoices?.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-4 font-bold text-slate-900">{inv.invoiceNumber}</td>
                  <td className="p-4 text-slate-700 font-medium">{inv.clientName || "-"}</td>
                  <td className="p-4 font-bold text-slate-900">{formatCurrency(inv.total)}</td>
                  <td className="p-4 text-slate-600">{formatDate(inv.dueDate)}</td>
                  <td className="p-4"><Badge className={getStatusColor(inv.status)}>{inv.status}</Badge></td>
                  <td className="p-4 text-right space-x-2">
                    {inv.status !== "paid" && (
                      <Button variant="outline" className="px-3 py-1.5 h-auto text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => handleMarkPaid(inv.id)}>
                        <CheckCircle className="w-3.5 h-3.5 mr-1" /> Pay
                      </Button>
                    )}
                    <div className="inline-flex opacity-0 group-hover:opacity-100 transition-opacity gap-2 align-middle">
                      <Button variant="ghost" className="px-3 py-1.5 h-auto text-xs" onClick={() => setModalState({ isOpen: true, invoice: inv })}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" className="px-3 py-1.5 h-auto text-xs text-rose-500 hover:bg-rose-50" onClick={() => { if(confirm('Delete invoice?')) deleteMutation.mutate({id: inv.id}, {onSuccess: () => queryClient.invalidateQueries({queryKey: getListInvoicesQueryKey()})}) }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <Modal isOpen={modalState.isOpen} onClose={() => setModalState({ isOpen: false })} title={modalState.invoice ? "Edit Invoice" : "Create Invoice"}>
        <form onSubmit={handleSubmit} onChange={handleAmountChange} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Invoice Number" name="invoiceNumber" required defaultValue={modalState.invoice?.invoiceNumber || `INV-${Math.floor(Math.random() * 10000)}`} />
            <FormField label="Status" name="status" type="select" required defaultValue={modalState.invoice?.status || "unpaid"} options={[
              { label: "Unpaid", value: "unpaid" },
              { label: "Paid", value: "paid" },
              { label: "Overdue", value: "overdue" },
              { label: "Cancelled", value: "cancelled" }
            ]} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Link Booking (Optional)" name="bookingId" type="select" defaultValue={modalState.invoice?.bookingId?.toString() || ""} options={bookings?.map(b => ({ label: `${b.clientName} - ${b.date}`, value: b.id.toString() })) || []} />
            <FormField label="Client Name" name="clientName" defaultValue={modalState.invoice?.clientName || ""} />
          </div>

          <FormField label="Description" name="description" type="textarea" defaultValue={modalState.invoice?.description || ""} />

          <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <FormField label="Amount ($)" name="amount" type="number" required defaultValue={modalState.invoice?.amount || "0"} />
            <FormField label="Tax ($)" name="tax" type="number" defaultValue={modalState.invoice?.tax || "0"} />
            <FormField label="Total ($)" name="total" type="number" required defaultValue={modalState.invoice?.total || "0"} />
          </div>

          <FormField label="Due Date" name="dueDate" type="date" required defaultValue={modalState.invoice?.dueDate || ""} />
          
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setModalState({ isOpen: false })}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending}>Save Invoice</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
