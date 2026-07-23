"use client";

import { divIcon } from "leaflet";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { FireEvent } from "@/lib/types";
import { fireSeverityStyle } from "@/lib/fire-history";

// Center on Gwangju so every district marker sits within the initial view.
const GWANGJU_CENTER: [number, number] = [35.1595, 126.8526];
const INITIAL_ZOOM = 12;

// Base marker diameter per severity, so higher severity also reads as a bigger
// dot rather than color alone.
function baseSize(severity: string) {
  if (severity === FireEvent.SEVERITY_CATASTROPHIC)
    return 24;
  if (severity === FireEvent.SEVERITY_MAJOR)
    return 18;
  return 13;
}

// A colored dot sized by severity, enlarged with a colored ring when active.
// Using a divIcon avoids Leaflet's broken default marker image paths under the
// bundler, and lets the marker share the severity color used by the badges.
function markerIcon(event: FireEvent, selected: boolean) {
  const { color } = fireSeverityStyle(event.severity);
  const size = baseSize(event.severity) + (selected ? 6 : 0);
  const ring = selected ? `box-shadow: 0 0 0 4px ${color}40;` : "";
  return divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:2px solid #fff;${ring}"></span>`,
  });
}

export function FireMap({
  events,
  selectedId,
  onSelect,
}: {
  events: FireEvent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <MapContainer
      center={GWANGJU_CENTER}
      zoom={INITIAL_ZOOM}
      scrollWheelZoom
      className="size-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {events.map((event) => (
        <Marker
          key={event.id}
          position={[event.latitude, event.longitude]}
          icon={markerIcon(event, event.id === selectedId)}
          eventHandlers={{ click: () => onSelect(event.id) }}
        />
      ))}
    </MapContainer>
  );
}
