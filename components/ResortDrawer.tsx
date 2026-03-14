"use client";
import { useEffect, useState } from "react";
import type { Resort } from "@/lib/types/resort";
import ResortMap from "./ResortMap";
import { formatElevation, formatDistance } from "@/lib/utils/units";

interface ResortDrawerProps {
  resort: Resort | null;
  resorts: Resort[];
  onClose: () => void;
  onNavigate: (resort: Resort) => void;
}

const REF = {
  vertical: 2000,
  runs: 300,
  lifts: 50,
  trailKm: 200,
  summit: 4500,
  base: 3500,
  snowmaking: 100,
};

const DIFFICULTY_COLORS: Record<string, string> = {
  novice: "#22c55e",
  easy: "#4ade80",
  intermediate: "#3b82f6",
  advanced: "#f97316",
  hard: "#ef4444",
  expert: "#a855f7",
  freeride: "#06b6d4",
  other: "#6b7280",
};

export default function ResortDrawer({
  resort,
  resorts,
  onClose,
  onNavigate,
}: ResortDrawerProps) {
  const [fullscreen, setFullscreen] = useState(false);

  const currentIndex = resort
    ? resorts.findIndex((r) => r.id === resort.id)
    : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < resorts.length - 1;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (fullscreen) setFullscreen(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, fullscreen]);

  useEffect(() => {
    if (!resort) setFullscreen(false);
  }, [resort]);

  const diffEntries = resort?.runsByDifficulty
    ? Object.entries(resort.runsByDifficulty).filter(([, v]) => v && v > 0)
    : [];
  const totalForBar = diffEntries.reduce((s, [, v]) => s + (v ?? 0), 0);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${resort ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed z-50 flex flex-col shadow-2xl transition-all duration-300 ease-in-out ${fullscreen ? "inset-0" : `top-0 right-0 h-full w-full max-w-2xl ${resort ? "translate-x-0" : "translate-x-full"}`}`}
        style={{
          background: "rgba(6, 20, 40, 0.88)",
          backdropFilter: "blur(16px)",
        }}
      >
        {/* Header — always fixed */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/10 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-white text-xl font-bold leading-tight">{resort?.name}</h2>
              {resort?.pass && (
                <img
                  src={resort.pass === "Epic" ? "/Epic.png" : "/Ikon.png"}
                  alt={resort.pass}
                  className="h-5 w-auto object-contain opacity-90 rounded-sm ring-1 ring-white/25"
                />
              )}
              {resort?.passType && (
                <Badge
                  label={resort.passType === "full" ? "Full Pass" : "Limited"}
                  bg="rgba(255,255,255,0.06)"
                  color="rgba(255,255,255,0.5)"
                  border="rgba(255,255,255,0.12)"
                />
              )}
            </div>
            <p className="text-white/40 text-sm mt-0.5">
              {[resort?.region, resort?.country].filter(Boolean).join(", ")}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4 shrink-0">
            <button
              onClick={() => {
                if (hasPrev) onNavigate(resorts[currentIndex - 1]!);
              }}
              disabled={!hasPrev}
              className="flex items-center justify-center w-9 h-9 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/25 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
              style={{ background: "rgba(255,255,255,0.04)" }}
              title="Previous resort"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={() => {
                if (hasNext) onNavigate(resorts[currentIndex + 1]!);
              }}
              disabled={!hasNext}
              className="flex items-center justify-center w-9 h-9 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/25 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
              style={{ background: "rgba(255,255,255,0.04)" }}
              title="Next resort"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="text-white/40 hover:text-white text-3xl leading-none ml-1"
            >
              ×
            </button>
          </div>
        </div>

        {fullscreen ? (
          /* ── Fullscreen: map left, info right ── */
          <div className="flex-1 min-h-0 flex flex-row">
            {/* Map — takes remaining width */}
            <div className="flex-1 min-w-0 relative">
              {resort && <ResortMap key="fs" resort={resort} />}
              <FullscreenButton
                fullscreen={fullscreen}
                onClick={() => setFullscreen((v) => !v)}
              />
              <div
                className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 px-4 py-2 rounded-full border border-white/10 pointer-events-none select-none"
                style={{
                  background: "rgba(4, 14, 28, 0.75)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <Hint icon="🖱️" primary="Left drag" secondary="Pan" />
                <div className="w-px h-4 bg-white/10" />
                <Hint icon="⚲" primary="Right drag" secondary="Rotate" />
                <div className="w-px h-4 bg-white/10" />
                <Hint icon="⊕" primary="Scroll" secondary="Zoom" />
              </div>
            </div>

            {/* Info panel — fixed width, scrollable */}
            <div className="w-96 shrink-0 border-l border-white/10 flex flex-col overflow-y-auto">
              <div className="grid grid-cols-3 border-b border-white/10 shrink-0">
                <StatBar
                  label="Vertical Drop"
                  value={resort?.verticalDrop}
                  display={resort ? formatElevation(resort.verticalDrop) : "—"}
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
              <div className="grid grid-cols-3 border-b border-white/10 shrink-0">
                <StatBar
                  label="Summit"
                  value={resort?.maxElevation ?? undefined}
                  display={
                    resort?.maxElevation != null
                      ? formatElevation(resort.maxElevation)
                      : "—"
                  }
                  max={REF.summit}
                />
                <StatBar
                  label="Base"
                  value={resort?.minElevation ?? undefined}
                  display={
                    resort?.minElevation != null
                      ? formatElevation(resort.minElevation)
                      : "—"
                  }
                  max={REF.base}
                />
                <StatBar
                  label="Trail Mi"
                  value={resort?.totalTrailKm ?? undefined}
                  display={
                    resort?.totalTrailKm
                      ? formatDistance(resort.totalTrailKm)
                      : "—"
                  }
                  max={REF.trailKm}
                />
              </div>
              {diffEntries.length > 0 && (
                <div className="px-6 py-4 border-b border-white/10">
                  <span className="text-white/30 text-[10px] uppercase tracking-widest block mb-2">
                    Runs by Difficulty
                  </span>
                  <div className="flex h-2 w-full rounded-full overflow-hidden gap-px mb-3">
                    {diffEntries.map(([d, count]) => (
                      <div
                        key={d}
                        style={{
                          width: `${((count ?? 0) / totalForBar) * 100}%`,
                          background: DIFFICULTY_COLORS[d] ?? "#6b7280",
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {diffEntries.map(([d, count]) => (
                      <div key={d} className="flex items-center gap-1.5">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{
                            background: DIFFICULTY_COLORS[d] ?? "#6b7280",
                          }}
                        />
                        <span className="text-white/50 text-xs capitalize">
                          {d}
                        </span>
                        <span className="text-white/70 text-xs font-medium">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ── Normal: scrollable content ── */
          <div className="flex-1 overflow-y-auto">
            {/* Description + website */}
            {(resort?.description || resort?.website) && (
              <div className="px-6 py-4 border-b border-white/10">
                {resort?.description && (
                  <p className="text-white/50 text-sm leading-relaxed">
                    {resort.description}
                  </p>
                )}
                {resort?.website && (
                  <a
                    href={resort.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-3 text-xs font-medium px-2.5 py-1 rounded-full transition-colors"
                    style={{
                      background: "rgba(59,130,246,0.1)",
                      color: "#93c5fd",
                      border: "1px solid rgba(59,130,246,0.25)",
                    }}
                  >
                    Visit Website ↗
                  </a>
                )}
              </div>
            )}

            {/* Map — fixed height */}
            <div className="relative h-72">
              {resort && <ResortMap key="normal" resort={resort} />}
              <FullscreenButton
                fullscreen={fullscreen}
                onClick={() => setFullscreen((v) => !v)}
              />
              <div
                className="absolute bottom-4 left-1/2 -translate-x-1/2 hidden sm:flex items-center gap-4 px-4 py-2 rounded-full border border-white/10 pointer-events-none select-none"
                style={{
                  background: "rgba(4, 14, 28, 0.75)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <Hint icon="🖱️" primary="Left drag" secondary="Pan" />
                <div className="w-px h-4 bg-white/10" />
                <Hint icon="⚲" primary="Right drag" secondary="Rotate" />
                <div className="w-px h-4 bg-white/10" />
                <Hint icon="⊕" primary="Scroll" secondary="Zoom" />
              </div>
            </div>

            <div>
              <div className="grid grid-cols-3 border-b border-white/10">
                <StatBar
                  label="Vertical Drop"
                  value={resort?.verticalDrop}
                  display={resort ? formatElevation(resort.verticalDrop) : "—"}
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
              <div className="grid grid-cols-3 border-b border-white/10">
                <StatBar
                  label="Summit"
                  value={resort?.maxElevation ?? undefined}
                  display={
                    resort?.maxElevation != null
                      ? formatElevation(resort.maxElevation)
                      : "—"
                  }
                  max={REF.summit}
                />
                <StatBar
                  label="Base"
                  value={resort?.minElevation ?? undefined}
                  display={
                    resort?.minElevation != null
                      ? formatElevation(resort.minElevation)
                      : "—"
                  }
                  max={REF.base}
                />
                <StatBar
                  label="Trail Mi"
                  value={resort?.totalTrailKm ?? undefined}
                  display={
                    resort?.totalTrailKm
                      ? formatDistance(resort.totalTrailKm)
                      : "—"
                  }
                  max={REF.trailKm}
                />
              </div>
              {diffEntries.length > 0 && (
                <div className="px-6 py-4 border-b border-white/10">
                  <span className="text-white/30 text-[10px] uppercase tracking-widest block mb-2">
                    Runs by Difficulty
                  </span>
                  <div className="flex h-2 w-full rounded-full overflow-hidden gap-px mb-3">
                    {diffEntries.map(([d, count]) => (
                      <div
                        key={d}
                        style={{
                          width: `${((count ?? 0) / totalForBar) * 100}%`,
                          background: DIFFICULTY_COLORS[d] ?? "#6b7280",
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {diffEntries.map(([d, count]) => (
                      <div key={d} className="flex items-center gap-1.5">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{
                            background: DIFFICULTY_COLORS[d] ?? "#6b7280",
                          }}
                        />
                        <span className="text-white/50 text-xs capitalize">
                          {d}
                        </span>
                        <span className="text-white/70 text-xs font-medium">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Badge({
  label,
  bg,
  color,
  border,
}: {
  label: string;
  bg: string;
  color: string;
  border: string;
}) {
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
  label,
  value,
  display,
  max,
}: {
  label: string;
  value: number | undefined;
  display: string;
  max: number;
}) {
  const pct = value != null ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex flex-col px-5 py-4 border-r border-white/10 last:border-r-0 gap-2">
      <span className="text-white/40 text-xs uppercase tracking-wider">
        {label}
      </span>
      <span className="text-white font-bold text-2xl leading-none">
        {display}
      </span>
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

function FullscreenButton({
  fullscreen,
  onClick,
}: {
  fullscreen: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
      className="absolute top-3 left-3 z-10 hidden sm:flex items-center justify-center w-8 h-8 rounded-lg text-white/50 hover:text-white transition-colors border border-white/10 hover:border-white/25"
      style={{
        background: "rgba(4, 14, 28, 0.75)",
        backdropFilter: "blur(8px)",
      }}
    >
      {fullscreen ? (
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M6 2H2v4M10 2h4v4M6 14H2v-4M10 14h4v-4" />
        </svg>
      ) : (
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M2 6V2h4M10 2h4v4M2 10v4h4M14 10v4h-4" />
        </svg>
      )}
    </button>
  );
}

function Hint({
  icon,
  primary,
  secondary,
}: {
  icon: string;
  primary: string;
  secondary: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-white/40 text-xs">{icon}</span>
      <span className="text-white/60 text-xs font-medium">{primary}</span>
      <span className="text-white/25 text-xs">·</span>
      <span className="text-white/35 text-xs">{secondary}</span>
    </div>
  );
}
