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

for await (const { timestamp, content, progress } of stream) {
  const trains = trainParser(content);

  for (const train of trains) {
    const { code, date, message } = train;

    const next = parsePublicMessage(message);

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
