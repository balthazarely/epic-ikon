"use client";

import Globe from "@/components/Globe";
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
  const [modalResort, setModalResort] = useState<Resort | null>(null);
  const [popover, setPopover] = useState<{ resort: Resort; pos: ScreenPos; fromCluster?: { resorts: Resort[]; pos: ScreenPos } } | null>(null);
  const [cluster, setCluster] = useState<{ resorts: Resort[]; pos: ScreenPos } | null>(null);

  if (isLoading)
    return (
      <div
        className="w-screen h-screen flex items-center justify-center text-white"
        style={{
          background:
            "radial-gradient(ellipse at center, #061428 0%, #020508 100%)",
        }}
      >
        Loading...
      </div>
    );

  return (
    <main
      className="w-screen h-screen"
      style={{
        background:
          "radial-gradient(ellipse at center, #061428 0%, #020508 100%)",
      }}
    >
      <Legend />
      <Globe
        resorts={resorts ?? []}
        onResortClick={(resort, pos) => setPopover({ resort, pos })}
        onClusterClick={(resorts, pos) => setCluster({ resorts, pos })}
      />

      {popover && (
        <ResortPopover
          resort={popover.resort}
          pos={popover.pos}
          onClose={() => setPopover(null)}
          onViewDetails={(resort) => setModalResort(resort)}
          onBack={popover.fromCluster ? () => {
            setPopover(null);
            setCluster(popover.fromCluster!);
          } : undefined}
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
        onClose={() => setModalResort(null)}
      />
    </main>
  );
}
