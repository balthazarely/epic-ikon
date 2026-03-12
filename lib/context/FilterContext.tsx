"use client";

import { createContext, useContext, useState } from "react";

const ALL_PASSES = ["Ikon", "Epic"] as const;

interface FilterContextValue {
  activePasses: Set<string>;
  togglePass: (pass: string) => void;
  isAllActive: boolean;
}

const FilterContext = createContext<FilterContextValue | null>(null);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [activePasses, setActivePasses] = useState<Set<string>>(
    new Set(ALL_PASSES),
  );

  function togglePass(pass: string) {
    setActivePasses((prev) => {
      const next = new Set(prev);
      if (next.has(pass)) {
        next.delete(pass);
        // If nothing left, reset to all
        if (next.size === 0) return new Set(ALL_PASSES);
      } else {
        next.add(pass);
      }
      return next;
    });
  }

  return (
    <FilterContext.Provider
      value={{ activePasses, togglePass, isAllActive: activePasses.size === ALL_PASSES.length }}
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
