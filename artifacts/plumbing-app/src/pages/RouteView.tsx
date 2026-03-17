import React, { useState, useEffect } from "react";
import { Card, Badge } from "@/components/ui";
import { PageHeader } from "@/components/Layout";
import { formatCurrency, getStatusColor } from "@/lib/utils";
import { Navigation, MapPin, Clock, DollarSign, ExternalLink, ChevronLeft, ChevronRight, Truck } from "lucide-react";

interface Stop {
  id: number; stopNumber: number; serviceType: string; clientName: string | null;
  time: string; location: string | null; status: string; estimatedPrice: string | null;
  wazeUrl?: string; googleMapsUrl?: string; notes: string | null;
}
interface RouteData { date: string; stops: Stop[]; totalStops: number; estimatedRevenue: string; }

export default function RouteView() {
  const [route, setRoute] = useState<RouteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const load = async (d: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/route/${d}`);
      setRoute(await res.json());
    } catch (e) { console.error("Failed to load route:", e); }
    setLoading(false);
  };
  useEffect(() => { load(date); }, [date]);

  const prevDay = () => { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d.toISOString().split("T")[0]); };
  const nextDay = () => { const d = new Date(date); d.setDate(d.getDate() + 1); setDate(d.toISOString().split("T")[0]); };
  const today = () => setDate(new Date().toISOString().split("T")[0]);
  const isToday = date === new Date().toISOString().split("T")[0];

  const dateLabel = new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

  return (
    <div className="space-y-5">
      <PageHeader title="Today's Route" subtitle={`${route?.totalStops || 0} stops · ${formatCurrency(route?.estimatedRevenue || "0")} est. revenue`} />

      {/* Date nav */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-border/60 p-3 shadow-sm">
        <button onClick={prevDay} className="p-2 rounded-xl hover:bg-slate-100"><ChevronLeft className="w-5 h-5" /></button>
        <div className="text-center">
          <p className="font-bold text-base">{dateLabel}</p>
          {!isToday && <button onClick={today} className="text-xs font-bold text-primary hover:underline mt-0.5">Go to today</button>}
        </div>
        <button onClick={nextDay} className="p-2 rounded-xl hover:bg-slate-100"><ChevronRight className="w-5 h-5" /></button>
      </div>

      {/* Open all in Maps */}
      {route && route.stops.length > 1 && (
        <button
          onClick={() => {
            const waypoints = route.stops.map(s => s.location || "").filter(Boolean).join("/");
            window.open(`https://www.google.com/maps/dir/${encodeURI(waypoints)}`, "_blank");
          }}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-2xl font-bold hover:opacity-90 transition min-h-[48px]"
        >
          <Truck className="w-5 h-5" /> Open Full Route in Google Maps
        </button>
      )}

      {/* Stops */}
      {loading ? <div className="text-center py-12 text-slate-500">Loading route...</div> : !route?.stops.length ? (
        <Card className="p-12 text-center">
          <Navigation className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No jobs scheduled for {dateLabel}.</p>
        </Card>
      ) : (
        <div className="space-y-3 relative">
          {/* Route line */}
          <div className="absolute left-7 top-6 bottom-6 w-0.5 bg-primary/15 hidden sm:block" />

          {route.stops.map((stop, i) => (
            <Card key={stop.id} className="p-4 relative">
              <div className="flex items-start gap-4">
                {/* Stop number */}
                <div className="shrink-0 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-black text-sm shadow-md shadow-primary/20 z-10">
                  {stop.stopNumber}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900">{stop.clientName || "Walk-in"}</p>
                      <p className="text-sm text-slate-600">{stop.serviceType}</p>
                    </div>
                    <Badge className={getStatusColor(stop.status)}>{stop.status}</Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-slate-500">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {stop.time}</span>
                    {stop.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {stop.location}</span>}
                    {stop.estimatedPrice && <span className="flex items-center gap-1 font-bold text-emerald-600"><DollarSign className="w-3.5 h-3.5" /> {formatCurrency(stop.estimatedPrice)}</span>}
                  </div>

                  {stop.notes && <p className="text-xs text-slate-400 mt-1 italic">{stop.notes}</p>}

                  {/* Navigation buttons */}
                  <div className="flex gap-2 mt-3">
                    {stop.googleMapsUrl && (
                      <a href={stop.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-100 transition min-h-[36px]">
                        <Navigation className="w-3.5 h-3.5" /> Google Maps
                      </a>
                    )}
                    {stop.wazeUrl && (
                      <a href={stop.wazeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 bg-cyan-50 text-cyan-700 rounded-xl text-xs font-bold hover:bg-cyan-100 transition min-h-[36px]">
                        <ExternalLink className="w-3.5 h-3.5" /> Waze
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Connector line between stops */}
              {i < route.stops.length - 1 && (
                <div className="absolute -bottom-3 left-7 w-0.5 h-3 bg-primary/20 hidden sm:block" />
              )}
            </Card>
          ))}

          {/* Day summary */}
          <Card className="p-4 bg-gradient-to-r from-primary/5 to-cyan-500/5 border-primary/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" />
                <span className="font-bold text-primary">Day Summary</span>
              </div>
              <div className="text-right">
                <p className="font-black text-primary text-lg">{formatCurrency(route.estimatedRevenue)}</p>
                <p className="text-xs text-slate-500">{route.totalStops} jobs</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
