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

  return (
    <div
      ref={mapRef}
      className="w-full h-full"
      style={{ background: "#ffffff" }}
    />
  );
}
