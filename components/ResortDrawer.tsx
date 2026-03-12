"use client";
import { useEffect } from "react";
import type { Resort } from "@/lib/types/resort";
import ResortMap from "./ResortMap";

interface ResortDrawerProps {
  resort: Resort | null;
  onClose: () => void;
}

export default function ResortDrawer({ resort, onClose }: ResortDrawerProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${resort ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-2xl flex flex-col shadow-2xl transition-transform duration-400 ease-in-out ${resort ? "translate-x-0" : "translate-x-full"}`}
        style={{ background: "rgba(4, 14, 28, 0.97)" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-white/10 shrink-0">
          <div>
            <h2 className="text-white text-2xl font-bold">{resort?.name}</h2>
            <p className="text-white/40 text-sm mt-1">{resort?.country}</p>
            {resort?.pass && (
              <span
                className="inline-block mt-2 text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{
                  background: resort.pass === "Epic" ? "#FF8B0020" : "#07214133",
                  color: resort.pass === "Epic" ? "#FF8B00" : "#7aacff",
                  border: `1px solid ${resort.pass === "Epic" ? "#FF8B0055" : "#7aacff44"}`,
                }}
              >
                {resort.pass}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white text-3xl leading-none mt-1"
          >
            ×
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 border-b border-white/10 shrink-0">
          <Stat label="Vertical" value={`${resort?.verticalDrop}m`} />
          <Stat label="Runs" value={resort?.totalRuns} />
          <Stat label="Lifts" value={resort?.lifts} />
        </div>

        {/* Map */}
        <div className="flex-1 min-h-0">
          {resort && <ResortMap resort={resort} />}
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div className="flex flex-col items-center py-4 border-r border-white/10 last:border-r-0">
      <span className="text-white font-bold text-lg">{value}</span>
      <span className="text-white/40 text-xs mt-0.5">{label}</span>
    </div>
  );
}
