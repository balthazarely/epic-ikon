const fs = require("fs");
const path = require("path");
const { chain } = require("stream-chain");
const { parser } = require("stream-json");
const { pick } = require("stream-json/filters/Pick");
const { streamArray } = require("stream-json/streamers/StreamArray");

const myResorts = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "public/resorts-aus.json"), "utf-8"),
);

const resortIds = new Set(myResorts.map((r) => r.id));
const runsByResort = {};
myResorts.forEach((r) => (runsByResort[r.id] = []));

const pipeline = chain([
  fs.createReadStream(path.join(process.cwd(), "rawdata/runs.geojson")),
  parser(),
  pick({ filter: "features" }), // ← drill into the features array
  streamArray(),
]);

pipeline.on("data", ({ value: run }) => {
  if (!run.properties?.skiAreas) return;

  run.properties.skiAreas.forEach((skiArea) => {
    const id = skiArea.properties?.id;
    if (resortIds.has(id)) {
      runsByResort[id].push({
        name: run.properties.name,
        difficulty: run.properties.difficulty,
        status: run.properties.status,
        coordinates: run.geometry?.coordinates,
      });
    }
  });
});

pipeline.on("end", () => {
  const output = myResorts.map((resort) => ({
    id: resort.id,
    name: resort.name,
    pass: resort.pass,
    runs: runsByResort[resort.id],
  }));

  const outputPath = path.join(
    process.cwd(),
    "data/australia-resort-runs.json",
  );
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`Done — written to data/australia-resort-runs.json`);
});

pipeline.on("error", (err) => console.error(err));
