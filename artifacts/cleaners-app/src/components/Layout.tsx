import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, Users, CalendarDays, BookOpenCheck, 
  BriefcaseBusiness, FileText, ReceiptText, CreditCard, 
  Clock, CheckSquare, PhoneCall, Megaphone, LineChart,
  Menu, X
} from "lucide-react";
import logo from "@assets/Untitled-1_1773440534890.png";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Bookings", href: "/bookings", icon: BookOpenCheck },
  { name: "Scheduling", href: "/scheduling", icon: CalendarDays },
  { name: "Employees", href: "/employees", icon: Users },
  { name: "Clients", href: "/clients", icon: BriefcaseBusiness },
  { name: "Invoices", href: "/invoices", icon: FileText },
  { name: "Receipts", href: "/receipts", icon: ReceiptText },
  { name: "Expenses", href: "/expenses", icon: CreditCard },
  { name: "Labor Tracker", href: "/labor", icon: Clock },
  { name: "To-Do List", href: "/todos", icon: CheckSquare },
  { name: "Follow-ups", href: "/followups", icon: PhoneCall },
  { name: "Campaigns", href: "/campaigns", icon: Megaphone },
  { name: "Tax Reports", href: "/reports", icon: LineChart },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden selection:bg-primary/20">
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden" 
          onClick={() => setMobileMenuOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex flex-col shadow-2xl lg:shadow-none",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="808 All Purpose Cleaners" className="h-12 w-auto max-w-[160px] object-contain rounded-lg shadow-sm" />
            <div>
              <h1 className="font-display font-bold text-primary leading-tight text-lg">808 All Purpose</h1>
              <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Cleaners</p>
            </div>
          </div>
          <button className="lg:hidden text-slate-400 hover:text-slate-700" onClick={() => setMobileMenuOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link 
                key={item.name} 
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 group",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <item.icon className={cn("w-5 h-5 transition-transform duration-200", isActive ? "scale-110" : "group-hover:scale-110 text-slate-400 group-hover:text-primary")} />
                {item.name}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-slate-100 m-3 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10">
          <p className="text-xs font-bold text-primary mb-1 uppercase tracking-wider">Admin Panel</p>
          <p className="text-sm text-slate-600 font-medium truncate">Lainecaldera@aol.com</p>
          <p className="text-xs text-slate-500 mt-0.5">808-723-1011</p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Header (Mobile mainly) */}
        <header className="lg:hidden bg-white border-b border-slate-200 h-16 flex items-center px-4 justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="h-8 w-auto max-w-[120px] object-contain rounded" />
            <span className="font-display font-bold text-primary">808 Cleaners</span>
          </div>
          <button onClick={() => setMobileMenuOpen(true)} className="p-2 -mr-2 rounded-xl text-slate-500 hover:bg-slate-100">
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* Decorative background element */}
        <div className="absolute top-0 left-0 right-0 h-64 bg-primary/5 -z-10 blur-3xl opacity-50 pointer-events-none" />

        <main className="flex-1 overflow-y-auto p-4 md:p-8 z-0 relative custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export const PageHeader = ({ title, subtitle, description, action }: { title: string, subtitle?: string, description?: string, action?: React.ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 animate-fade-in">
    <div>
      <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
      {(subtitle || description) && <p className="mt-2 text-slate-500 font-medium text-lg">{subtitle || description}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
