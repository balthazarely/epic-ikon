// components/ResortModal/ResortModal.tsx
"use client";
import { useEffect } from "react";
import type { Resort } from "@/lib/types/resort";
import ResortMap from "./ResortMap";

interface ResortModalProps {
  resort: Resort | null;
  onClose: () => void;
}

export default function ResortModal({ resort, onClose }: ResortModalProps) {
  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center
        transition-all duration-300
        ${resort ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
      `}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`
        relative w-[90vw] h-[85vh] rounded-2xl overflow-hidden
  bg-white shadow-2xl
        ${resort ? "scale-100" : "scale-95"}
      `}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-4 bg-linear-to-b from-black/80 to-transparent">
          <div>
            <h2 className="text-white text-2xl font-bold">{resort?.name}</h2>
            <p className="text-white/50 text-sm mt-0.5">{resort?.country}</p>
          </div>
          <div className="flex items-center gap-6 mr-10">
            <Stat label="Vertical" value={`${resort?.verticalDrop}m`} />
            <Stat label="Runs" value={resort?.totalRuns} />
            <Stat label="Lifts" value={resort?.lifts} />
          </div>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white text-3xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Map */}
        {resort && <ResortMap resort={resort} />}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string | number | undefined;
}) {
  return (
    <div className="text-center">
      <div className="text-white font-bold text-lg">{value}</div>
      <div className="text-white/40 text-xs">{label}</div>
    </div>
  );
}
