// Adds the `region` field to each resort in resorts-epic-ikon.json
// by matching IDs against the raw ski-areas.geojson file.

const fs = require("fs");
const path = require("path");

// ---- Load ----
const resorts = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "public/resorts-epic-ikon.json"), "utf-8"),
);

const raw = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "rawdata/ski-areas.geojson"), "utf-8"),
);

console.log(`📦 Resorts: ${resorts.length}`);
console.log(`📦 GeoJSON features: ${raw.features.length.toLocaleString()}`);

// ---- Build ID lookup ----
const lookup = new Map();
for (const feature of raw.features) {
  const id = feature.properties?.id?.trim();
  if (id) lookup.set(id, feature);
}

// ---- Enrich ----
let matched = 0;
let unmatched = 0;

const output = resorts.map((resort) => {
  const feature = lookup.get(resort.id?.trim());
  if (!feature) {
    unmatched++;
    return { ...resort, region: null };
  }

  const region = feature.properties?.places?.[0]?.localized?.en?.region ?? null;
  matched++;
  return { ...resort, region };
});

// ---- Write ----
const outputPath = path.join(process.cwd(), "public/resorts-epic-ikon.json");
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

console.log(`\n✅ Done!`);
console.log(`  Matched:   ${matched}`);
console.log(`  Unmatched: ${unmatched}`);

if (unmatched > 0) {
  const names = resorts
    .filter((r) => !lookup.has(r.id?.trim()))
    .map((r) => r.name);
  names.forEach((n) => console.log(`   - ${n}`));
}
