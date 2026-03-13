import { useQuery } from "@tanstack/react-query";
import { Resort } from "../types/resort";

interface Trail {
  name: string;
  difficulty: string;
  status: string;
  coordinates: [number, number, number][];
}

export function useTrails(resort: Resort) {
  return useQuery({
    queryKey: ["trails", resort.id],
    queryFn: async (): Promise<Trail[]> => {
      const res = await fetch(`/api/trails/${resort.id}`);
      if (!res.ok) throw new Error("Failed to fetch trails");
      return res.json();
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
