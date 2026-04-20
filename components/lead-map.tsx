"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import { Card } from "@/components/ui";
import type { BusinessLead } from "@/types/business";

type LeadMapProps = {
  businesses: BusinessLead[];
  activeBorough: string;
  onBoroughChange: (borough: string) => void;
  onOpenBusiness: (business: BusinessLead) => void;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function markerIcon(hasEmail: boolean) {
  return L.divIcon({
    className: "",
    html: `<span class="lead-map-marker ${hasEmail ? "lead-map-marker-email" : ""}"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10]
  });
}

export function LeadMap({ businesses, activeBorough, onBoroughChange, onOpenBusiness }: LeadMapProps) {
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.MarkerClusterGroup | null>(null);
  const businessById = useMemo(() => new Map(businesses.map((business) => [business.id, business])), [businesses]);

  const plotted = useMemo(
    () =>
      businesses.filter(
        (business) =>
          business.latitude !== null &&
          business.longitude !== null &&
          Number.isFinite(business.latitude) &&
          Number.isFinite(business.longitude)
      ),
    [businesses]
  );

  const neighborhoods = useMemo(
    () =>
      Array.from(
        businesses.reduce((map, business) => {
          const current = map.get(business.borough) ?? { total: 0, emails: 0 };
          map.set(business.borough, {
            total: current.total + 1,
            emails: current.emails + (business.email ? 1 : 0)
          });
          return map;
        }, new Map<string, { total: number; emails: number }>())
      ).sort((left, right) => right[1].total - left[1].total),
    [businesses]
  );

  useEffect(() => {
    if (!mapNodeRef.current || mapRef.current) return;

    const map = L.map(mapNodeRef.current, {
      center: [45.5089, -73.5617],
      zoom: 12,
      scrollWheelZoom: true
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    mapRef.current = map;
    layerRef.current = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 42,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false
    }).addTo(map);

    map.on("popupopen", (event) => {
      const element = event.popup.getElement()?.querySelector<HTMLButtonElement>("[data-business-id]");
      if (!element) return;

      element.addEventListener("click", () => {
        const business = businessById.get(element.dataset.businessId ?? "");
        if (business) onOpenBusiness(business);
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, [businessById, onOpenBusiness]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    const bounds = L.latLngBounds([]);
    for (const business of plotted) {
      const latitude = business.latitude as number;
      const longitude = business.longitude as number;
      const marker = L.marker([latitude, longitude], { icon: markerIcon(Boolean(business.email)) });
      const popup = `
        <div class="lead-map-popup">
          <strong>${escapeHtml(business.name)}</strong>
          <span>${escapeHtml(business.category)} · ${escapeHtml(business.borough)}</span>
          <span>${escapeHtml(business.address || "Address not available")}</span>
          <span>${business.email ? escapeHtml(business.email) : "Email not available"}</span>
          <button type="button" data-business-id="${escapeHtml(business.id)}">Open lead</button>
        </div>
      `;

      marker.bindPopup(popup);
      marker.addTo(layer);
      bounds.extend([latitude, longitude]);
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 14 });
    }
  }, [plotted]);

  return (
    <section className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Interactive map</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Exact business locations</h2>
          </div>
          <p className="text-sm text-slate-400">{plotted.length} geocoded leads</p>
        </div>

        <div ref={mapNodeRef} className="h-[480px] overflow-hidden rounded-2xl border border-white/10 bg-ink-900" />
      </Card>

      <Card className="p-5">
        <div className="mb-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Neighborhoods</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Lead density</h2>
        </div>
        <div className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
          {neighborhoods.map(([borough, stats]) => {
            const share = businesses.length ? Math.max(6, (stats.total / businesses.length) * 100) : 0;

            return (
              <button
                key={borough}
                type="button"
                onClick={() => onBoroughChange(activeBorough === borough ? "" : borough)}
                className={[
                  "w-full rounded-xl border p-3 text-left transition",
                  activeBorough === borough
                    ? "border-accent-400 bg-accent-500/15"
                    : "border-white/10 bg-white/[0.035] hover:bg-white/[0.06]"
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-white">{borough}</span>
                  <span className="text-slate-400">{stats.total}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-accent-400" style={{ width: `${share}%` }} />
                </div>
                <p className="mt-2 text-xs text-slate-500">{stats.emails} with email</p>
              </button>
            );
          })}
        </div>
      </Card>
    </section>
  );
}
