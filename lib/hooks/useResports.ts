// lib/hooks/useResorts.ts
import { useQuery } from "@tanstack/react-query";
import { Resort } from "../types/resort";

export function useResorts() {
  return useQuery({
    queryKey: ["resorts"],
    queryFn: async (): Promise<Resort[]> => {
      const res = await fetch("/resorts-epic-ikon.json");
      if (!res.ok) throw new Error("Failed to fetch resorts");
      return res.json();
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
