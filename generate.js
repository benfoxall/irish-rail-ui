import { promisify } from 'node:util';
import child_process from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { stationParser, trainParser } from "./lib/xml.js";
import { parsePublicMessage } from './lib/messageParser.js'
import {
    ReadableStream,
    TransformStream,
} from 'node:stream/web';
import * as csv from '@fast-csv/format';

const exec = promisify(child_process.exec);



// format the stations as xml
const stationXML = await readFile('data/stations.xml')

const parsed = stationParser(stationXML)

const stationCsv = csv.format({ headers: true });

stationCsv.pipe(createWriteStream('tmp/stations.csv'))

for (const station of parsed) {
    stationCsv.write(station);
}

stationCsv.end()



// extract events from the currentTrains.xml history

const { stdout: historyTxt } = await exec('git -C data log --reverse --pretty=format:"%H %at" -- ./currentTrains.xml');

const history = historyTxt.split('\n').map(line => {
    const [commit, timestamp] = line.split(' ')

    return { commit, timestamp: parseInt(timestamp, 10) * 1000 }
})


const transform = new TransformStream({
    async transform(chunk, controller) {

        const { commit, timestamp } = chunk;

        const { stdout: contents } = await exec(`git -C data show ${commit}:./currentTrains.xml`);

        const trains = trainParser(contents)

        controller.enqueue({ trains, timestamp });
    },
});


const stream = ReadableStream.from(history).pipeThrough(transform)

const eventsCsv = csv.format({ headers: true });

eventsCsv.pipe(createWriteStream('tmp/events.csv'))

const prev = new Map();

for await (const { trains, timestamp } of stream) {

    for (const train of trains) {

        const { code, date, message } = train;

        const next = parsePublicMessage(message)

        const last = prev.get(code)

        if (!eq(last, next)) {
            // emit next
            eventsCsv.write({
                timestamp,
                date,
                ...next
            })
        }

        prev.set(code, next)
    }

}

// single-level equality
function eq(a = {}, b = {}) {
    const ak = Object.keys(a)
    const bk = Object.keys(b)
    if (ak.length !== bk.length) return false;

    return ak.every(k => a[k] === b[k])
}

