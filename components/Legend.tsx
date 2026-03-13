"use client";

import { useMemo } from "react";
import { useFilter } from "@/lib/context/FilterContext";
import type { Resort } from "@/lib/types/resort";
import { formatElevation } from "@/lib/utils/units";

interface LegendProps {
  resorts: Resort[];
  visible: boolean;
}

export default function Legend({ resorts, visible }: LegendProps) {
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
    <div
      className={`rounded-xl px-4 py-4 border border-white/10 overflow-y-auto shadow-2xl transition-all duration-700 ease-out ${visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8 pointer-events-none"}`}
      style={{
        background: "rgba(4, 14, 28, 0.85)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Pass */}
      <Section label="Pass" onReset={undefined}>
        <ul className="flex flex-col gap-2">
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
      </Section>

      <Divider />

      {/* Pass Type */}
      <Section label="Pass Type" onReset={undefined}>
        <ul className="flex flex-col gap-2">
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
      </Section>

      <Divider />

      {/* Vertical Drop */}
      <Section
        label="Min Vertical"
        onReset={minVertical > 0 ? () => setMinVertical(0) : undefined}
      >
        <MinSlider
          min={0}
          max={maxStats.vertical}
          value={minVertical}
          onChange={setMinVertical}
          step={50}
          format={(v) => formatElevation(v)}
        />
      </Section>

      <Divider />

      {/* Total Runs */}
      <Section
        label="Min Runs"
        onReset={minRuns > 0 ? () => setMinRuns(0) : undefined}
      >
        <MinSlider
          min={0}
          max={maxStats.runs}
          value={minRuns}
          onChange={setMinRuns}
          step={5}
          format={(v) => String(v)}
        />
      </Section>

      <Divider />

      {/* Lifts */}
      <Section
        label="Min Lifts"
        onReset={minLifts > 0 ? () => setMinLifts(0) : undefined}
      >
        <MinSlider
          min={0}
          max={maxStats.lifts}
          value={minLifts}
          onChange={setMinLifts}
          step={1}
          format={(v) => String(v)}
        />
      </Section>

      {/* Reset all */}
      {isFiltered && (
        <>
          <Divider />
          <button
            onClick={resetAll}
            className="w-full py-1.5 rounded-lg text-xs font-medium tracking-wide transition-colors text-white/50 hover:text-white border border-white/10 hover:border-white/25"
          >
            Reset all filters
          </button>
        </>
      )}
    </div>
  );
}

function Section({
  label,
  onReset,
  children,
}: {
  label: string;
  onReset: (() => void) | undefined;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-white/40 text-xs uppercase tracking-widest">
          {label}
        </p>
        {onReset && (
          <button
            onClick={onReset}
            className="text-white/30 hover:text-white/70 text-[10px] uppercase tracking-wide transition-colors"
          >
            reset
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function Divider() {
  return <div className="border-t border-white/8 my-3" />;
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
    <li>
      <button
        onClick={onClick}
        className={`flex items-center gap-3 transition-opacity hover:opacity-80 cursor-pointer ${active ? "opacity-100" : "opacity-35"}`}
      >
        {image ? (
          <img
            src={image}
            alt={label}
            className="shrink-0 h-4 w-auto object-contain rounded-sm ring-2 ring-white/40"
          />
        ) : (
          <span
            className="shrink-0 w-4 h-4 rounded-full border border-white/20"
            style={{ background: color }}
          />
        )}
        <span className="text-white/70 text-xs">{label}</span>
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
    <div className="space-y-1.5">
      <div className="flex justify-between text-white/40 text-[10px]">
        <span>{format(value)}</span>
        <span className="text-white/20">{format(max)}</span>
      </div>
      <div className="relative h-3 flex items-center">
        {/* Track background */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-white/15 rounded-full" />
        {/* Colored fill */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-px rounded-full"
          style={{
            left: 0,
            right: `${100 - pct}%`,
            background: "linear-gradient(to right, #3b82f6, #67e8f9)",
          }}
        />
        {/* Thumb dot */}
        <div
          className="absolute w-2.5 h-2.5 rounded-full pointer-events-none -translate-x-1/2 shadow-sm"
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
