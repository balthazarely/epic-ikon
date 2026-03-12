const fs = require("fs");
const path = require("path");

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
const myResorts = JSON.parse(
  fs.readFileSync(
    path.join(process.cwd(), "rawdata/resorts-epic-ikon.json"),
    "utf-8",
  ),
);

const raw = JSON.parse(
  fs.readFileSync(
    path.join(process.cwd(), "rawdata/ski-areas.geojson"),
    "utf-8",
  ),
);

console.log(`📦 My resorts: ${myResorts.length}`);
console.log(`📦 GeoJSON features: ${raw.features.length.toLocaleString()}`);

// ---- Build ID lookup ----
const lookupById = new Map();
for (const feature of raw.features) {
  const id = feature.properties?.id?.trim();
  if (id) lookupById.set(id, feature);
}

// ADD THESE:
const testId = "78bac1237b378a398d712ba2cc962ddf9d1c6479";
console.log(`🔍 Lookup map size: ${lookupById.size}`);
console.log(`🔍 Test ID found: ${lookupById.has(testId)}`);
console.log(
  `🔍 First resort ID from list: "${myResorts[0]?.id}" → found: ${lookupById.has(myResorts[0]?.id?.trim())}`,
);

// ---- Enrich ----
const output = [];
const unmatched = [];

for (const resort of myResorts) {
  const id = resort.id?.trim();
  const feature = id ? lookupById.get(id) : null;

  if (!feature) {
    unmatched.push(resort.name);
    output.push({
      ...resort,
      lat: null,
      lng: null,
      country: null,
      verticalDrop: null,
      totalRuns: null,
      lifts: null,
      bounds: null,
    });
    continue;
  }

  // Coords
  let lat, lng;
  if (feature.geometry.type === "Point") {
    lat = parseFloat(feature.geometry.coordinates[1].toFixed(4));
    lng = parseFloat(feature.geometry.coordinates[0].toFixed(4));
  } else if (feature.geometry.type === "Polygon") {
    ({ lat, lng } = getCentroid(feature.geometry.coordinates));
  } else if (feature.geometry.type === "MultiPolygon") {
    ({ lat, lng } = getCentroid(feature.geometry.coordinates[0]));
  }

  // Stats
  const stats = feature.properties.statistics;
  const diff = stats?.runs?.byActivity?.downhill?.byDifficulty ?? {};
  const totalRuns =
    (diff.novice?.count ?? 0) +
    (diff.easy?.count ?? 0) +
    (diff.intermediate?.count ?? 0) +
    (diff.advanced?.count ?? 0) +
    (diff.hard?.count ?? 0) +
    (diff.expert?.count ?? 0) +
    (diff.freeride?.count ?? 0) +
    (diff.other?.count ?? 0);

  const lifts = stats?.lifts?.byType
    ? Object.values(stats.lifts.byType).reduce((sum, l) => sum + l.count, 0)
    : 0;

  const place = feature.properties.places?.[0];

  output.push({
    name: resort.name,
    id: resort.id,
    pass: resort.pass,
    lat,
    lng,
    country: place?.iso3166_1Alpha2 ?? null,
    verticalDrop: Math.round(
      (stats?.maxElevation ?? 0) - (stats?.minElevation ?? 0),
    ),
    totalRuns,
    lifts,
    bounds:
      feature.geometry.type === "Polygon"
        ? feature.geometry.coordinates[0]
        : feature.geometry.type === "MultiPolygon"
          ? feature.geometry.coordinates[0][0]
          : null,
  });
}

// ---- Write ----
const outputPath = path.join(process.cwd(), "public/resorts-epic-ikon.json");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

console.log(`\n✅ Done!`);
console.log(`  Output:    public/complete-resorts-epic-ikon.json`);
console.log(`  Matched:   ${output.length - unmatched.length}`);
console.log(`  Unmatched: ${unmatched.length}`);

if (unmatched.length > 0) {
  console.log(`\n❌ Unmatched (no GeoJSON entry found):`);
  unmatched.forEach((n) => console.log(`   - ${n}`));
}
