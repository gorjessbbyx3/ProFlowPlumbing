import React, { useMemo, useEffect, useState } from "react";
import { useListBookings } from "@workspace/api-client-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { PageHeader } from "@/components/Layout";
import { Card, Badge } from "@/components/ui";
import { formatDate, getStatusColor } from "@/lib/utils";
import { MapPin, Clock, Navigation, ExternalLink } from "lucide-react";

// Fix Leaflet default marker icons in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const statusIcons: Record<string, string> = {
  scheduled: "🔵",
  "in progress": "🟡",
  completed: "🟢",
  cancelled: "🔴",
};

function createColorIcon(status: string) {
  const color = status === "completed" ? "#22c55e" : status === "in progress" ? "#eab308" : status === "cancelled" ? "#ef4444" : "#3b82f6";
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3" fill="${color}"/></svg>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

interface GeocodedBooking {
  id: number;
  lat: number;
  lng: number;
  clientName: string | null;
  serviceType: string;
  status: string;
  date: string;
  time: string;
  location: string | null;
}

export default function MapView() {
  const today = (() => { const d = new Date(); const pad = (n: number) => n.toString().padStart(2, "0"); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; })();
  const { data: bookings, isLoading } = useListBookings({ date: today });
  const { data: allBookings } = useListBookings();
  const [showAll, setShowAll] = useState(false);
  const [geocoded, setGeocoded] = useState<GeocodedBooking[]>([]);
  const [geocoding, setGeocoding] = useState(false);

  const displayBookings = showAll ? allBookings : bookings;

  useEffect(() => {
    if (!displayBookings) return;
    let cancelled = false;

    const bookingsWithLocation = displayBookings.filter((b) => b.location);
    if (bookingsWithLocation.length === 0) {
      setGeocoded([]);
      return;
    }

    // Use stored lat/lng if available, otherwise geocode
    const toGeocode: typeof bookingsWithLocation = [];
    const alreadyGeocoded: GeocodedBooking[] = [];

    for (const b of bookingsWithLocation) {
      if (b.latitude && b.longitude) {
        alreadyGeocoded.push({
          id: b.id,
          lat: parseFloat(b.latitude),
          lng: parseFloat(b.longitude),
          clientName: b.clientName ?? null,
          serviceType: b.serviceType,
          status: b.status,
          date: b.date,
          time: b.time,
          location: b.location ?? null,
        });
      } else {
        toGeocode.push(b);
      }
    }

    if (toGeocode.length === 0) {
      setGeocoded(alreadyGeocoded);
      return;
    }

    setGeocoding(true);
    Promise.all(
      toGeocode.map(async (b) => {
        try {
          const query = encodeURIComponent(b.location + ", Hawaii");
          const resp = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`);
          const data = await resp.json();
          if (data[0]) {
            return {
              id: b.id,
              lat: parseFloat(data[0].lat),
              lng: parseFloat(data[0].lon),
              clientName: b.clientName,
              serviceType: b.serviceType,
              status: b.status,
              date: b.date,
              time: b.time,
              location: b.location,
            } as GeocodedBooking;
          }
        } catch {}
        return null;
      })
    ).then((results) => {
      if (cancelled) return;
      const valid = results.filter(Boolean) as GeocodedBooking[];
      setGeocoded([...alreadyGeocoded, ...valid]);
      setGeocoding(false);
    });

    return () => { cancelled = true; };
  }, [displayBookings]);

  // Center on Hawaii (Oahu)
  const center: [number, number] = useMemo(() => {
    if (geocoded.length > 0) {
      const avgLat = geocoded.reduce((s, g) => s + g.lat, 0) / geocoded.length;
      const avgLng = geocoded.reduce((s, g) => s + g.lng, 0) / geocoded.length;
      return [avgLat, avgLng];
    }
    return [21.3069, -157.8583]; // Honolulu default
  }, [geocoded]);

  const openGoogleMapsRoute = () => {
    if (geocoded.length === 0) return;
    const waypoints = geocoded.map((g) => `${g.lat},${g.lng}`).join("/");
    window.open(`https://www.google.com/maps/dir/${waypoints}`, "_blank");
  };

  return (
    <div className="animate-fade-in pb-12">
      <PageHeader
        title="Job Map"
        description={showAll ? "All jobs on the map" : "Today's jobs on the map"}
        action={
          <div className="flex gap-2">
            <button
              onClick={() => setShowAll(!showAll)}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {showAll ? "Show Today Only" : "Show All Jobs"}
            </button>
            {geocoded.length > 1 && (
              <button
                onClick={openGoogleMapsRoute}
                className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <Navigation className="w-4 h-4" /> Route in Maps
              </button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3">
          <Card className="overflow-hidden" style={{ height: "600px" }}>
            {isLoading || geocoding ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto" />
                  <p className="text-slate-500 mt-3 font-medium">{geocoding ? "Finding locations..." : "Loading jobs..."}</p>
                </div>
              </div>
            ) : (
              <MapContainer center={center} zoom={11} style={{ height: "100%", width: "100%" }} scrollWheelZoom={true}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {geocoded.map((g) => (
                  <Marker key={g.id} position={[g.lat, g.lng]} icon={createColorIcon(g.status)}>
                    <Popup>
                      <div className="min-w-[200px]">
                        <p className="font-bold text-base">{g.clientName || "Walk-in"}</p>
                        <p className="text-sm text-gray-600">{g.serviceType}</p>
                        <p className="text-sm mt-1">
                          <strong>Date:</strong> {formatDate(g.date)} at {g.time}
                        </p>
                        <p className="text-sm">
                          <strong>Status:</strong> {statusIcons[g.status] || ""} {g.status}
                        </p>
                        {g.location && (
                          <p className="text-sm text-gray-500 mt-1">{g.location}</p>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            )}
          </Card>
        </div>

        {/* Job List Sidebar */}
        <div className="xl:col-span-1 space-y-3">
          <h3 className="font-bold text-lg text-slate-900">
            {showAll ? "All Jobs" : "Today's Jobs"} ({displayBookings?.length || 0})
          </h3>
          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {displayBookings?.length === 0 ? (
              <Card className="p-6 text-center">
                <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500 font-medium">No jobs {showAll ? "" : "today"}</p>
              </Card>
            ) : (
              displayBookings?.map((b) => (
                <Card key={b.id} className="p-3 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-slate-900 truncate">{b.clientName || "Walk-in"}</p>
                      <p className="text-xs text-slate-500">{b.serviceType}</p>
                    </div>
                    <Badge className={getStatusColor(b.status) + " text-[10px]"}>{b.status}</Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {b.time}
                    </span>
                    {b.location && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3" /> {b.location}
                      </span>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
