export interface Resort {
  id: string;
  name: string;
  pass?: string;
  passType?: "full" | "limited";
  lat: number;
  lng: number;
  country: string | null;
  verticalDrop: number;
  totalRuns: number;
  lifts: number;
  bounds: [number, number][] | null;
}
