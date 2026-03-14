import React, { useState } from "react";
import { CalendarDays, MapPin } from "lucide-react";
import Scheduling from "./Scheduling";
import MapView from "./MapView";

export default function ScheduleMap() {
  const [tab, setTab] = useState<"schedule" | "map">("schedule");

  return (
    <div className="space-y-4 pb-12">
      <div className="flex gap-2 bg-white rounded-2xl border border-border/60 p-1.5 shadow-sm w-fit">
        <button
          onClick={() => setTab("schedule")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            tab === "schedule" ? "bg-primary text-white shadow-md" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <CalendarDays className="w-4 h-4" /> Schedule
        </button>
        <button
          onClick={() => setTab("map")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            tab === "map" ? "bg-primary text-white shadow-md" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <MapPin className="w-4 h-4" /> Job Map
        </button>
      </div>

      {tab === "schedule" ? <Scheduling /> : <MapView />}
    </div>
  );
}
