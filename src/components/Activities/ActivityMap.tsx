import React, { useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  ZoomControl,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Activity } from "../../types";
import { Flame, Star, MapPin } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";

interface ActivityMapProps {
  activities: (Activity & { matchScore: number })[];
  center?: [number, number];
}

const createCustomIcon = (score: number, activityType: string) => {
  const colorClass =
    score >= 90
      ? "bg-orange-500 shadow-orange-500/40"
      : score >= 70
        ? "bg-amber-400 shadow-amber-400/40"
        : "bg-teal-600 shadow-teal-600/40";

  const html = renderToStaticMarkup(
    <div className="relative">
      <div
        className={`w-[42px] h-[42px] rounded-[14px_14px_14px_0] rotate-[-45deg] flex items-center justify-center border-2 border-white shadow-lg ${colorClass}`}
        aria-label={`Match Score: ${score}% for ${activityType}`}
      >
        <div className="rotate-[45deg] text-white font-[900] text-[11px]">
          {score}%
        </div>
      </div>
    </div>,
  );

  return L.divIcon({
    html,
    className: "custom-map-marker",
    iconSize: [42, 42],
    iconAnchor: [0, 42],
    popupAnchor: [21, -42],
  });
};

const ActivityMap: React.FC<ActivityMapProps> = ({
  activities,
  center = [11.9761, 92.9876], // Andaman default center
}) => {
  const memoizedMarkers = useMemo(
    () =>
      activities.map((activity) => (
        <Marker
          key={activity.id}
          position={[activity.location.lat, activity.location.lng]}
          icon={createCustomIcon(activity.matchScore, activity.type)}
        >
          <Popup className="activity-popup" maxWidth={300}>
            <div className="p-1 space-y-3 bg-white w-[260px]">
              <div className="aspect-[16/10] rounded-[20px] overflow-hidden relative bg-gradient-to-tr from-teal-600 to-emerald-400 flex items-center justify-center">
                {activity.matchScore >= 90 && (
                  <div className="absolute top-3 left-3 bg-orange-500 text-white px-3 py-1 rounded-xl text-[10px] font-black flex items-center gap-1.5 shadow-lg z-10">
                    <Flame size={12} className="animate-pulse" />
                    PEAK MATCH
                  </div>
                )}
                <div className="text-white font-black text-2xl opacity-50 uppercase tracking-widest">
                  {activity.type}
                </div>
              </div>

              <div className="space-y-1 px-1">
                <h4 className="font-black text-midnight-900 text-base leading-tight line-clamp-2">
                  {activity.title}
                </h4>
                <div className="flex items-center gap-2 text-[10px] text-warm-500 font-bold uppercase tracking-wider">
                  <MapPin size={10} />
                  {activity.island}
                </div>
              </div>

              <div className="flex items-center justify-between px-1 border-t border-warm-50 pt-3">
                <div className="flex flex-col">
                  <span className="text-[10px] text-warm-400 font-bold uppercase tracking-widest leading-none mb-1">
                    Price
                  </span>
                  <span className="text-sm font-black text-midnight-900">
                    ₹{activity.price}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-warm-400 font-bold uppercase tracking-widest leading-none mb-1">
                    Rating
                  </span>
                  <div className="flex items-center justify-end gap-1 text-sm font-black text-midnight-900">
                    <Star size={14} className="fill-amber-400 text-amber-400" />
                    {activity.rating}
                  </div>
                </div>
              </div>

              <button className="w-full py-3 bg-midnight-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest mt-2 hover:bg-teal-600 active:scale-95 transition-all shadow-lg hover:shadow-teal-900/20">
                Secure This Experience
              </button>
            </div>
          </Popup>
        </Marker>
      )),
    [activities],
  );

  return (
    <div className="h-[calc(100vh-160px)] w-full rounded-[40px] overflow-hidden border border-warm-100 shadow-glass relative z-0">
      <MapContainer
        center={center}
        zoom={10}
        scrollWheelZoom={true}
        className="h-full w-full bg-warm-50"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        <ZoomControl position="bottomright" />

        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={50}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
        >
          {memoizedMarkers}
        </MarkerClusterGroup>
      </MapContainer>

      <div className="absolute top-8 left-8 z-[1000] space-y-3 pointer-events-none">
        <div className="bg-white/90 backdrop-blur-md px-5 py-3 rounded-[24px] border border-warm-100 shadow-xl inline-flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
          <span className="text-xs font-black text-midnight-900 uppercase tracking-widest">
            {activities.length} Spots Identified
          </span>
        </div>
      </div>
    </div>
  );
};

export default ActivityMap;
