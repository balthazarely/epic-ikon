"use client";
import { useEffect } from "react";
import type { Resort } from "@/lib/types/resort";
import ResortMap from "./ResortMap";

interface ResortDrawerProps {
  resort: Resort | null;
  onClose: () => void;
}

// Rough reference maxes for the progress bars
const REF = { vertical: 2000, runs: 300, lifts: 50 };

export default function ResortDrawer({ resort, onClose }: ResortDrawerProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const latStr = resort
    ? `${Math.abs(resort.lat).toFixed(2)}° ${resort.lat >= 0 ? "N" : "S"}`
    : "";
  const lngStr = resort
    ? `${Math.abs(resort.lng).toFixed(2)}° ${resort.lng >= 0 ? "E" : "W"}`
    : "";

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
        style={{ background: "rgba(6, 20, 40, 0.88)", backdropFilter: "blur(16px)" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-5 border-b border-white/10 shrink-0">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-white text-2xl font-bold">{resort?.name}</h2>
              {resort?.pass && (
                <img
                  src={resort.pass === "Epic" ? "/Epic.png" : "/Ikon.png"}
                  alt={resort.pass}
                  className="h-6 w-auto object-contain opacity-90 rounded-sm ring-1 ring-white/25"
                />
              )}
            </div>
            <p className="text-white/40 text-sm mt-1">{resort?.country}</p>
            {resort?.passType && (
              <div className="mt-2">
                <Badge
                  label={resort.passType === "full" ? "Full Pass" : "Limited"}
                  bg="rgba(255,255,255,0.06)"
                  color="rgba(255,255,255,0.5)"
                  border="rgba(255,255,255,0.12)"
                />
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white text-3xl leading-none mt-1 shrink-0 ml-4"
          >
            ×
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 border-b border-white/10 shrink-0">
          <StatBar
            label="Vertical Drop"
            value={resort?.verticalDrop}
            display={resort ? `${resort.verticalDrop.toLocaleString()}m` : "—"}
            max={REF.vertical}
          />
          <StatBar
            label="Total Runs"
            value={resort?.totalRuns}
            display={resort ? String(resort.totalRuns) : "—"}
            max={REF.runs}
          />
          <StatBar
            label="Lifts"
            value={resort?.lifts}
            display={resort ? String(resort.lifts) : "—"}
            max={REF.lifts}
          />
        </div>

        {/* Location row */}
        <div className="flex items-center gap-6 px-6 py-3 border-b border-white/10 shrink-0">
          <DetailItem label="Latitude" value={latStr} />
          <DetailItem label="Longitude" value={lngStr} />
          {resort?.country && (
            <DetailItem label="Country" value={resort.country} />
          )}
        </div>

        {/* Map */}
        <div className="flex-1 min-h-0 relative">
          {resort && <ResortMap resort={resort} />}
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 px-4 py-2 rounded-full border border-white/10 pointer-events-none select-none"
            style={{ background: "rgba(4, 14, 28, 0.75)", backdropFilter: "blur(8px)" }}
          >
            <Hint icon="🖱️" primary="Left drag" secondary="Pan" />
            <div className="w-px h-4 bg-white/10" />
            <Hint icon="⚲" primary="Right drag" secondary="Rotate" />
            <div className="w-px h-4 bg-white/10" />
            <Hint icon="⊕" primary="Scroll" secondary="Zoom" />
          </div>
        </div>
      </div>
    </>
  );
}

function Badge({ label, bg, color, border }: { label: string; bg: string; color: string; border: string }) {
  return (
    <span
      className="text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ background: bg, color, border: `1px solid ${border}` }}
    >
      {label}
    </span>
  );
}

function StatBar({
  label, value, display, max,
}: {
  label: string; value: number | undefined; display: string; max: number;
}) {
  const pct = value != null ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex flex-col px-5 py-4 border-r border-white/10 last:border-r-0 gap-2">
      <span className="text-white/40 text-xs uppercase tracking-wider">{label}</span>
      <span className="text-white font-bold text-2xl leading-none">{display}</span>
      <div className="h-px w-full bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(to right, #3b82f6, #67e8f9)",
          }}
        />
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-white/30 text-[10px] uppercase tracking-widest">{label}</span>
      <span className="text-white/70 text-sm font-medium">{value}</span>
    </div>
  );
}

function Hint({ icon, primary, secondary }: { icon: string; primary: string; secondary: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-white/40 text-xs">{icon}</span>
      <span className="text-white/60 text-xs font-medium">{primary}</span>
      <span className="text-white/25 text-xs">·</span>
      <span className="text-white/35 text-xs">{secondary}</span>
    </div>
  );
}
