"use client";

import Globe from "@/components/Globe";
import HelpModal from "@/components/HelpModal";
import Legend from "@/components/Legend";
import ResortDrawer from "@/components/ResortDrawer";
import ResortPopover from "@/components/ResortPopover";
import ClusterPopover from "@/components/ClusterPopover";
import { useResorts } from "@/lib/hooks/useResports";
import { Resort } from "@/lib/types/resort";
import type { ScreenPos } from "@/components/Globe";
import { useState } from "react";

export default function Home() {
  const { data: resorts, isLoading } = useResorts();
  const [introComplete, setIntroComplete] = useState(false);
  const [modalResort, setModalResort] = useState<Resort | null>(null);
  const [popover, setPopover] = useState<{
    resort: Resort;
    pos: ScreenPos;
    fromCluster?: { resorts: Resort[]; pos: ScreenPos };
  } | null>(null);
  const [cluster, setCluster] = useState<{
    resorts: Resort[];
    pos: ScreenPos;
  } | null>(null);

  if (isLoading)
    return (
      <div
        className="w-screen h-screen flex items-center justify-center text-white"
        style={{
          background:
            "radial-gradient(ellipse at center, #061428 0%, #020508 100%)",
        }}
      ></div>
    );

  return (
    <main
      className="w-screen h-screen relative overflow-hidden"
      style={{ background: "#020508" }}
    >
      {/* Animated background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="glow-pulse absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 55% at 38% 52%, #0a2a50 0%, transparent 70%)",
          }}
        />
        <div
          className="glow-drift absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 40% 40% at 42% 50%, #0d3666 0%, transparent 65%)",
          }}
        />
      </div>

      <div className="fixed top-6 right-6 z-30 flex shadow-2xl flex-col gap-3 w-64 ">
        {/* Ikon vs Epic image card */}
        <div
          className={`rounded-xl border border-white/10 overflow-hidden transition-all duration-700 ease-out ${introComplete ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8 pointer-events-none"}`}
          style={{
            background: "rgba(4, 14, 28, 0.85)",
            backdropFilter: "blur(12px)",
          }}
        >
          <img
            src="/ikon-vs-epic.png"
            alt="Ikon vs Epic"
            className="w-full h-auto block p-4"
          />
          <p className="text-white/40 text-xs text-center pb-3 -mt-2 tracking-widest uppercase">
            North America Edition
          </p>
        </div>

        <div className={`transition-all duration-700 ease-out delay-300 ${introComplete ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8 pointer-events-none"}`}>
          <Legend resorts={resorts ?? []} visible={introComplete} />
        </div>
      </div>
      <HelpModal visible={introComplete} />
      <Globe
        resorts={resorts ?? []}
        onResortClick={(resort, pos) => setPopover({ resort, pos })}
        onClusterClick={(resorts, pos) => setCluster({ resorts, pos })}
        onIntroComplete={() => setIntroComplete(true)}
      />

      {popover && (
        <ResortPopover
          resort={popover.resort}
          pos={popover.pos}
          onClose={() => setPopover(null)}
          onViewDetails={(resort) => setModalResort(resort)}
          onBack={
            popover.fromCluster
              ? () => {
                  setPopover(null);
                  setCluster(popover.fromCluster!);
                }
              : undefined
          }
        />
      )}

      {cluster && (
        <ClusterPopover
          resorts={cluster.resorts}
          pos={cluster.pos}
          onClose={() => setCluster(null)}
          onResortClick={(resort, pos) => {
            setCluster(null);
            setPopover({ resort, pos, fromCluster: cluster });
          }}
        />
      )}

      <ResortDrawer
        resort={modalResort}
        resorts={resorts ?? []}
        onClose={() => setModalResort(null)}
        onNavigate={(resort) => setModalResort(resort)}
      />
    </main>
  );
}
