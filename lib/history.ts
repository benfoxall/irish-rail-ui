import child_process from "node:child_process";
import { ReadableStream, TransformStream } from "node:stream/web";
import { promisify } from "node:util";

const exec = promisify(child_process.exec);

/** stream the versions of the currentTrains.xml file */
export async function createHistoryStream() {
  const { stdout: historyTxt } = await exec(
    'git -C data log --reverse --pretty=format:"%H %at" -- ./currentTrains.xml'
  );

  const history = historyTxt.split("\n").map((line) => {
    const [commit, timestamp] = line.split(" ");

    return { timestamp: parseInt(timestamp, 10) * 1000, commit };
  });

  const stream = ReadableStream.from(history);

  let i = 0;

  const transform = new TransformStream<
    { commit: string; timestamp: number },
    { content: string; timestamp: number; progress: number }
  >({
    async transform(chunk, controller) {
      const { commit, timestamp } = chunk;

      const { stdout: content } = await exec(
        `git -C data show ${commit}:./currentTrains.xml`
      );

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
