"use client";

import { useState, useEffect, useRef } from "react";

const LS_KEY = "global-listen:visited";

interface HelpModalProps {
  visible: boolean;
}

const sections = [
  {
    heading: "Navigating the Globe",
    items: [
      {
        icon: "⬡",
        label: "Rotate",
        desc: "Click and drag to spin the globe in any direction.",
      },
      {
        icon: "⊕",
        label: "Zoom",
        desc: "Scroll up or down to zoom in and out.",
      },
    ],
  },
  {
    heading: "Exploring Resorts",
    items: [
      {
        icon: "◉",
        label: "Resort pin",
        desc: "Click a pin to see a quick summary of that resort, including vertical drop, runs, and lifts.",
      },
      {
        icon: "⬤",
        label: "Cluster",
        desc: "Click a numbered cluster to expand it and browse the resorts inside. Select any resort from the list for details.",
      },
      {
        icon: "⊞",
        label: "Resort map",
        desc: 'From a resort summary, click "View Map" to open a detailed 3D terrain map with slope boundaries.',
      },
    ],
  },
  {
    heading: "Filtering",
    items: [
      {
        icon: "▤",
        label: "Pass filter",
        desc: "Toggle Ikon Pass or Epic Pass in the top-right panel to show only those resorts on the globe.",
      },
      {
        icon: "◈",
        label: "Pass type",
        desc: "Filter by Full Pass or Limited access using the Pass Type toggles.",
      },
      {
        icon: "▲",
        label: "Stats filters",
        desc: "Use the Min Vertical, Min Runs, and Min Lifts sliders to surface resorts that meet a minimum threshold.",
      },
    ],
  },
];

export default function HelpModal({ visible }: HelpModalProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Auto-open on first visit once the intro is done
  useEffect(() => {
    if (!visible) return;
    const isFirstVisit = !localStorage.getItem(LS_KEY);
    if (isFirstVisit) setOpen(true);
  }, [visible]);

  const handleClose = () => {
    localStorage.setItem(LS_KEY, "1");
    setOpen(false);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) handleClose();
    };
    if (open) window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open, handleClose]);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed top-6 left-6 z-30 w-9 h-9 rounded-full flex items-center justify-center border border-white/15 text-white/50 hover:text-white hover:border-white/30 transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}`}
        style={{
          background: "rgba(4, 14, 28, 0.85)",
          backdropFilter: "blur(12px)",
        }}
        aria-label="How to use"
      >
        <span className="text-sm font-semibold leading-none">?</span>
      </button>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      />

      {/* Modal */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none transition-all duration-300 ${open ? "opacity-100" : "opacity-0"}`}
      >
        <div
          ref={ref}
          className={`w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl transition-all duration-300 ${open ? "pointer-events-auto scale-100 translate-y-0" : "pointer-events-none scale-95 translate-y-4"}`}
          style={{
            background: "rgba(6, 20, 40, 0.97)",
            backdropFilter: "blur(16px)",
          }}
        >
          {/* Header */}
          <div className="relative flex flex-col items-center px-6 pt-6 pb-4 border-b border-white/10 gap-2">
            <img
              src="/ikon-vs-epic.png"
              alt="Ikon vs Epic"
              className="h-10 w-auto object-contain"
            />
            <div className="text-center">
              <h2 className="text-white font-bold text-lg">How to use</h2>
              <p className="text-white/40 text-xs mt-0.5">Explore ski resorts on the interactive globe</p>
            </div>
            <button
              onClick={handleClose}
              className="absolute top-4 right-6 text-white/40 hover:text-white text-2xl leading-none transition-colors"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-5 space-y-6">
            {sections.map((section) => (
              <div key={section.heading}>
                <p className="text-white/35 text-[10px] uppercase tracking-widest mb-3">
                  {section.heading}
                </p>
                <ul className="space-y-3">
                  {section.items.map((item) => (
                    <li key={item.label} className="flex items-start gap-3">
                      <span
                        className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-white/60 text-sm border border-white/10"
                        style={{ background: "rgba(255,255,255,0.05)" }}
                      >
                        {item.icon}
                      </span>
                      <div>
                        <span className="text-white text-sm font-medium">
                          {item.label}
                        </span>
                        <span className="text-white/45 text-xs">
                          {" "}
                          — {item.desc}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/10">
            <button
              onClick={handleClose}
              className="w-full py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white bg-white/8 hover:bg-white/15 border border-white/10 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
