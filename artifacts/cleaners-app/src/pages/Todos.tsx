import React, { useState } from "react";
import { useListTodos, useCreateTodo, useUpdateTodo, useDeleteTodo } from "@workspace/api-client-react";
import { getListTodosQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/Layout";
import { Card, Button, Modal, FormField, Badge } from "@/components/ui";
import { formatDate, cn } from "@/lib/utils";
import { Edit2, Trash2, Plus, CheckCircle2, Circle, AlertCircle } from "lucide-react";
import type { Todo } from "@workspace/api-client-react";

export default function Todos() {
  const queryClient = useQueryClient();
  const { data: todos, isLoading } = useListTodos();
  
  const createMutation = useCreateTodo();
  const updateMutation = useUpdateTodo();
  const deleteMutation = useDeleteTodo();

  const [modalState, setModalState] = useState<{ isOpen: boolean; todo?: Todo }>({ isOpen: false });

  const handleToggle = (todo: Todo) => {
    updateMutation.mutate(
      { id: todo.id, data: { completed: !todo.completed } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTodosQueryKey() }) }
    );
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      priority: formData.get("priority") as string,
      dueDate: formData.get("dueDate") as string,
      completed: modalState.todo?.completed || false,
    };

    if (modalState.todo) {
      updateMutation.mutate(
        { id: modalState.todo.id, data },
        { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListTodosQueryKey() }); setModalState({ isOpen: false }); } }
      );
    } else {
      createMutation.mutate(
        { data },
        { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListTodosQueryKey() }); setModalState({ isOpen: false }); } }
      );
    }
  };

  const getPriorityColor = (p: string) => {
    if (p === 'high') return 'text-rose-500 bg-rose-50 border-rose-200';
    if (p === 'medium') return 'text-amber-500 bg-amber-50 border-amber-200';
    return 'text-emerald-500 bg-emerald-50 border-emerald-200';
  };

  return (
    <div className="animate-fade-in pb-12">
      <PageHeader 
        title="To-Do List" 
        description="Track your daily operational tasks."
        action={<Button onClick={() => setModalState({ isOpen: true })}><Plus className="w-4 h-4 mr-2"/> Add Task</Button>}
      />

      <div className="max-w-4xl mx-auto space-y-4">
        {isLoading ? (
          <div className="text-center p-8 text-slate-500">Loading tasks...</div>
        ) : todos?.length === 0 ? (
          <Card className="text-center p-12 text-slate-500">No tasks on your list. Enjoy your day!</Card>
        ) : (
          todos?.sort((a,b) => Number(a.completed) - Number(b.completed)).map(todo => (
            <Card key={todo.id} className={cn("p-4 flex items-start gap-4 transition-all group", todo.completed ? "opacity-60 bg-slate-50" : "bg-white")}>
              <button onClick={() => handleToggle(todo)} className="mt-1 shrink-0 transition-transform hover:scale-110">
                {todo.completed ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <Circle className="w-6 h-6 text-slate-300 hover:text-primary" />}
              </button>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className={cn("text-lg font-bold truncate", todo.completed ? "line-through text-slate-500" : "text-slate-900")}>
                    {todo.title}
                  </h3>
                  {!todo.completed && <Badge className={getPriorityColor(todo.priority)}>{todo.priority}</Badge>}
                </div>
                {todo.description && <p className="text-sm text-slate-600 mb-2 line-clamp-2">{todo.description}</p>}
                {todo.dueDate && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <AlertCircle className="w-3.5 h-3.5" /> Due: {formatDate(todo.dueDate)}
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button onClick={() => setModalState({ isOpen: true, todo })} className="p-2 text-slate-400 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg"><Edit2 className="w-4 h-4"/></button>
                <button onClick={() => { if(confirm('Delete task?')) deleteMutation.mutate({id: todo.id}, {onSuccess: () => queryClient.invalidateQueries({queryKey: getListTodosQueryKey()})}) }} className="p-2 text-rose-400 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg"><Trash2 className="w-4 h-4"/></button>
              </div>
            </Card>
          ))
        )}
      </div>

      <Modal isOpen={modalState.isOpen} onClose={() => setModalState({ isOpen: false })} title={modalState.todo ? "Edit Task" : "Add Task"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Task Title" name="title" required defaultValue={modalState.todo?.title} />
          <FormField label="Description" name="description" type="textarea" defaultValue={modalState.todo?.description || ""} />
          
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Priority" name="priority" type="select" required defaultValue={modalState.todo?.priority || "medium"} options={[
              { label: "High", value: "high" },
              { label: "Medium", value: "medium" },
              { label: "Low", value: "low" }
            ]} />
            <FormField label="Due Date" name="dueDate" type="date" defaultValue={modalState.todo?.dueDate || ""} />
          </div>
          
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setModalState({ isOpen: false })}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending}>Save Task</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
