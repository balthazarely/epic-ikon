"use client";

interface Region {
  id: string;
  label: string;
  sub: string;
  emoji: string;
  rotX: number;
  rotY: number;
}

const REGIONS: Region[] = [
  {
    id: "north-america",
    label: "North America",
    sub: "Epic & Ikon",
    emoji: "🇺🇸🇨🇦",
    rotX: 0.72,
    rotY: 0.3,
  },
  {
    id: "japan",
    label: "Japan",
    sub: "Ikon & Epic",
    emoji: "🇯🇵",
    rotX: 0.62,
    rotY: 2.4,
  },
  {
    id: "australia",
    label: "Australia",
    sub: "Epic & Ikon",
    emoji: "🇦🇺",
    rotX: -0.47,
    rotY: 2.35,
  },
];

interface RegionFilterProps {
  visible: boolean;
  activeRegion: string | null;
  onSelect: (region: Region) => void;
}

export default function RegionFilter({
  visible,
  activeRegion,
  onSelect,
}: RegionFilterProps) {
  return (
    <div
      className={`fixed bottom-6 left-6 right-6 z-30 flex gap-3 overflow-x-auto transition-all duration-700 ease-out scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      {REGIONS.map((region) => {
        const isActive = activeRegion === region.id;
        return (
          <button
            key={region.id}
            onClick={() => onSelect(region)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 shrink-0"
            style={{
              background: isActive
                ? "rgba(59, 130, 246, 0.15)"
                : "rgba(4, 14, 28, 0.85)",
              backdropFilter: "blur(12px)",
              borderColor: isActive
                ? "rgba(59, 130, 246, 0.45)"
                : "rgba(255, 255, 255, 0.08)",
              boxShadow: isActive
                ? "0 0 20px rgba(59, 130, 246, 0.15)"
                : "none",
            }}
          >
            <span className="text-2xl leading-none">{region.emoji}</span>
            <div className="text-left">
              <p
                className="text-sm font-semibold leading-tight"
                style={{
                  color: isActive ? "#93c5fd" : "rgba(255,255,255,0.8)",
                }}
              >
                {region.label}
              </p>
              <p
                className="text-xs mt-0.5"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                {region.sub}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export type { Region };
