import * as csv from "@fast-csv/format";
import { createWriteStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { createHistoryStream } from "./lib/history.ts";
import { parsePublicMessage } from "./lib/messageParser.ts";
import { stationParser, trainParser } from "./lib/xml.ts";
import yoctoSpinner from "yocto-spinner";

const stationsSpinner = yoctoSpinner({ text: "stations" }).start();

// format the stations as xml
const stationXML = await readFile("data/stations.xml");

const stations = stationParser(stationXML.toString());

const stationCsv = csv.format({ headers: true });

stationCsv.pipe(createWriteStream("tmp/stations.csv"));

for (const station of stations) {
  stationCsv.write(station);
}

stationCsv.end();

stationsSpinner.success();

/// extract train events by scanning file history

const eventsSpinner = yoctoSpinner({ text: "events" }).start();

console.time("events");

const stream = await createHistoryStream();

const eventsCsv = csv.format({ headers: true });

eventsCsv.pipe(createWriteStream("tmp/events.csv"));

const prev = new Map();

const ignoredStations = [
  "LJ458",
  "LJ461",
  "TS465",
  "PL101",
  "PL102",
  "PL103",
  "PL104",
  "LJ896",
  "LJ895",
  "GL368",
  "MW858",
  "Killucan",
  "Mosney",
  "Inchicore Advance Starter",
  "Cherryville Junction",
  "Lisduff",
  "Geashill",
  "North Strand Junction",
  "Clonydonnin",
  "Killonan",
  "Carrick On Shannon Loop",
  "Lavistown",
  "Lavistown North",
  "Lavistown South",
];
const stationMap = {
  "Killarney Junction": "Killarney",
  "Athlone Midland Yard": "Athlone",
  "Limerick Junction Loop": "Limerick Junction",
};

for await (const { timestamp, content, progress } of stream) {
  const trains = trainParser(content);

  for (const train of trains) {
    const { code, date, message } = train;

    const next = parsePublicMessage(message);

    if (stationMap[next.station]) next.station = stationMap[next.station];

    if (ignoredStations.includes(next.station)) continue;

    const match = stations.find((s) => s.desc === next.station);
    if (!match) {
      console.log("no station match for: ", next);
      console.log("source:", train);
      console.log("message:", JSON.stringify(train.message));

      process.exit();
    }

    const last = prev.get(code);

    if (!eq(last, next)) {
      // emit next
      eventsCsv.write({
        timestamp,
        date,
        ...next,
      });
    }

    prev.set(code, next);

    eventsSpinner.text = (progress * 100).toFixed(2) + "%";
  }
}

eventsSpinner.text = "events";
eventsSpinner.success();

// single-level equality
function eq(a = {}, b = {}) {
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;

  return ak.every((k) => a[k] === b[k]);
}
