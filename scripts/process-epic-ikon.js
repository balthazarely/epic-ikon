const fs = require("fs");
const path = require("path");

// ---- Helpers ----
function getCoords(feature) {
  const geom = feature.geometry;
  if (!geom || !geom.coordinates) return null;

  if (geom.type === "Point") {
    return {
      lat: parseFloat(geom.coordinates[1].toFixed(4)),
      lng: parseFloat(geom.coordinates[0].toFixed(4)),
    };
  }
  if (geom.type === "Polygon") {
    const ring = geom.coordinates[0];
    return {
      lat: parseFloat(
        (ring.reduce((s, c) => s + c[1], 0) / ring.length).toFixed(4),
      ),
      lng: parseFloat(
        (ring.reduce((s, c) => s + c[0], 0) / ring.length).toFixed(4),
      ),
    };
  }
  if (geom.type === "MultiPolygon") {
    const ring = geom.coordinates[0][0];
    return {
      lat: parseFloat(
        (ring.reduce((s, c) => s + c[1], 0) / ring.length).toFixed(4),
      ),
      lng: parseFloat(
        (ring.reduce((s, c) => s + c[0], 0) / ring.length).toFixed(4),
      ),
    };
  }
  return null; // unsupported geometry type — skip
}

// ---- Load ----
console.log("⛷️  Loading files...");

const myResorts = JSON.parse(
  fs.readFileSync(
    path.join(process.cwd(), "rawdata/epic-ikon-resort-data.json"),
    "utf-8",
  ),
).filter((r) => r.country === "USA" || r.country === "Canada");

const raw = JSON.parse(
  fs.readFileSync(
    path.join(process.cwd(), "rawdata/ski-areas.geojson"),
    "utf-8",
  ),
);

console.log(`📦 My resorts: ${myResorts.length}`);
console.log(`📦 GeoJSON features: ${raw.features.length.toLocaleString()}`);

// ---- Build lookup map ----
const lookup = new Map();
for (const feature of raw.features) {
  const name = feature.properties?.name;
  if (name) {
    lookup.set(name.toLowerCase().trim(), feature);
  }
}

// ---- Match ----
const matched = [];
const unmatched = [];

for (const resort of myResorts) {
  const key = resort.name.toLowerCase().trim();

  // 1. Exact match
  let feature = lookup.get(key);
  let matchType = "exact";

  // 2. Fuzzy fallback
  if (!feature) {
    for (const [featureName, f] of lookup.entries()) {
      if (featureName.includes(key) || key.includes(featureName)) {
        feature = f;
        matchType = "fuzzy";
        break;
      }
    }
  }

  if (!feature) {
    unmatched.push(resort.name);
    matched.push({
      name: resort.name,
      id: "UNKNOWN ",
      pass: "UNKNOWN",
    });
    continue;
  }

  const coords = getCoords(feature);
  if (!coords) {
    console.warn(
      `⚠️  Skipping "${resort.name}" — unsupported geometry type: ${feature.geometry?.type}`,
    );
    unmatched.push(resort.name);
    continue;
  }

  const stats = feature.properties.statistics;

  const entry = {
    name: resort.name,
    id: feature.properties.id,
    pass: resort.pass,
  };

  matched.push(entry);
}

// ---- Write output ----
const outputPath = path.join(process.cwd(), "public/resorts-epic-ikon.json");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(matched, null, 2));

console.log(`\n✅ Done!`);
console.log(`  Matched:   ${matched.length}`);
console.log(`  Unmatched: ${unmatched.length}`);
console.log(`  Output:    public/resorts-epic-ikon.json`);

if (unmatched.length > 0) {
  console.log(`\n❌ Unmatched resorts:`);
  unmatched.forEach((n) => console.log(`   - ${n}`));
}

const fuzzy = matched.filter((r) => r._fuzzyMatchedTo);
if (fuzzy.length > 0) {
  console.log(`\n🔍 Fuzzy matches (please review):`);
  fuzzy.forEach((r) => console.log(`   "${r.name}" → "${r._fuzzyMatchedTo}"`));
}
