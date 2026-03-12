import { Resort } from "../types/resort";

export type ClusterPoint =
  | { type: "single"; resort: Resort }
  | { type: "cluster"; resorts: Resort[]; lat: number; lng: number };

export const CLUSTER_THRESHOLD_DEG = 2;

function angularDist(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng) * (180 / Math.PI);
}

export function buildClusters(resorts: Resort[]): ClusterPoint[] {
  const visited = new Set<number>();
  const result: ClusterPoint[] = [];

  for (let i = 0; i < resorts.length; i++) {
    if (visited.has(i)) continue;
    visited.add(i);

    const group: Resort[] = [resorts[i]!];

    for (let j = i + 1; j < resorts.length; j++) {
      if (visited.has(j)) continue;
      if (angularDist(resorts[i]!.lat, resorts[i]!.lng, resorts[j]!.lat, resorts[j]!.lng) < CLUSTER_THRESHOLD_DEG) {
        group.push(resorts[j]!);
        visited.add(j);
      }
    }

    if (group.length === 1) {
      result.push({ type: "single", resort: group[0]! });
    } else {
      const lat = group.reduce((s, r) => s + r.lat, 0) / group.length;
      const lng = group.reduce((s, r) => s + r.lng, 0) / group.length;
      result.push({ type: "cluster", resorts: group, lat, lng });
    }
  }

  return result;
}
