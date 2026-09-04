import { env } from "@/config/env";

/**
 * Map integration boundary (Section 13 of the frontend spec; provider ADR
 * still open). This component is deliberately a placeholder — it is NOT
 * wired to Google Maps, Mapbox, or MapLibre. The props contract below
 * (`markers`, `routes`) is designed to stay stable across that swap so
 * callers in features/dispatcher, features/retailer, features/rider don't
 * need to change.
 *
 * The visual below is an intentional stylized surface (grid + route lines
 * + markers), NOT a real geographic projection of `lat`/`lng` — marker
 * placement is a deterministic layout derived from each marker's `id`, not
 * real geocoding. It exists to look like a considered part of the design
 * system rather than an empty box, while remaining unambiguous that it is
 * a placeholder (docs/design-system.md §10 / brief §21: "must clearly
 * remain a placeholder implementation").
 *
 * The map is a VISUALIZATION layer only — it must never be used to decide
 * delivery completion, authorization, dispatch assignment, or payment
 * status. Nothing in this component reads or writes any of that.
 */

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  kind?: "rider" | "delivery" | "destination";
}

export interface MapRoute {
  id: string;
  points: Array<{ lat: number; lng: number }>;
}

export interface MapViewProps {
  markers?: MapMarker[];
  routes?: MapRoute[];
  className?: string;
  emptyLabel?: string;
}

const KIND_COLOR: Record<NonNullable<MapMarker["kind"]>, string> = {
  rider: "#166468", // teal-600
  delivery: "#5E7A3F", // olive-600
  destination: "#6E2143", // wine-600
};

/** Deterministic pseudo-position within the placeholder canvas, derived from
 * the marker id so the same marker always lands in the same spot across
 * re-renders (not random flicker), without pretending it's a real geocode. */
function layoutPosition(id: string, index: number): { x: number; y: number } {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  const x = 12 + ((hash % 76) + index * 7) % 76;
  const y = 15 + ((Math.floor(hash / 76) % 70) + index * 11) % 70;
  return { x, y };
}

function PlaceholderSurface({ markers }: { markers: MapMarker[] }) {
  const positioned = markers.map((m, i) => ({ ...m, ...layoutPosition(m.id, i) }));

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
      <defs>
        <pattern id="reflex-grid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#DCE3ED" strokeWidth="0.4" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill="#F7F8F6" />
      <rect width="100" height="100" fill="url(#reflex-grid)" />
      {/* Stylized route lines connecting sequential markers of the same kind — abstract, not a real path. */}
      {positioned.length > 1 && (
        <polyline
          points={positioned.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="#3E9BA0"
          strokeWidth="0.8"
          strokeDasharray="2 2"
          opacity="0.55"
        />
      )}
      {positioned.map((p) => (
        <g key={p.id}>
          <circle cx={p.x} cy={p.y} r="2.6" fill={KIND_COLOR[p.kind ?? "delivery"]} opacity="0.18" />
          <circle cx={p.x} cy={p.y} r="1.4" fill={KIND_COLOR[p.kind ?? "delivery"]} />
        </g>
      ))}
    </svg>
  );
}

export function MapView({ markers = [], className = "", emptyLabel }: MapViewProps) {
  const providerConfigured = Boolean(env.mapsProvider);

  return (
    <div
      className={`relative h-full min-h-[240px] w-full overflow-hidden rounded-md border border-border ${className}`}
      role="img"
      aria-label={
        providerConfigured
          ? `Map placeholder — provider "${env.mapsProvider}" configured, no adapter implemented`
          : "Map placeholder — no map provider configured"
      }
    >
      <PlaceholderSurface markers={markers} />

      <div className="absolute left-3 top-3 rounded-md border border-white/60 bg-white/80 px-2.5 py-1.5 text-caption font-medium text-graphite-600 shadow-pearl-sm backdrop-blur-pearl">
        Map placeholder
      </div>

      {markers.length > 0 && (
        <div className="absolute bottom-3 left-3 flex items-center gap-3 rounded-md border border-white/60 bg-white/80 px-2.5 py-1.5 text-caption text-graphite-600 shadow-pearl-sm backdrop-blur-pearl">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-olive-600" /> Delivery
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-teal-600" /> Rider
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-wine-600" /> Destination
          </span>
        </div>
      )}

      {markers.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-supporting text-muted">
          {emptyLabel ?? "No locations to show yet. Live positions will appear here once a map provider is selected."}
        </div>
      )}
    </div>
  );
}
