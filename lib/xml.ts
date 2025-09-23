import sax from "sax";

// extract a single array of objects from an xml string
function createParser<T extends Record<string, string>>(
  tagElement: string,
  tagMap: T
) {
  return function (xmlstr: string): Record<T[keyof T], string | undefined>[] {
    const items = [];
    let current = {};

    const parser = sax.parser(true);

    parser.onopentag = (t) => {
      if (t.name === tagElement) current = {};
    };
    parser.onclosetag = (t) => {
      if (t === tagElement) items.push(current);
    };

    parser.ontext = (t) => {
      const { name } = parser.tag;
      if (tagMap[name]) current[tagMap[name]] = t.trim().replace(/\\n/g, "\n");
    };

    parser.write(xmlstr).close();

    return items;
  };
}

export const stationParser = createParser("objStation", {
  StationDesc: "desc",
  StationAlias: "alias",
  StationLatitude: "lat",
  StationLongitude: "lon",
  StationCode: "code",
  StationId: "id",
} as const);

export const trainParser = createParser("objTrainPositions", {
  TrainStatus: "status",
  TrainLatitude: "lat",
  TrainLongitude: "lon",
  TrainCode: "code",
  TrainDate: "date",
  PublicMessage: "message",
  Direction: "direction",
});
