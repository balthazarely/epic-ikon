// This script helps us merge our json file with the massive geoJSON file to bring in values, based on ID

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
    path.join(process.cwd(), "public/resorts-epic-ikon.json"),
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
      region: resort.region ?? null,
      passType: resort.passType ?? null,
      status: null,
      website: null,
      maxElevation: null,
      minElevation: null,
      verticalDrop: null,
      totalRuns: null,
      totalTrailKm: null,
      snowmakingKm: null,
      runsByDifficulty: null,
      lifts: null,
      liftsByType: null,
      bounds: null,
      mapboxCamera: resort.mapboxCamera ?? null,
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
  const difficulties = [
    "novice",
    "easy",
    "intermediate",
    "advanced",
    "hard",
    "expert",
    "freeride",
    "other",
  ];

  const totalRuns = difficulties.reduce(
    (sum, d) => sum + (diff[d]?.count ?? 0),
    0,
  );

  const totalTrailKm = parseFloat(
    difficulties
      .reduce((sum, d) => sum + (diff[d]?.lengthInKm ?? 0), 0)
      .toFixed(2),
  );

  const snowmakingKm = parseFloat(
    difficulties
      .reduce((sum, d) => sum + (diff[d]?.snowmakingLengthInKm ?? 0), 0)
      .toFixed(2),
  );

  const runsByDifficulty = {};
  for (const d of difficulties) {
    if (diff[d]?.count) runsByDifficulty[d] = diff[d].count;
  }

  const liftsByType = {};
  if (stats?.lifts?.byType) {
    for (const [type, data] of Object.entries(stats.lifts.byType)) {
      if (data.count) liftsByType[type] = data.count;
    }
  }
  const lifts = Object.values(liftsByType).reduce((sum, c) => sum + c, 0);

  const place = feature.properties.places?.[0];

  output.push({
    name: resort.name,
    id: resort.id,
    pass: resort.pass,
    passType: resort.passType ?? null,
    status: feature.properties.status ?? null,
    website: feature.properties.websites?.[0] ?? null,
    lat,
    lng,
    country: place?.iso3166_1Alpha2 ?? null,
    region: resort.region ?? place?.localized?.en?.region ?? null,
    maxElevation: stats?.maxElevation ?? null,
    minElevation: stats?.minElevation ?? null,
    verticalDrop: Math.round(
      (stats?.maxElevation ?? 0) - (stats?.minElevation ?? 0),
    ),
    totalRuns,
    totalTrailKm,
    snowmakingKm,
    runsByDifficulty,
    lifts,
    liftsByType,
    mapboxCamera: resort.mapboxCamera ?? null,
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
