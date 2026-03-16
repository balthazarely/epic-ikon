"use client";

import { useState, useMemo } from "react";
import { useFilter } from "@/lib/context/FilterContext";
import type { Resort } from "@/lib/types/resort";
import { formatElevation } from "@/lib/utils/units";

interface MobileFilterDrawerProps {
  resorts: Resort[];
  visible: boolean;
}

export default function MobileFilterDrawer({
  resorts,
  visible,
}: MobileFilterDrawerProps) {
  const [open, setOpen] = useState(false);
  const {
    activePasses,
    togglePass,
    activePassTypes,
    togglePassType,
    minVertical,
    setMinVertical,
    minRuns,
    setMinRuns,
    minLifts,
    setMinLifts,
    resetAll,
    isFiltered,
  } = useFilter();

  const maxStats = useMemo(() => {
    if (resorts.length === 0) return { vertical: 2000, runs: 300, lifts: 50 };
    return {
      vertical: Math.max(...resorts.map((r) => r.verticalDrop)),
      runs: Math.max(...resorts.map((r) => r.totalRuns)),
      lifts: Math.max(...resorts.map((r) => r.lifts)),
    };
  }, [resorts]);

  return (
    <>
      {/* Trigger button — top-right, mobile only */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed top-6 right-6 z-30 sm:hidden w-11 h-11 rounded-full flex items-center justify-center border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-all duration-700 ease-out ${
          visible
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
        style={{
          background: "rgba(4, 14, 28, 0.85)",
          backdropFilter: "blur(12px)",
          boxShadow:
            "0 0 16px rgba(59, 130, 246, 0.2), 0 0 32px rgba(59, 130, 246, 0.08)",
        }}
        aria-label="Open filters"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 15 15"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          <path d="M1 3h13M3.5 7.5h8M6 12h3" />
        </svg>
        {isFiltered && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-400" />
        )}
      </button>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 sm:hidden bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setOpen(false)}
      />

      {/* Bottom sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 sm:hidden rounded-t-2xl border border-white/10 shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{
          background: "rgba(6, 20, 40, 0.97)",
          backdropFilter: "blur(16px)",
        }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/10">
          <span className="text-white/40 text-[10px] uppercase tracking-widest">
            Filters
          </span>
          <div className="flex items-center gap-4">
            {isFiltered && (
              <button
                onClick={resetAll}
                className="text-white/40 hover:text-white text-xs uppercase tracking-wide transition-colors"
              >
                Reset all
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              className="text-white/40 hover:text-white text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[65dvh]">
          {/* Pass */}
          <div>
            <p className="text-white/40 text-[10px] uppercase tracking-widest mb-3">
              Pass
            </p>
            <ul className="flex gap-6">
              <ToggleItem
                image="/Ikon.png"
                label="Ikon Pass"
                active={activePasses.has("Ikon")}
                onClick={() => togglePass("Ikon")}
              />
              <ToggleItem
                image="/Epic.png"
                label="Epic Pass"
                active={activePasses.has("Epic")}
                onClick={() => togglePass("Epic")}
              />
            </ul>
          </div>

          <div className="border-t border-white/8" />

          {/* Pass Type */}
          <div>
            <p className="text-white/40 text-[10px] uppercase tracking-widest mb-3">
              Pass Type
            </p>
            <ul className="flex gap-6">
              <ToggleItem
                color="#4a9eff"
                label="Full Pass"
                active={activePassTypes.has("full")}
                onClick={() => togglePassType("full")}
              />
              <ToggleItem
                color="#88bbff"
                label="Limited"
                active={activePassTypes.has("limited")}
                onClick={() => togglePassType("limited")}
              />
            </ul>
          </div>

          <div className="border-t border-white/8" />

          {/* Min Vertical */}
          <div>
            <p className="text-white/40 text-[10px] uppercase tracking-widest mb-3">
              Min Vertical
            </p>
            <MinSlider
              min={0}
              max={maxStats.vertical}
              value={minVertical}
              onChange={setMinVertical}
              step={50}
              format={(v) => formatElevation(v)}
            />
          </div>

          <div className="border-t border-white/8" />

          {/* Min Runs */}
          <div>
            <p className="text-white/40 text-[10px] uppercase tracking-widest mb-3">
              Min Runs
            </p>
            <MinSlider
              min={0}
              max={maxStats.runs}
              value={minRuns}
              onChange={setMinRuns}
              step={5}
              format={(v) => String(v)}
            />
          </div>

          <div className="border-t border-white/8" />

          {/* Min Lifts */}
          <div>
            <p className="text-white/40 text-[10px] uppercase tracking-widest mb-3">
              Min Lifts
            </p>
            <MinSlider
              min={0}
              max={maxStats.lifts}
              value={minLifts}
              onChange={setMinLifts}
              step={1}
              format={(v) => String(v)}
            />
          </div>

          {/* Bottom padding for safe area */}
          <div className="h-4" />
        </div>
      </div>
    </>
  );
}

function ToggleItem({
  color,
  image,
  label,
  active,
  onClick,
}: {
  color?: string;
  image?: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <li className="list-none">
      <button
        onClick={onClick}
        className={`flex items-center gap-3 transition-opacity hover:opacity-80 ${
          active ? "opacity-100" : "opacity-35"
        }`}
      >
        {image ? (
          <img
            src={image}
            alt={label}
            className="shrink-0 h-5 w-auto object-contain rounded-sm ring-2 ring-white/40"
          />
        ) : (
          <span
            className="shrink-0 w-4 h-4 rounded-full border border-white/20"
            style={{ background: color }}
          />
        )}
        <span className="text-white/70 text-sm">{label}</span>
      </button>
    </li>
  );
}

function MinSlider({
  min,
  max,
  value,
  onChange,
  step,
  format,
}: {
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
  step: number;
  format: (v: number) => string;
}) {
  const pct = max > 0 ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-white/40 text-xs">
        <span>{format(value)}</span>
        <span className="text-white/20">{format(max)}</span>
      </div>
      <div className="relative h-4 flex items-center">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-white/15 rounded-full" />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-px rounded-full"
          style={{
            left: 0,
            right: `${100 - pct}%`,
            background: "linear-gradient(to right, #3b82f6, #67e8f9)",
          }}
        />
        <div
          className="absolute w-3 h-3 rounded-full pointer-events-none -translate-x-1/2 shadow-sm"
          style={{
            left: `${pct}%`,
            background: "linear-gradient(135deg, #60a5fa, #67e8f9)",
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
}
