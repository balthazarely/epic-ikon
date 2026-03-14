"use client";
import { useEffect, useRef, useState } from "react";
import type { Resort } from "@/lib/types/resort";
import type { ScreenPos } from "./Globe";
import { formatElevation } from "@/lib/utils/units";

interface ResortPopoverProps {
  resort: Resort;
  pos: ScreenPos;
  onClose: () => void;
  onViewDetails: (resort: Resort) => void;
  onBack: (() => void) | undefined;
}

export default function ResortPopover({
  resort,
  pos,
  onClose,
  onViewDetails,
  onBack,
}: ResortPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Close on escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const OFFSET = 16;

  return (
    <div
      ref={ref}
      className="fixed z-50 rounded-xl overflow-hidden shadow-2xl border border-white/10 left-4 right-4 bottom-28 sm:left-auto sm:right-auto sm:bottom-auto sm:w-56"
      style={{
        ...(isMobile ? {} : { left: pos.x + OFFSET, top: pos.y + OFFSET }),
        background: "rgba(6, 20, 40, 0.92)",
        backdropFilter: "blur(12px)",
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.6), 0 0 40px rgba(20, 80, 160, 0.18)",
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-4 pb-2">
        <div className="flex-1 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-white/40 hover:text-white text-xs mb-2 transition-colors"
            >
              <span>←</span>
              <span>Back to cluster</span>
            </button>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-white font-bold text-sm leading-tight">
              {resort.name}
            </h3>
            {resort.pass && (
              <img
                src={resort.pass === "Epic" ? "/Epic.png" : "/Ikon.png"}
                alt={resort.pass}
                className="h-4 w-auto object-contain opacity-90 rounded-sm ring-1 ring-white/25"
              />
            )}
          </div>
          <p className="text-white/50 text-xs mt-0.5">
            {[resort.region, resort.country].filter(Boolean).join(", ")}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-white/40 hover:text-white text-lg leading-none ml-2 mt-0.5"
        >
          ×
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-px bg-white/5 border-t border-white/10">
        <Stat label="Vertical" value={formatElevation(resort.verticalDrop)} />
        <Stat label="Runs" value={resort.totalRuns} />
        <Stat label="Lifts" value={resort.lifts} />
      </div>

      {/* View details */}
      <div className="px-4 py-3">
        <button
          onClick={() => {
            onViewDetails(resort);
            onClose();
          }}
          className="w-full text-xs font-semibold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg py-2 transition-colors"
        >
          View Details & Map
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center py-2 bg-white/3">
      <span className="text-white font-bold text-sm">{value}</span>
      <span className="text-white/40 text-xs">{label}</span>
    </div>
  );
}
