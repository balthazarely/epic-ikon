"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Resort } from "@/lib/types/resort";
import { useLifts } from "@/lib/hooks/useLifts";
import { useTrails } from "@/lib/hooks/useTrails";

interface Lift {
  name: string;
  type: string;
  status: string;
  coordinates: [number, number, number][];
}

interface Trail {
  name: string;
  difficulty: string;
  status: string;
  coordinates: [number, number, number][];
}

interface CameraState {
  zoom: number;
  pitch: number;
  bearing: number;
  center: [number, number];
}

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

export default function ResortMap({ resort }: { resort: Resort }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const { data: lifts } = useLifts(resort);
  const { data: trails } = useTrails(resort);
  const [camera, setCamera] = useState<CameraState | null>(null);
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);

  const updateCamera = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const c = map.getCenter();
    setCamera({
      zoom: parseFloat(map.getZoom().toFixed(2)),
      pitch: parseFloat(map.getPitch().toFixed(1)),
      bearing: parseFloat(map.getBearing().toFixed(1)),
      center: [parseFloat(c.lng.toFixed(6)), parseFloat(c.lat.toFixed(6))],
    });
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !trails || trails.length === 0) return;

    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: trails.map((trail: Trail) => ({
        type: "Feature" as const,
        geometry: { type: "LineString" as const, coordinates: trail.coordinates },
        properties: { name: trail.name, difficulty: trail.difficulty, status: trail.status },
      })),
    };

    function addLayers() {
      if (map!.getSource("trails")) {
        (map!.getSource("trails") as mapboxgl.GeoJSONSource).setData(geojson);
        return;
      }
      map!.addSource("trails", { type: "geojson", data: geojson });
      map!.addLayer({
        id: "trails-casing",
        type: "line",
        source: "trails",
        paint: {
          "line-width": 3.5,
          "line-opacity": 0.6,
          "line-color": [
            "match", ["get", "difficulty"],
            "advanced", "#ffffff",
            "hard",     "#ffffff",
            "expert",   "#ffffff",
            "#000000",
          ],
        },
      });
      map!.addLayer({
        id: "trails-line",
        type: "line",
        source: "trails",
        paint: {
          "line-width": 1.5,
          "line-opacity": 0.85,
          "line-color": [
            "match", ["get", "difficulty"],
            "novice",       "#4caf50",
            "easy",         "#4caf50",
            "intermediate", "#2196f3",
            "advanced",     "#111111",
            "hard",         "#111111",
            "expert",       "#111111",
            "freeride",     "#ff6600",
            "#aaaaaa",
          ],
        },
      });
    }

    if (map.isStyleLoaded()) addLayers();
    else map.once("load", addLayers);
  }, [trails]);

  useEffect(() => {
    if (!mapRef.current) return;

    const cam = resort.mapboxCamera;
    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: "mapbox://styles/mapbox/satellite-v9",
      center: cam ? cam.center : [resort.lng, resort.lat],
      zoom: cam ? cam.zoom : 12,
      pitch: cam ? cam.pitch : 60,
      bearing: cam ? cam.bearing : -20,
      antialias: true,
    });

    mapInstanceRef.current = map;
    map.once("idle", () => setReady(true));
    map.on("moveend", updateCamera);
    map.on("load", updateCamera);

    map.on("load", () => {
      map.addSource("mapbox-dem", {
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 14,
      });
      map.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });

      if (!resort.bounds) {
        const c = resort.mapboxCamera;
        map.flyTo({
          center: c ? c.center : [resort.lng, resort.lat],
          zoom: c ? c.zoom : 13,
          pitch: c ? c.pitch : 65,
          bearing: c ? c.bearing : -20,
          duration: 2000,
        });
        return;
      }

      map.addSource("resort-bounds", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [resort.bounds] },
          properties: {},
        },
      });
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
      const c = resort.mapboxCamera;
      map.flyTo({
        center: c ? c.center : [resort.lng, resort.lat],
        zoom: c ? c.zoom : 13,
        pitch: c ? c.pitch : 65,
        bearing: c ? c.bearing : -20,
        duration: 0,
      });
    });

    return () => {
      map.off("moveend", updateCamera);
      map.remove();
      mapInstanceRef.current = null;
      setReady(false);
    };
  }, [resort.lng, resort.lat, updateCamera]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !lifts || lifts.length === 0) return;

    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: lifts.map((lift: Lift) => ({
        type: "Feature" as const,
        geometry: {
          type: "LineString" as const,
          coordinates: lift.coordinates,
        },
        properties: { name: lift.name, type: lift.type, status: lift.status },
      })),
    };

    function addLayers() {
      if (map!.getSource("lifts")) {
        (map!.getSource("lifts") as mapboxgl.GeoJSONSource).setData(geojson);
        return;
      }
      map!.addSource("lifts", { type: "geojson", data: geojson });
      map!.addLayer({
        id: "lifts-casing",
        type: "line",
        source: "lifts",
        paint: {
          "line-color": "#000000",
          "line-width": 4,
          "line-opacity": 0.35,
        },
      });
      map!.addLayer({
        id: "lifts-line",
        type: "line",
        source: "lifts",
        paint: {
          "line-color": "#ffd700",
          "line-width": 2,
          "line-opacity": 0.9,
        },
      });
      map!.addLayer({
        id: "lifts-label",
        type: "symbol",
        source: "lifts",
        layout: {
          "symbol-placement": "line",
          "text-field": ["get", "name"],
          "text-size": 11,
          "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Regular"],
          "text-anchor": "center",
          "text-max-angle": 30,
          "symbol-spacing": 250,
        },
        paint: {
          "text-color": "#ffd700",
          "text-halo-color": "#000000",
          "text-halo-width": 1.5,
        },
      });
    }

    if (map.isStyleLoaded()) addLayers();
    else map.once("load", addLayers);
  }, [lifts]);

  function resetView() {
    const c = resort.mapboxCamera;
    mapInstanceRef.current?.flyTo({
      center: c ? c.center : [resort.lng, resort.lat],
      zoom: c ? c.zoom : 13,
      pitch: c ? c.pitch : 65,
      bearing: c ? c.bearing : -20,
      duration: 1200,
    });
  }

  function copyCamera() {
    if (!camera) return;
    const json = `"mapboxCamera": {\n  "zoom": ${camera.zoom},\n  "pitch": ${camera.pitch},\n  "bearing": ${camera.bearing},\n  "center": [${camera.center[0]}, ${camera.center[1]}]\n},`;
    navigator.clipboard.writeText(json);
    console.log(`[${resort.name}]\n${json}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative w-full h-full">
      <div
        ref={mapRef}
        className="w-full h-full transition-opacity duration-500"
        style={{ background: "#0a1628", opacity: ready ? 1 : 0 }}
      />

      {/* Reset view */}
      <button
        onClick={resetView}
        className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/70 hover:text-white transition-colors border border-white/10 hover:border-white/25"
        style={{
          background: "rgba(6, 20, 40, 0.85)",
          backdropFilter: "blur(8px)",
        }}
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 4A4.5 4.5 0 1 0 9.5 8" />
          <polyline points="10 1 10 4 7 4" />
        </svg>
        Reset view
      </button>

      {/* Loading overlay */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-500"
        style={{
          background:
            "radial-gradient(ellipse at center, #061428 0%, #020508 100%)",
          opacity: ready ? 0 : 1,
        }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
          <p className="text-white/40 text-sm tracking-widest uppercase">
            Loading
          </p>
        </div>
      </div>

      {/* Dev camera inspector */}
      {/* <CameraHelper camera={camera} copied={copied} copyCamera={copyCamera} /> */}
    </div>
  );
}

function CameraHelper({
  camera,
  copied,
  copyCamera,
}: {
  camera: CameraState | null;
  copied: boolean;
  copyCamera: () => void;
}) {
  return (
    <>
      {camera && (
        <div
          className="absolute bottom-3 left-3 rounded-lg border border-white/10 overflow-hidden"
          style={{
            background: "rgba(6, 20, 40, 0.9)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10">
            <span className="text-white/40 text-[10px] uppercase tracking-widest">
              Camera
            </span>
            <button
              onClick={copyCamera}
              className="text-[10px] font-medium px-2 py-0.5 rounded transition-colors"
              style={{ color: copied ? "#4ade80" : "rgba(255,255,255,0.5)" }}
            >
              {copied ? "Copied!" : "Copy JSON"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 px-3 py-2 font-mono">
            <CamRow label="zoom" value={camera.zoom} />
            <CamRow label="pitch" value={camera.pitch} />
            <CamRow label="bearing" value={camera.bearing} />
            <CamRow label="lng" value={camera.center[0]} />
            <CamRow label="lat" value={camera.center[1]} />
          </div>
        </div>
      )}
    </>
  );
}

function CamRow({ label, value }: { label: string; value: number }) {
  return (
    <>
      <span className="text-white/30 text-[10px]">{label}</span>
      <span className="text-white/70 text-[10px]">{value}</span>
    </>
  );
}
