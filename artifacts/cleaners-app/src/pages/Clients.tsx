import React, { useState } from "react";
import { useListClients, useCreateClient, useUpdateClient, useDeleteClient } from "@workspace/api-client-react";
import { getListClientsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/Layout";
import { Card, Button, Modal, FormField } from "@/components/ui";
import { Edit2, Trash2, Plus, Mail, Phone, MapPin } from "lucide-react";
import type { Client } from "@workspace/api-client-react";

export default function Clients() {
  const queryClient = useQueryClient();
  const { data: clients, isLoading } = useListClients();
  const createMutation = useCreateClient();
  const updateMutation = useUpdateClient();
  const deleteMutation = useDeleteClient();

  const [modalState, setModalState] = useState<{ isOpen: boolean; client?: Client }>({ isOpen: false });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      address: formData.get("address") as string,
      notes: formData.get("notes") as string,
    };

    if (modalState.client) {
      updateMutation.mutate(
        { id: modalState.client.id, data },
        { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() }); setModalState({ isOpen: false }); } }
      );
    } else {
      createMutation.mutate(
        { data },
        { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() }); setModalState({ isOpen: false }); } }
      );
    }
  };

  return (
    <div className="animate-fade-in pb-12">
      <PageHeader 
        title="Clients" 
        description="Client directory and contact information."
        action={<Button onClick={() => setModalState({ isOpen: true })}><Plus className="w-4 h-4 mr-2"/> Add Client</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center p-8 text-slate-500">Loading clients...</div>
        ) : clients?.length === 0 ? (
          <div className="col-span-full text-center p-12 bg-white rounded-3xl border border-dashed border-slate-300 text-slate-500">No clients found.</div>
        ) : (
          clients?.map(client => (
            <Card key={client.id} className="p-6 flex flex-col group">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-xl">
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setModalState({ isOpen: true, client })} className="p-1.5 text-slate-400 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg"><Edit2 className="w-4 h-4"/></button>
                  <button onClick={() => { if(confirm('Delete client?')) deleteMutation.mutate({id: client.id}, {onSuccess: () => queryClient.invalidateQueries({queryKey: getListClientsQueryKey()})}) }} className="p-1.5 text-rose-400 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">{client.name}</h3>
              
              <div className="space-y-3 text-sm text-slate-600 flex-1">
                {client.phone && <div className="flex items-center gap-3"><Phone className="w-4 h-4 text-slate-400"/> {client.phone}</div>}
                {client.email && <div className="flex items-center gap-3"><Mail className="w-4 h-4 text-slate-400"/> {client.email}</div>}
                {client.address && <div className="flex items-start gap-3"><MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5"/> <span className="line-clamp-2">{client.address}</span></div>}
              </div>
            </Card>
          ))
        )}
      </div>

      <Modal isOpen={modalState.isOpen} onClose={() => setModalState({ isOpen: false })} title={modalState.client ? "Edit Client" : "Add Client"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Full Name / Company" name="name" required defaultValue={modalState.client?.name} />
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Email" name="email" type="email" defaultValue={modalState.client?.email || ""} />
            <FormField label="Phone" name="phone" defaultValue={modalState.client?.phone || ""} />
          </div>
          <FormField label="Address" name="address" defaultValue={modalState.client?.address || ""} />
          <FormField label="Notes" name="notes" type="textarea" defaultValue={modalState.client?.notes || ""} />
          
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setModalState({ isOpen: false })}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending}>Save Client</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
