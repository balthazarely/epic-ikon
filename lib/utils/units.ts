export function metersToFeet(m: number): number {
  return Math.round(m * 3.28084);
}

export function kmToMiles(km: number): number {
  return parseFloat((km * 0.621371).toFixed(1));
}

export function formatElevation(m: number): string {
  return `${metersToFeet(m).toLocaleString()} ft`;
}

export function formatDistance(km: number): string {
  return `${kmToMiles(km)} mi`;
}
