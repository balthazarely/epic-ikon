const fs = require("fs");
const path = require("path");

// ---- Helpers ----
function getCentroid(coordinates) {
  const ring = coordinates[0];
  const lng = ring.reduce((sum, c) => sum + c[0], 0) / ring.length;
  const lat = ring.reduce((sum, c) => sum + c[1], 0) / ring.length;
  return {
    lat: parseFloat(lat.toFixed(4)),
    lng: parseFloat(lng.toFixed(4)),
  };
}

// ---- Load ----
console.log("⛷️  Loading GeoJSON...");
const raw = JSON.parse(
  fs.readFileSync(
    path.join(process.cwd(), "rawdata/ski-areas.geojson"),
    "utf-8",
  ),
);

const total = raw.features.length;
console.log(`📦 Total features: ${total.toLocaleString()}`);

// ---- Inspect unique values ----
const uniqueStatuses = new Set(raw.features.map((f) => f.properties.status));
const uniqueActivities = new Set(
  raw.features.flatMap((f) => f.properties.activities),
);
const uniqueConventions = new Set(
  raw.features.map((f) => f.properties.runConvention),
);
const uniqueGeometryTypes = new Set(raw.features.map((f) => f.geometry?.type));

console.log("\n📊 Dataset breakdown:");
console.log("  Statuses:       ", [...uniqueStatuses]);
console.log("  Activities:     ", [...uniqueActivities]);
console.log("  Conventions:    ", [...uniqueConventions]);
console.log("  Geometry types: ", [...uniqueGeometryTypes]);

// ---- Filter pipeline ----
const hasDownhill = raw.features.filter((f) =>
  f.properties.activities.includes("downhill"),
);

const isOperating = hasDownhill.filter(
  (f) => f.properties.status === "operating",
);

const hasName = isOperating.filter(
  (f) => f.properties.name !== null && f.properties.name.trim() !== "",
);

const hasValidGeometry = hasName.filter(
  (f) =>
    ["Point", "Polygon", "MultiPolygon"].includes(f.geometry?.type) &&
    Array.isArray(f.geometry.coordinates) &&
    f.geometry.coordinates.length >= 1,
);

const meaningful = hasValidGeometry.filter((f) => {
  const diff =
    f.properties.statistics?.runs?.byActivity?.downhill?.byDifficulty ?? {};
  const totalRuns =
    (diff.novice?.count ?? 0) +
    (diff.easy?.count ?? 0) +
    (diff.intermediate?.count ?? 0) +
    (diff.advanced?.count ?? 0) +
    (diff.hard?.count ?? 0) +
    (diff.expert?.count ?? 0) +
    (diff.freeride?.count ?? 0) +
    (diff.other?.count ?? 0);
  if (totalRuns < 10) return false;

  return true;
});

console.log("\n🔍 Filter pipeline:");
console.log(`  Total:                    ${total.toLocaleString()}`);
console.log(
  `  Has downhill activity:    ${hasDownhill.length.toLocaleString()}`,
);
console.log(
  `  Is operating:             ${isOperating.length.toLocaleString()}`,
);
console.log(`  Has name:                 ${hasName.length.toLocaleString()}`);
console.log(
  `  Has valid geometry:       ${hasValidGeometry.length.toLocaleString()}`,
);
// console.log(
//   `  North America only:       ${northAmerica.length.toLocaleString()}`,
// );
console.log(
  `  Meaningful resorts:       ${meaningful.length.toLocaleString()}`,
);

// ---- Slim down to lean objects ----
const processed = meaningful.map((f) => {
  const diff =
    f.properties.statistics?.runs?.byActivity?.downhill?.byDifficulty ?? {};

  const novice = diff.novice?.count ?? 0;
  const easy = diff.easy?.count ?? 0;
  const intermediate = diff.intermediate?.count ?? 0;
  const advanced = diff.advanced?.count ?? 0;
  const hard = diff.hard?.count ?? 0;
  const expert = (diff.expert?.count ?? 0) + (diff.freeride?.count ?? 0);
  const other = diff.other?.count ?? 0;

  const lifts = f.properties.statistics?.lifts?.byType
    ? Object.values(f.properties.statistics.lifts.byType).reduce(
        (sum, l) => sum + l.count,
        0,
      )
    : 0;

  // Extract lat/lng based on geometry type
  let lat, lng;
  if (f.geometry.type === "Point") {
    lat = parseFloat(f.geometry.coordinates[1].toFixed(4));
    lng = parseFloat(f.geometry.coordinates[0].toFixed(4));
  } else if (f.geometry.type === "Polygon") {
    const centroid = getCentroid(f.geometry.coordinates);
    lat = centroid.lat;
    lng = centroid.lng;
  } else if (f.geometry.type === "MultiPolygon") {
    const centroid = getCentroid(f.geometry.coordinates[0]);
    lat = centroid.lat;
    lng = centroid.lng;
  }

  const place = f.properties.places?.[0];

  return {
    id: f.properties.id,
    name: f.properties.name,
    lat,
    lng,
    country: place?.iso3166_1Alpha2 ?? null,
    verticalDrop: Math.round(
      f.properties.statistics.maxElevation -
        f.properties.statistics.minElevation,
    ),
    totalRuns: novice + easy + intermediate + advanced + hard + expert + other,
    lifts,
    // Add this — only for Polygon/MultiPolygon, null for Points
    bounds:
      f.geometry.type === "Polygon"
        ? f.geometry.coordinates[0]
        : f.geometry.type === "MultiPolygon"
          ? f.geometry.coordinates[0][0]
          : null,
  };
});

// ---- Write output ----
const outputPath = path.join(process.cwd(), "public/resorts-all.json");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(processed));

const fileSizeKB = Math.round(fs.statSync(outputPath).size / 1024);
const fileSizeMB = (fileSizeKB / 1024).toFixed(2);

console.log("\n✅ Done!");
console.log(`  Output: public/resorts.json`);
console.log(`  Resorts: ${processed.length.toLocaleString()}`);
console.log(`  File size: ${fileSizeKB}KB (${fileSizeMB}MB)`);

// ---- Breakdown by country ----
const byCountry = processed.reduce((acc, r) => {
  const key = r.country ?? "unknown";
  acc[key] = (acc[key] ?? 0) + 1;
  return acc;
}, {});

console.log("\n🌍 Breakdown by country:");
Object.entries(byCountry)
  .sort(([, a], [, b]) => b - a)
  .forEach(([country, count]) => {
    console.log(`  ${country}: ${count}`);
  });

// ---- Geometry type breakdown ----
const byGeometry = meaningful.reduce((acc, f) => {
  const key = f.geometry?.type ?? "unknown";
  acc[key] = (acc[key] ?? 0) + 1;
  return acc;
}, {});

console.log("\n📐 Geometry types in output:");
Object.entries(byGeometry).forEach(([type, count]) => {
  console.log(`  ${type}: ${count}`);
});
