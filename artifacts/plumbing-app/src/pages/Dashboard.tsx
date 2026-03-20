import React, { useMemo, useState, useEffect } from "react";
import {
  useGetDashboardStats,
  useListChecklistItems,
  useUpdateChecklistItem,
  useListShifts,
  useListTodos,
  useListFollowups,
  useListExpenses,
} from "@workspace/api-client-react";
import {
  getGetDashboardStatsQueryKey,
  getListChecklistItemsQueryKey,
} from "@workspace/api-client-react";
import type {
  ListTodosQueryResult,
  ListFollowupsQueryResult,
  ListShiftsQueryResult,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card, Badge } from "@/components/ui";
import { cn, formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import {
  Briefcase,
  FileText,
  DollarSign,
  Users,
  CheckSquare,
  PhoneCall,
  CheckCircle2,
  Circle,
  CalendarDays,
  Receipt,
  ClipboardList,
  TrendingUp,
  Clock,
  MapPin,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Sun,
  Sunset,
  Moon,
  Waves,
  AlertCircle,
  Star,
} from "lucide-react";
import { useLocation } from "wouter";

type Todo = ListTodosQueryResult[number];
type Followup = ListFollowupsQueryResult[number];
type Shift = ListShiftsQueryResult[number];

function getGreeting(): { text: string; icon: typeof Sun; subtext: string } {
  const h = new Date().getHours();
  if (h < 12) return { text: "Good morning", icon: Sun, subtext: "Let's make today count." };
  if (h < 17) return { text: "Good afternoon", icon: Sunset, subtext: "Keep the momentum going." };
  return { text: "Good evening", icon: Moon, subtext: "Great work today." };
}

function getToday() {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function ProgressRing({ percent, size = 56, stroke = 5, color = "text-primary" }: { percent: number; size?: number; stroke?: number; color?: string }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-muted" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className={cn("progress-ring-circle", color)}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="fill-foreground text-[11px] font-bold">
        {percent}%
      </text>
    </svg>
  );
}

const quickActions = [
  { label: "New Work Order", icon: CalendarDays, href: "/bookings", gradient: "from-blue-500 to-blue-600" },
  { label: "Create Invoice", icon: FileText, href: "/invoices", gradient: "from-amber-500 to-orange-500" },
  { label: "Log Expense", icon: DollarSign, href: "/expenses", gradient: "from-rose-500 to-pink-500" },
  { label: "Add a Task", icon: ClipboardList, href: "/todos", gradient: "from-emerald-500 to-green-600" },
  { label: "Save Receipt", icon: Receipt, href: "/receipts", gradient: "from-teal-500 to-cyan-500" },
  { label: "Follow Up", icon: PhoneCall, href: "/followups", gradient: "from-violet-500 to-purple-600" },
  { label: "Add to PO", icon: ClipboardList, href: "/purchase-orders", gradient: "from-cyan-500 to-teal-500" },
  { label: "Dispatch Map", icon: MapPin, href: "/map", gradient: "from-indigo-500 to-blue-500" },
];

export default function Dashboard() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: checklist, isLoading: checklistLoading } = useListChecklistItems();
  const { data: shifts } = useListShifts();
  const { data: todos } = useListTodos();
  const { data: followups } = useListFollowups();
  const { data: expenses } = useListExpenses();
  const updateChecklist = useUpdateChecklistItem();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [financial, setFinancial] = useState<any>(null);

  useEffect(() => {
    fetch("/api/dashboard/financial").then(r => r.json()).then(setFinancial).catch(() => {});
  }, []);

  const handleToggleChecklist = (id: number, currentCompleted: boolean) => {
    updateChecklist.mutate(
      { id, data: { completed: !currentCompleted } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListChecklistItemsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        },
      }
    );
  };

  const greeting = getGreeting();
  const today = getToday();

  const categories = useMemo(() => {
    if (!checklist) return {};
    const grouped: Record<string, typeof checklist> = {};
    checklist.forEach((item) => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    });
    return grouped;
  }, [checklist]);

  const checklistProgress = useMemo(() => {
    if (!checklist || checklist.length === 0) return 0;
    return Math.round((checklist.filter((i) => i.completed).length / checklist.length) * 100);
  }, [checklist]);

  const todaysShifts = useMemo(() => {
    return shifts?.filter((s: Shift) => s.date === today) || [];
  }, [shifts, today]);

  const urgentTodos = useMemo(() => {
    return todos?.filter((t: Todo) => !t.completed).slice(0, 4) || [];
  }, [todos]);

  const pendingFollowups = useMemo(() => {
    return followups?.filter((f: Followup) => f.status === "pending").slice(0, 3) || [];
  }, [followups]);

  const recentExpenseTotal = useMemo(() => {
    if (!expenses) return 0;
    return expenses.reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0);
  }, [expenses]);

  if (statsLoading || checklistLoading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <p className="text-muted-foreground font-medium">Loading your dashboard...</p>
      </div>
    );
  }

  const statCards = [
    { title: "Today's Jobs", value: stats?.todayBookings || 0, icon: Briefcase, gradient: "from-blue-500 to-blue-600", bgLight: "bg-blue-500/10", textColor: "text-blue-600", trend: "work orders today" },
    { title: "Outstanding", value: stats?.pendingInvoices || 0, icon: FileText, gradient: "from-amber-500 to-orange-500", bgLight: "bg-amber-50", textColor: "text-amber-600", trend: "invoices unpaid" },
    { title: "Revenue", value: formatCurrency(stats?.totalRevenue), icon: TrendingUp, gradient: "from-emerald-500 to-green-600", bgLight: "bg-emerald-500/10", textColor: "text-emerald-600", trend: "total earned" },
    { title: "Technicians", value: stats?.activeEmployees || 0, icon: Users, gradient: "from-purple-500 to-violet-600", bgLight: "bg-purple-50", textColor: "text-purple-600", trend: "active in field" },
  ];

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="space-y-4 md:space-y-6 pb-8 md:pb-12">
      {/* ── Greeting + Live Pulse ── */}
      <div className="animate-fade-in">
        <div className="flex flex-col gap-3 mb-4">
          <div>
            <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-semibold uppercase tracking-widest mb-1.5">
              <CalendarDays className="w-3 h-3" />
              {todayFormatted}
            </div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-extrabold text-foreground tracking-tight leading-none">
              {greeting.text}
            </h1>
          </div>

          {/* Live pulse indicators — wrap on mobile */}
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground text-background text-[11px] font-bold">
              <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" /></span>
              {stats?.todayBookings || 0} jobs today
            </div>
            {(stats?.pendingInvoices || 0) > 0 && (
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-600 text-[11px] font-bold border border-amber-500/15">
                <FileText className="w-3 h-3" />
                {stats?.pendingInvoices} unpaid
              </div>
            )}
            {(stats?.pendingTodos || 0) > 0 && (
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/5 text-primary text-[11px] font-bold border border-primary/10">
                <CheckSquare className="w-3 h-3" />
                {stats?.pendingTodos} tasks
              </div>
            )}
          </div>
        </div>

        {/* ── Quick Actions — horizontal scroll pills ── */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-4 px-4 md:-mx-1 md:px-1 scrollbar-none">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.href)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/70 backdrop-blur-sm border border-border/50 hover:border-primary/20 hover:bg-primary/5 transition-all duration-200 group whitespace-nowrap shrink-0"
            >
              <div className={cn("p-1 rounded-md bg-gradient-to-br", action.gradient)}>
                <action.icon className="w-3 h-3 text-white" />
              </div>
              <span className="text-[11px] font-semibold text-foreground/70 group-hover:text-foreground transition-colors">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
        {statCards.map((stat, i) => (
          <div
            key={stat.title}
            className={cn(
              "glass-card card-hover p-3.5 md:p-5 flex flex-col gap-2 md:gap-3 cursor-pointer animate-fade-in-scale rounded-xl",
              `stagger-${i + 1}`
            )}
            onClick={() => {
              if (stat.title === "Today's Jobs") navigate("/bookings");
              if (stat.title === "Outstanding") navigate("/invoices");
              if (stat.title === "Revenue") navigate("/invoices");
              if (stat.title === "Team") navigate("/employees");
            }}
          >
            <div className={cn("p-2 md:p-2.5 rounded-lg md:rounded-xl bg-gradient-to-br shadow-md w-fit", stat.gradient)}>
              <stat.icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl md:text-2xl lg:text-3xl font-black text-foreground animate-count-up">{stat.value}</h3>
              <p className="text-[10px] md:text-[11px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">{stat.title}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 md:gap-6">
        {/* Left Column: Schedule + Tasks */}
        <div className="xl:col-span-5 space-y-4 md:space-y-6">
          {/* Today's Schedule */}
          <div className="glass-card rounded-2xl animate-fade-in-scale stagger-5">
            <div className="px-4 pt-4 pb-2.5 md:px-5 md:pt-5 md:pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10">
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
                <h2 className="font-display font-bold text-base md:text-lg">Today's Dispatch</h2>
              </div>
              <button onClick={() => navigate("/scheduling")} className="text-xs font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="px-4 pb-4 md:px-5 md:pb-5">
              {todaysShifts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground/60">
                  <Waves className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm font-medium">No jobs dispatched today</p>
                  <button onClick={() => navigate("/scheduling")} className="text-xs text-primary font-bold mt-2 hover:underline">
                    Dispatch a job
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {todaysShifts.slice(0, 4).map((shift: Shift) => (
                    <div key={shift.id} className="flex items-center gap-3 p-3 bg-background/50 rounded-xl hover:bg-blue-500/10/50 transition-colors">
                      <div className="w-1 h-10 rounded-full bg-blue-500/100 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">Employee #{shift.employeeId}</p>
                        <p className="text-xs text-muted-foreground">{shift.startTime} - {shift.endTime}</p>
                      </div>
                      {shift.notes && (
                        <span className="text-xs text-muted-foreground/60 truncate max-w-[80px]">{shift.notes}</span>
                      )}
                    </div>
                  ))}
                  {todaysShifts.length > 4 && (
                    <p className="text-xs text-center text-primary font-bold pt-1">+{todaysShifts.length - 4} more shifts</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Pending Tasks */}
          <div className="glass-card rounded-2xl animate-fade-in-scale stagger-6">
            <div className="px-4 pt-4 pb-2.5 md:px-5 md:pt-5 md:pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10">
                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                </div>
                <h2 className="font-display font-bold text-base md:text-lg">Pending Tasks</h2>
                {urgentTodos.length > 0 && (
                  <span className="text-xs font-bold text-white bg-rose-500 rounded-full w-5 h-5 flex items-center justify-center">{stats?.pendingTodos || 0}</span>
                )}
              </div>
              <button onClick={() => navigate("/todos")} className="text-xs font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="px-4 pb-4 md:px-5 md:pb-5">
              {urgentTodos.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground/60">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 text-emerald-200" />
                  <p className="text-sm font-medium">All caught up!</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {urgentTodos.map((todo: Todo) => (
                    <div key={todo.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-primary/[0.04] transition-colors">
                      <Circle className="w-4 h-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground/80 truncate">{todo.title}</p>
                        {todo.priority && (
                          <Badge className={cn(
                            "mt-1",
                            todo.priority === "high" ? "bg-rose-100 text-rose-700 border-rose-200" :
                            todo.priority === "medium" ? "bg-amber-100 text-amber-700 border-amber-200" :
                            "bg-muted text-muted-foreground border-border"
                          )}>
                            {todo.priority}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Follow-ups Due */}
          <div className="glass-card rounded-2xl animate-fade-in-scale stagger-7">
            <div className="px-4 pt-4 pb-2.5 md:px-5 md:pt-5 md:pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-violet-500/10">
                  <PhoneCall className="w-4 h-4 text-violet-600" />
                </div>
                <h2 className="font-display font-bold text-base md:text-lg">Follow-ups Due</h2>
              </div>
              <button onClick={() => navigate("/followups")} className="text-xs font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="px-4 pb-4 md:px-5 md:pb-5">
              {pendingFollowups.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground/60">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-200" />
                  <p className="text-sm font-medium">No follow-ups pending</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingFollowups.map((f: Followup) => (
                    <div key={f.id} className="flex items-start gap-3 p-3 bg-violet-500/100/5 rounded-xl border border-violet-500/10">
                      <AlertCircle className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-foreground truncate">{f.clientName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{(f as any).contactMethod} · Due {formatDate(f.dueDate)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center Column: Recent Bookings + Financials */}
        <div className="xl:col-span-4 space-y-4 md:space-y-6">
          {/* Recent Bookings */}
          <div className="glass-card rounded-2xl animate-fade-in-scale stagger-5">
            <div className="px-4 pt-4 pb-2.5 md:px-5 md:pt-5 md:pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Briefcase className="w-4 h-4 text-primary" />
                </div>
                <h2 className="font-display font-bold text-base md:text-lg">Recent Work Orders</h2>
              </div>
              <button onClick={() => navigate("/bookings")} className="text-xs font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="px-4 pb-4 md:px-5 md:pb-5 space-y-3">
              {!stats?.recentBookings?.length ? (
                <div className="text-center py-8 text-muted-foreground/60">
                  <CalendarDays className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm font-medium">No work orders yet</p>
                  <button onClick={() => navigate("/bookings")} className="text-xs text-primary font-bold mt-2 hover:underline">
                    Create first work order
                  </button>
                </div>
              ) : (
                stats.recentBookings.map((booking) => (
                  <div key={booking.id} className="group p-3 md:p-4 rounded-xl md:rounded-2xl bg-background/60 hover:bg-white/80 hover:shadow-lg border border-white/40 hover:border-primary/10 transition-all duration-300">
                    <div className="flex justify-between items-start mb-2">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-foreground truncate">{booking.clientName || "Walk-in Customer"}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Star className="w-3 h-3 text-amber-400" />
                          <span className="text-xs font-medium text-muted-foreground">{booking.serviceType}</span>
                        </div>
                      </div>
                      <Badge className={cn("shrink-0 ml-2", getStatusColor(booking.status))}>{booking.status}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {formatDate(booking.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {booking.time}
                      </span>
                      {booking.location && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3" />
                          {booking.location}
                        </span>
                      )}
                    </div>
                    {booking.estimatedPrice && (
                      <div className="mt-2 text-right">
                        <span className="text-sm font-bold text-emerald-600">{formatCurrency(booking.estimatedPrice)}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Enhanced Financial Dashboard */}
          <div className="glass-card rounded-2xl animate-fade-in-scale stagger-6">
            <div className="px-4 pt-4 pb-2.5 md:px-5 md:pt-5 md:pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
                <h2 className="font-display font-bold text-base md:text-lg">Financial Dashboard</h2>
              </div>
              <button onClick={() => navigate("/reports")} className="text-xs font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                Reports <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="px-4 pb-4 md:px-5 md:pb-5 space-y-4">
              {/* P&L Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 md:p-3.5 rounded-xl md:rounded-2xl bg-emerald-500/10 border border-emerald-100">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">This Month Revenue</p>
                  <p className="text-xl font-black text-emerald-700 mt-0.5">{formatCurrency(financial?.thisMonth?.revenue || stats?.totalRevenue || "0")}</p>
                  {financial?.revenueGrowth && parseFloat(financial.revenueGrowth) !== 0 && (
                    <p className={`text-[10px] font-bold mt-0.5 ${parseFloat(financial.revenueGrowth) > 0 ? "text-emerald-500" : "text-rose-500"}`}>
                      {parseFloat(financial.revenueGrowth) > 0 ? "↑" : "↓"} {Math.abs(parseFloat(financial.revenueGrowth))}% vs last month
                    </p>
                  )}
                </div>
                <div className="p-3 md:p-3.5 rounded-xl md:rounded-2xl bg-rose-500/5 border border-rose-500/10">
                  <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Expenses + Labor</p>
                  <p className="text-xl font-black text-rose-700 mt-0.5">{formatCurrency(parseFloat(financial?.thisMonth?.expenses || "0") + parseFloat(financial?.thisMonth?.labor || "0"))}</p>
                </div>
              </div>

              {/* Profit + MRR */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 md:p-3.5 rounded-xl md:rounded-2xl bg-gradient-to-r from-primary/5 to-cyan-500/5 border border-primary/10">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Net Profit</p>
                    <TrendingUp className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <p className="text-xl font-black text-primary mt-0.5">{formatCurrency(financial?.thisMonth?.profit || (parseFloat(stats?.totalRevenue || "0") - recentExpenseTotal))}</p>
                </div>
                <div className="p-3 md:p-3.5 rounded-xl md:rounded-2xl bg-purple-500/5 border border-purple-500/10">
                  <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Recurring MRR</p>
                  <p className="text-xl font-black text-purple-700 mt-0.5">{formatCurrency(financial?.mrr || "0")}</p>
                  {financial?.activeSubscriptions > 0 && <p className="text-[10px] text-purple-500 font-medium mt-0.5">{financial.activeSubscriptions} active subscriptions</p>}
                </div>
              </div>

              {/* AR + GET Tax */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                  <p className="text-[10px] font-bold text-amber-600 uppercase">Receivable</p>
                  <p className="text-base font-black text-amber-700">{formatCurrency(financial?.accountsReceivable?.total || "0")}</p>
                  <p className="text-[10px] text-amber-500">{financial?.accountsReceivable?.count || 0} unpaid</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-border">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">GET Tax Owed</p>
                  <p className="text-base font-black text-foreground/80">{formatCurrency(financial?.getOwed || "0")}</p>
                  <p className="text-[10px] text-muted-foreground/60">Hawaii GET 4.712%</p>
                </div>
              </div>

              {/* Revenue Chart */}
              {financial?.monthlyRevenue?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-2">Revenue Trend (6 months)</p>
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={(() => {
                        const revMap = Object.fromEntries((financial.monthlyRevenue || []).map((r: any) => [r.month, parseFloat(r.revenue)]));
                        const expMap = Object.fromEntries((financial.monthlyExpenses || []).map((e: any) => [e.month, parseFloat(e.expenses)]));
                        const months = new Set([...Object.keys(revMap), ...Object.keys(expMap)]);
                        return Array.from(months).sort().map(m => ({ month: m.slice(5), revenue: revMap[m] || 0, expenses: expMap[m] || 0 }));
                      })()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 94%)" />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} width={40} />
                        <Tooltip formatter={(v: number) => "$" + v.toFixed(2)} contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid hsl(220 13% 91%)", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)" }} />
                        <Bar dataKey="revenue" fill="#4338ca" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Top Clients */}
              {financial?.topClients?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-2">Top Clients</p>
                  <div className="space-y-1.5">
                    {financial.topClients.slice(0, 3).map((c: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-foreground/80 font-medium truncate">{c.client_name}</span>
                        <span className="text-emerald-600 font-bold shrink-0 ml-2">{formatCurrency(c.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Business Checklist */}
        <div className="xl:col-span-3 space-y-4 md:space-y-6">
          <div className="glass-card rounded-2xl animate-fade-in-scale stagger-7">
            <div className="px-4 pt-4 pb-3 md:px-5 md:pt-5 md:pb-4">
              <div className="flex items-center gap-3 mb-4">
                <ProgressRing percent={checklistProgress} />
                <div>
                  <h2 className="font-display font-bold text-base md:text-lg leading-tight">Startup Checklist</h2>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">
                    {checklist?.filter((i) => i.completed).length || 0} of {checklist?.length || 0} complete
                  </p>
                </div>
              </div>

              {checklistProgress === 100 && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-200 text-center">
                  <Sparkles className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                  <p className="text-sm font-bold text-emerald-700">All done! You're ready to go.</p>
                </div>
              )}

              <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                {Object.entries(categories).map(([category, items]) => {
                  const completedCount = items.filter((i) => i.completed).length;
                  const totalCount = items.length;
                  const percent = Math.round((completedCount / totalCount) * 100) || 0;
                  const isExpanded = expandedCategory === category;
                  const allDone = completedCount === totalCount;

                  return (
                    <div key={category} className="rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedCategory(isExpanded ? null : category)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 text-left transition-colors rounded-xl",
                          isExpanded ? "bg-primary/[0.04]" : "hover:bg-primary/[0.04]"
                        )}
                      >
                        <div className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0",
                          allDone ? "bg-emerald-100 text-emerald-600" : "bg-muted text-muted-foreground"
                        )}>
                          {allDone ? <CheckCircle2 className="w-4 h-4" /> : `${percent}%`}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm font-bold truncate", allDone ? "text-emerald-600" : "text-foreground")}>{category}</p>
                          <div className="w-full bg-muted rounded-full h-1 mt-1 overflow-hidden">
                            <div
                              className={cn("h-1 rounded-full animate-progress-fill", allDone ? "bg-emerald-500/100" : "bg-primary")}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                        <ChevronDown className={cn("w-4 h-4 text-muted-foreground/60 shrink-0 transition-transform", isExpanded && "rotate-180")} />
                      </button>

                      {isExpanded && (
                        <div className="px-2 pb-2 space-y-0.5">
                          {items.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => handleToggleChecklist(item.id, item.completed)}
                              className="w-full flex items-start gap-2.5 p-2 rounded-lg hover:bg-primary/[0.04] text-left transition-colors group disabled:opacity-50"
                              disabled={updateChecklist.isPending}
                            >
                              <div className="shrink-0 mt-0.5 transition-transform group-hover:scale-110">
                                {item.completed ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                ) : (
                                  <Circle className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary/50" />
                                )}
                              </div>
                              <p className={cn(
                                "text-xs font-medium leading-snug",
                                item.completed ? "text-muted-foreground/60 line-through" : "text-muted-foreground"
                              )}>
                                {item.title}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
