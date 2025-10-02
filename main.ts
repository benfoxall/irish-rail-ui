import * as csv from "@fast-csv/format";
import { createWriteStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { createHistoryStream } from "./lib/history.ts";
import { parsePublicMessage } from "./lib/messageParser.ts";
import { stationParser, trainParser } from "./lib/xml.ts";
import yoctoSpinner from "yocto-spinner";

// const stationsSpinner = yoctoSpinner({ text: "stations" }).start();

// // format the stations as xml
// const stationXML = await readFile("data/stations.xml");

// const stations = stationParser(stationXML.toString());

// const stationCsv = csv.format({ headers: true });

// stationCsv.pipe(createWriteStream("tmp/stations.csv"));

// for (const station of stations) {
//   stationCsv.write(station);
// }

// stationCsv.end();

// stationsSpinner.success();

/// extract train events by scanning file history

const eventsSpinner = yoctoSpinner({ text: "events" }).start();

const stream = await createHistoryStream();

const eventsCsv = csv.format({ headers: true });

eventsCsv.pipe(createWriteStream("tmp/events.csv"));

// const eventsFullCsv = csv.format({ headers: true });

// eventsFullCsv.pipe(createWriteStream("tmp/events-full.csv"));

const prev = new Map<string, string>();

console.time("process");

for await (const { timestamp, content, progress } of stream) {
  try {
    const trains = trainParser(content);

    for (const train of trains) {
      const { code, date, message } = train;

      // deduplicate messages
      if (prev.get(code) === message) continue;
      prev.set(code, message);

      const parsed = parsePublicMessage(message);

      // if (stationMap[next.station]) next.station = stationMap[next.station];

      // if (ignoredStations.includes(next.station)) continue;

      // const match = stations.find((s) => s.desc === next.station);
      // if (!match) {
      //   console.log("no station match for: ", next);
      //   console.log("source:", train);
      //   console.log("message:", JSON.stringify(train.message));

      //   // process.exit();
      // }

      eventsCsv.write({
        timestamp,
        date,
        lat: parseFloat(train.lat),
        lon: parseFloat(train.lon),
        ...parsed,
      });
    }

    eventsSpinner.text = (progress * 100).toFixed(2) + "%";
  } catch (e) {
    console.error("failed to extract", e);
    // console.log("content: " + content);
  }
}

console.timeEnd("process");

eventsSpinner.text = "events";
eventsSpinner.success();

// single-level equality
function eq(a = {}, b = {}) {
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;

  return ak.every((k) => a[k] === b[k]);
}
