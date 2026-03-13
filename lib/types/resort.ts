export interface MapboxCamera {
  zoom: number;
  pitch: number;
  bearing: number;
  center: [number, number];
}

export interface RunsByDifficulty {
  novice?: number;
  easy?: number;
  intermediate?: number;
  advanced?: number;
  hard?: number;
  expert?: number;
  freeride?: number;
  other?: number;
}

export interface LiftsByType {
  chair_lift?: number;
  gondola?: number;
  rope_tow?: number;
  magic_carpet?: number;
  "t-bar"?: number;
  platter?: number;
  [key: string]: number | undefined;
}

export interface Resort {
  id: string;
  name: string;
  pass?: string;
  passType?: "full" | "limited";
  status: string | null;
  website: string | null;
  lat: number;
  lng: number;
  country: string | null;
  region: string | null;
  description?: string;
  maxElevation: number | null;
  minElevation: number | null;
  verticalDrop: number;
  totalRuns: number;
  totalTrailKm: number | null;
  snowmakingKm: number | null;
  runsByDifficulty: RunsByDifficulty | null;
  lifts: number;
  liftsByType: LiftsByType | null;
  bounds: [number, number][] | null;
  mapboxCamera: MapboxCamera | null;
}
