import React, { useState, useEffect, useRef } from "react";
import { Bell, X, Check, CheckCheck, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";

interface Notification { id: number; type: string; title: string; message: string; actionUrl: string|null; isRead: boolean; createdAt: string; }

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    const [nRes, cRes] = await Promise.all([fetch("/api/notifications?unread=false"), fetch("/api/notifications/count")]);
    setNotifications(await nRes.json()); const c = await cRes.json(); setUnread(c.unread || 0);
  };

  useEffect(() => { load(); const i = setInterval(load, 60000); return () => clearInterval(i); }, []);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler); return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markRead = async (id: number) => { await fetch(`/api/notifications/${id}/read`, { method: "PATCH" }); load(); };
  const markAllRead = async () => { await fetch("/api/notifications/read-all", { method: "POST" }); load(); };
  const generateAlerts = async () => { await fetch("/api/notifications/generate", { method: "POST" }); load(); };
  const dismiss = async (id: number) => { await fetch(`/api/notifications/${id}`, { method: "DELETE" }); load(); };

  const handleClick = (n: Notification) => { if (!n.isRead) markRead(n.id); if (n.actionUrl) { navigate(n.actionUrl); setOpen(false); } };

  const typeIcon: Record<string, string> = { tomorrow_jobs: "📋", overdue_invoice: "💰", low_stock: "📦", dormant_client: "👤", subscription_due: "🔄", overdue_todo: "✅" };
  const timeAgo = (d: string) => { const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); if (m < 60) return `${m}m ago`; if (m < 1440) return `${Math.floor(m/60)}h ago`; return `${Math.floor(m/1440)}d ago`; };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => { setOpen(!open); if (!open) generateAlerts(); }} className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition active:scale-95">
        <Bell className="w-5 h-5" />
        {unread > 0 && <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[10px] font-bold rounded-full w-4.5 h-4.5 min-w-[18px] min-h-[18px] flex items-center justify-center">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-[100] max-h-[70vh] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
            <h3 className="font-bold text-sm">Notifications</h3>
            <div className="flex items-center gap-2">
              {unread > 0 && <button onClick={markAllRead} className="text-xs font-bold text-primary hover:underline flex items-center gap-1"><CheckCheck className="w-3 h-3" /> Read all</button>}
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-400" /></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                <Bell className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                <p>No notifications yet</p>
                <button onClick={generateAlerts} className="mt-2 text-primary font-bold text-xs hover:underline">Generate alerts</button>
              </div>
            ) : notifications.map(n => (
              <div key={n.id} onClick={() => handleClick(n)} className={`flex items-start gap-3 px-4 py-3 border-b border-slate-50 cursor-pointer transition ${n.isRead ? "bg-white" : "bg-blue-50/50"} hover:bg-slate-50`}>
                <span className="text-lg shrink-0 mt-0.5">{typeIcon[n.type] || "🔔"}</span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${n.isRead ? "text-slate-700" : "font-bold text-slate-900"}`}>{n.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); dismiss(n.id); }} className="p-1 rounded-lg hover:bg-slate-100 shrink-0"><X className="w-3 h-3 text-slate-300" /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
