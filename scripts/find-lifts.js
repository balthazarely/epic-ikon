// This script helps us search for lifts for each resorts, based on all the resorts present in our main json file

const fs = require("fs");
const path = require("path");

const liftsRaw = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "rawdata/lifts.geojson"), "utf-8"),
);

const myResorts = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "public/resorts-aus.json"), "utf-8"),
);

const output = myResorts.map((resort) => {
  const resortLifts = liftsRaw.features
    .filter((lift) =>
      lift.properties.skiAreas.some(
        (skiArea) => skiArea.properties.id === resort.id,
      ),
    )
    .map((lift) => ({
      name: lift.properties.name,
      type: lift.properties.liftType,
      capacity: lift.properties.capacity,
      duration: lift.properties.duration,
      status: lift.properties.status,
      coordinates: lift.geometry.coordinates,
    }));

  return {
    id: resort.id,
    name: resort.name,
    pass: resort.pass,
    lifts: resortLifts,
  };
});

const outputPath = path.join(
  process.cwd(),
  "data/austtrlaia-resort-lifts.json",
);
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`Written ${output.length} resorts to resort-lifts.json`);
