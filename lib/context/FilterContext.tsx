"use client";

import { createContext, useContext, useState } from "react";

const ALL_PASSES = ["Ikon", "Epic"] as const;
const ALL_PASS_TYPES = ["full", "limited"] as const;

interface FilterContextValue {
  activePasses: Set<string>;
  togglePass: (pass: string) => void;
  isAllActive: boolean;
  activePassTypes: Set<string>;
  togglePassType: (type: string) => void;
  minVertical: number;
  setMinVertical: (v: number) => void;
  minRuns: number;
  setMinRuns: (v: number) => void;
  minLifts: number;
  setMinLifts: (v: number) => void;
}

const FilterContext = createContext<FilterContextValue | null>(null);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [activePasses, setActivePasses] = useState<Set<string>>(new Set(ALL_PASSES));
  const [activePassTypes, setActivePassTypes] = useState<Set<string>>(new Set(ALL_PASS_TYPES));
  const [minVertical, setMinVertical] = useState(0);
  const [minRuns, setMinRuns] = useState(0);
  const [minLifts, setMinLifts] = useState(0);

  function togglePass(pass: string) {
    setActivePasses((prev) => {
      const next = new Set(prev);
      if (next.has(pass)) {
        next.delete(pass);
        if (next.size === 0) return new Set(ALL_PASSES);
      } else {
        next.add(pass);
      }
      return next;
    });
  }

  function togglePassType(type: string) {
    setActivePassTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
        if (next.size === 0) return new Set(ALL_PASS_TYPES);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  return (
    <FilterContext.Provider
      value={{
        activePasses, togglePass, isAllActive: activePasses.size === ALL_PASSES.length,
        activePassTypes, togglePassType,
        minVertical, setMinVertical,
        minRuns, setMinRuns,
        minLifts, setMinLifts,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilter() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilter must be used within FilterProvider");
  return ctx;
}
