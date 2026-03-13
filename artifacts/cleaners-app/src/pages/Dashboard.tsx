import React from "react";
import { useGetDashboardStats, useListChecklistItems, useUpdateChecklistItem } from "@workspace/api-client-react";
import { getGetDashboardStatsQueryKey, getListChecklistItemsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, Badge } from "@/components/ui";
import { PageHeader } from "@/components/Layout";
import { cn, formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { Briefcase, FileText, DollarSign, Users, CheckSquare, PhoneCall, CheckCircle2, Circle } from "lucide-react";
const bgImage = `${import.meta.env.BASE_URL}images/dashboard-bg.png`;

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: checklist, isLoading: checklistLoading } = useListChecklistItems();
  const updateChecklist = useUpdateChecklistItem();

  const handleToggleChecklist = (id: number, currentCompleted: boolean) => {
    updateChecklist.mutate(
      { id, data: { completed: !currentCompleted } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListChecklistItemsQueryKey() }) }
    );
  };

  // Group checklist items by category
  const categories = React.useMemo(() => {
    if (!checklist) return {};
    const grouped: Record<string, typeof checklist> = {};
    checklist.forEach(item => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    });
    return grouped;
  }, [checklist]);

  if (statsLoading || checklistLoading) {
    return <div className="p-8 text-center text-slate-500 font-medium animate-pulse">Loading dashboard data...</div>;
  }

  const statCards = [
    { title: "Today's Bookings", value: stats?.todayBookings || 0, icon: Briefcase, color: "bg-blue-500" },
    { title: "Pending Invoices", value: stats?.pendingInvoices || 0, icon: FileText, color: "bg-amber-500" },
    { title: "Total Revenue", value: formatCurrency(stats?.totalRevenue), icon: DollarSign, color: "bg-emerald-500" },
    { title: "Active Employees", value: stats?.activeEmployees || 0, icon: Users, color: "bg-purple-500" },
    { title: "Pending Todos", value: stats?.pendingTodos || 0, icon: CheckSquare, color: "bg-rose-500" },
    { title: "Follow-ups Due", value: stats?.pendingFollowups || 0, icon: PhoneCall, color: "bg-indigo-500" },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Decorative Hero */}
      <div className="relative rounded-3xl overflow-hidden shadow-xl animate-fade-in bg-primary">
        <img 
          src={`${import.meta.env.BASE_URL}images/dashboard-bg.png`} 
          alt="Dashboard Background" 
          className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-40"
        />
        <div className="relative z-10 p-8 md:p-12">
          <h1 className="text-3xl md:text-5xl font-display font-extrabold text-white mb-2">Welcome to 808 Cleaners</h1>
          <p className="text-primary-foreground/80 font-medium text-lg max-w-2xl">
            Here's what's happening with your business today. Keep track of jobs, staff, and finances all in one place.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in stagger-1">
        {statCards.map((stat, i) => (
          <Card key={i} className="p-6 flex items-center gap-5 hover:-translate-y-1 transition-transform duration-300">
            <div className={`p-4 rounded-2xl text-white shadow-lg ${stat.color}`}>
              <stat.icon className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{stat.title}</p>
              <h3 className="text-3xl font-black text-slate-900 mt-1">{stat.value}</h3>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Recent Bookings */}
        <div className="xl:col-span-1 space-y-6 animate-fade-in stagger-2">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold font-display">Recent Bookings</h2>
          </div>
          <div className="space-y-4">
            {stats?.recentBookings?.length === 0 ? (
              <Card className="p-8 text-center text-slate-500">No recent bookings found.</Card>
            ) : (
              stats?.recentBookings?.map((booking) => (
                <Card key={booking.id} className="p-5 border-l-4 border-l-primary">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-lg text-slate-900">{booking.clientName || "Unknown Client"}</h4>
                      <p className="text-sm text-slate-500 font-medium">{booking.serviceType}</p>
                    </div>
                    <Badge className={getStatusColor(booking.status)}>{booking.status}</Badge>
                  </div>
                  <div className="text-sm text-slate-600 mt-3 flex items-center justify-between bg-slate-50 p-2 rounded-lg">
                    <span className="font-medium">{formatDate(booking.date)}</span>
                    <span className="font-bold text-primary">{booking.time}</span>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* New Business Checklist */}
        <div className="xl:col-span-2 space-y-6 animate-fade-in stagger-3">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold font-display">New Business Checklist</h2>
            <Badge className="bg-primary/10 text-primary border-primary/20 text-sm py-1">Startup Guide</Badge>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2">
            {Object.entries(categories).map(([category, items]) => {
              const completedCount = items.filter(i => i.completed).length;
              const totalCount = items.length;
              const percent = Math.round((completedCount / totalCount) * 100) || 0;

              return (
                <Card key={category} className="flex flex-col">
                  <div className="p-5 border-b border-border/50 bg-slate-50/50 flex flex-col gap-3">
                    <div className="flex justify-between items-end">
                      <h3 className="font-bold text-slate-900">{category}</h3>
                      <span className="text-sm font-bold text-primary">{completedCount}/{totalCount}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div className="bg-primary h-2 rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                  <div className="p-2 flex-1">
                    {items.map(item => (
                      <button
                        key={item.id}
                        onClick={() => handleToggleChecklist(item.id, item.completed)}
                        className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 text-left transition-colors group disabled:opacity-50"
                        disabled={updateChecklist.isPending}
                      >
                        <div className="shrink-0 mt-0.5 text-primary transition-transform group-hover:scale-110">
                          {item.completed ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5 text-slate-300 group-hover:text-primary/50" />}
                        </div>
                        <div>
                          <p className={cn("text-sm font-semibold transition-colors", item.completed ? "text-slate-400 line-through" : "text-slate-700")}>
                            {item.title}
                          </p>
                          {item.description && !item.completed && (
                            <p className="text-xs text-slate-500 mt-1 leading-snug">{item.description}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
