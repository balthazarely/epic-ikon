import { useQuery } from "@tanstack/react-query";
import { Resort } from "../types/resort";

interface Lift {
  name: string;
  type: string;
  status: string;
  capacity: any;
  duration: number;
  coordinates: [number, number, number][];
}

export function useLifts(resort: Resort) {
  return useQuery({
    queryKey: ["lifts", resort.id],
    queryFn: async (): Promise<Lift[]> => {
      const res = await fetch(`/api/lifts/${resort.id}`);
      if (!res.ok) throw new Error("Failed to fetch lifts");
      return res.json();
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
