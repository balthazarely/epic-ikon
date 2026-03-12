"use client";

import { useFilter } from "@/lib/context/FilterContext";

export default function Legend() {
  const { activePasses, togglePass } = useFilter();

  return (
    <div
      className="fixed top-6 left-6 z-30 rounded-xl px-4 py-3 border border-white/10"
      style={{
        background: "rgba(4, 14, 28, 0.85)",
        backdropFilter: "blur(12px)",
      }}
    >
      <p className="text-white/40 text-xs uppercase tracking-widest mb-3">
        Pass Filter
      </p>
      <ul className="flex flex-col gap-2">
        <LegendItem
          color="#072141"
          label="Ikon Pass"
          active={activePasses.has("Ikon")}
          onClick={() => togglePass("Ikon")}
        />
        <LegendItem
          color="#FF8B00"
          label="Epic Pass"
          active={activePasses.has("Epic")}
          onClick={() => togglePass("Epic")}
        />
      </ul>
    </div>
  );
}

function LegendItem({
  color,
  label,
  active,
  onClick,
}: {
  color: string;
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
        <span className="shrink-0 w-4 h-4 rounded-full border border-white/20" style={{ background: color }} />
        <span className="text-white/70 text-xs">{label}</span>
      </button>
    </li>
  );
}
