"use client";
import { useEffect, useRef, useState } from "react";
import type { Resort } from "@/lib/types/resort";
import type { ScreenPos } from "./Globe";

interface ClusterPopoverProps {
  resorts: Resort[];
  pos: ScreenPos;
  onClose: () => void;
  onResortClick: (resort: Resort, pos: ScreenPos) => void;
}

export default function ClusterPopover({
  resorts,
  pos,
  onClose,
  onResortClick,
}: ClusterPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const ikonCount = resorts.filter((r) => r.pass === "Ikon").length;
  const epicCount = resorts.filter((r) => r.pass === "Epic").length;

  return (
    <div
      ref={ref}
      className="fixed z-50 rounded-xl overflow-hidden shadow-2xl border border-white/10 left-4 right-4 bottom-28 sm:left-auto sm:right-auto sm:bottom-auto sm:w-64"
      style={{
        ...(isMobile ? { maxHeight: "60dvh" } : { left: pos.x + 16, top: pos.y + 16 }),
        background: "rgba(6, 20, 40, 0.92)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 40px rgba(20, 80, 160, 0.18)",
      }}
      onMouseDown={e => e.stopPropagation()}
      onMouseUp={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div>
          <h3 className="text-white font-bold text-sm">{resorts.length} Resorts</h3>
          <div className="flex gap-2 mt-1">
            {ikonCount > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "#07214133", color: "#7aacff", border: "1px solid #7aacff44" }}>
                {ikonCount} Ikon
              </span>
            )}
            {epicCount > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "#FF8B0022", color: "#FF8B00", border: "1px solid #FF8B0055" }}>
                {epicCount} Epic
              </span>
            )}
          </div>
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white text-lg leading-none">×</button>
      </div>

      {/* Resort list */}
      <ul className="overflow-y-auto" style={{ maxHeight: isMobile ? "calc(60dvh - 72px)" : "16rem" }}>
        {resorts.map((resort) => (
          <li key={resort.id}>
            <button
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/10 transition-colors text-left"
              onClick={() => {
                onResortClick(resort, pos);
                onClose();
              }}
            >
              <div>
                <p className="text-white text-xs font-medium leading-tight">{resort.name}</p>
                <p className="text-white/40 text-xs">{[resort.region, resort.country].filter(Boolean).join(", ")}</p>
              </div>
              <span
                className="text-xs shrink-0 ml-2 px-1.5 py-0.5 rounded-full"
                style={{
                  background: resort.pass === "Epic" ? "#FF8B0022" : "#07214133",
                  color: resort.pass === "Epic" ? "#FF8B00" : "#7aacff",
                  border: `1px solid ${resort.pass === "Epic" ? "#FF8B0055" : "#7aacff44"}`,
                }}
              >
                {resort.pass}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
