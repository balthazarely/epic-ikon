"use client";
import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Resort } from "@/lib/types/resort";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

export default function ResortMap({ resort }: { resort: Resort }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: "mapbox://styles/mapbox/satellite-v9",
      center: [resort.lng, resort.lat],
      zoom: 12,
      pitch: 60,
      bearing: -20,
      antialias: true,
    });

    mapInstanceRef.current = map;

    map.on("load", () => {
      // ---- Terrain ----
      map.addSource("mapbox-dem", {
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 14,
      });

      map.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });

      // map.setPaintProperty("background", "background-color", "#ffffff");

      if (!resort.bounds) {
        map.flyTo({
          center: [resort.lng, resort.lat],
          zoom: 13,
          pitch: 65,
          bearing: -20,
          duration: 2000,
        });
        return;
      }

      // ---- Sources ----
      map.addSource("resort-bounds", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [resort.bounds],
          },
          properties: {},
        },
      });

      // 4. Boundary line on top
      map.addLayer({
        id: "resort-boundary",
        type: "line",
        source: "resort-bounds",
        paint: {
          "line-color": "#ffffff",
          "line-width": 2,
          "line-opacity": 0.9,
        },
      });

      // ---- Fly in ----
      map.flyTo({
        center: [resort.lng, resort.lat],
        zoom: 13,
        pitch: 65,
        bearing: -20,
        duration: 0,
      });
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [resort.lng, resort.lat]);

  function resetView() {
    mapInstanceRef.current?.flyTo({
      center: [resort.lng, resort.lat],
      zoom: 13,
      pitch: 65,
      bearing: -20,
      duration: 1200,
    });
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" style={{ background: "#0a1628" }} />
      <button
        onClick={resetView}
        className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/70 hover:text-white transition-colors border border-white/10 hover:border-white/25"
        style={{ background: "rgba(6, 20, 40, 0.85)", backdropFilter: "blur(8px)" }}
      >
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 4A4.5 4.5 0 1 0 9.5 8" />
          <polyline points="10 1 10 4 7 4" />
        </svg>
        Reset view
      </button>
    </div>
  );
}
