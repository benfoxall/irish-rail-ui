import fs from "node:fs";
import { log, readBlob, type ReadCommitResult } from "isomorphic-git";
import { ReadableStream, TransformStream } from "node:stream/web";

const dir = process.cwd();

const gitProps = {
  fs,
  dir,
  gitdir: `${dir}/.git/modules/data`,
};

const depth = 100000;

/** stream the versions of the currentTrains.xml file */
export async function createHistoryStream() {
  const history = await log({
    ...gitProps,
    filepath: "currentTrains.xml",
    depth,
  });

  const stream = ReadableStream.from(history);

  let i = 0;

  const transform = new TransformStream<
    ReadCommitResult,
    { content: string; timestamp: number; progress: number }
  >({
    async transform(chunk, controller) {
      const timestamp = chunk.commit.author.timestamp;
      const blob = await readBlob({
        ...gitProps,
        oid: chunk.oid,
        filepath: "currentTrains.xml",
      });

      const content = Buffer.from(blob.blob).toString("utf8");

      const progress = i++ / history.length;

      controller.enqueue({
        timestamp,
        content,
        progress,
      });
    },
  });

  return stream.pipeThrough(transform);
}
