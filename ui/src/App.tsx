import { Suspense, use, useEffect, useState, type FC } from "react";
import * as arrow from "apache-arrow";
import { feature, featureCollection } from "@turf/turf";
import Map, { Layer, Source } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

const dbImport = import("./db").then((d) => d.default);

type Tr = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  {
    code: string;
  }
>;

function App() {
  const [trains, setTrains] = useState<Tr>();

  return (
    <>
      <h3>Trains!</h3>

      <Map
        initialViewState={{
          longitude: -6.2603,
          latitude: 53.3498,
          zoom: 10,
        }}
        style={{ position: "fixed", left: 0, top: 0, right: 0, bottom: 0 }}
        mapStyle="https://tiles.openfreemap.org/styles/positron"
      >
        <Suspense fallback={null}>
          <Stations />
        </Suspense>

        <Trains trains={trains} />
      </Map>
      <ControlPanel setTrains={setTrains} />
    </>
  );
}

const Stations: FC = () => {
  const db = use(dbImport);

  const [geo, setGeo] = useState<
    GeoJSON.FeatureCollection<
      GeoJSON.Point,
      {
        code: string;
        desc: string;
      }
    >
  >();

  useEffect(() => {
    async function run() {
      const conn = await db.connect();

      const result = await conn.query<{
        geo: arrow.Utf8;
        desc: arrow.Utf8;
        code: arrow.Utf8;
      }>(`select ST_AsGeoJSON(point) as geo, "desc", code, from stations`);

      const features: GeoJSON.Feature<
        GeoJSON.Point,
        {
          code: string;
          desc: string;
        }
      >[] = [];

      for (const batch of result.batches) {
        for (const row of batch) {
          const geometry = JSON.parse(row.geo);

          const f = feature(geometry as GeoJSON.Point, {
            code: row.code,
            desc: row.desc,
          });

          features.push(f);
        }
      }

      const collection = featureCollection(features);

      setGeo(collection);

      await conn.close();
    }

    run();
  }, [db]);

  if (geo) {
    return (
      <Source type="geojson" data={geo}>
        <Layer
          type="circle"
          paint={{
            "circle-radius": 3,
            "circle-opacity": 0.5,
            "circle-color": "#f0f",
          }}
        ></Layer>
      </Source>
    );
  }

  return null;
};

const Trains: FC<{ trains?: Tr }> = ({ trains }) => {
  if (trains) {
    return (
      <Source type="geojson" data={trains}>
        <Layer
          type="circle"
          paint={{
            "circle-radius": 3,
            "circle-opacity": 0.5,
            "circle-color": "#08f",
          }}
        ></Layer>
      </Source>
    );
  }

  return null;
};

type Setter = React.Dispatch<
  React.SetStateAction<
    | GeoJSON.FeatureCollection<
        GeoJSON.Point,
        {
          code: string;
        }
      >
    | undefined
  >
>;

function ControlPanel({ setTrains }: { setTrains: Setter }) {
  return (
    <div className="control-panel">
      <h3>Irish Rail</h3>
      <p>Stations and historical train locations.</p>
      <p>
        Data:{" "}
        <a href="https://api.irishrail.ie/realtime/">Irish Rail Realtime API</a>
      </p>

      <Suspense fallback={<p>Loading database</p>}>
        <TrainPicker setTrains={setTrains} />

        {/* <Stations /> */}
      </Suspense>

      <div key={"year"} className="input">
        {/* <input
          type="range"
          value={year}
          min={1995}
          max={2015}
          step={1}
          onChange={(evt) => props.onChange(evt.target.value)}
        /> */}
      </div>
    </div>
  );
}

function TrainPicker({ setTrains }: { setTrains: Setter }) {
  const rangeResults = useQuery<{
    min: arrow.DateMillisecond;
    max: arrow.DateMillisecond;
  }>(`select min("time") as min, max("time") as max from trains`);

  const range = rangeResults?.length
    ? [rangeResults[0].min, rangeResults[0].max]
    : null;

  const [value, setValue] = useState<number>();
  console.log(value);

  const trains = useQuery<{
    code: arrow.Utf8;
    geo: arrow.Utf8;
  }>(`
  SELECT
    code,
    ST_AsGeoJSON(point) as geo
  FROM
    trains
  WHERE
    "time" = (
      SELECT
        "time"
      FROM
        trains
      ORDER BY
        ABS(epoch_ms("time") - ${value || 1})
      LIMIT
        1
    );
`);

  // console.log({ trains });

  useEffect(() => {
    if (trains) {
      const collection = featureCollection(
        trains.map((t) => {
          return feature(JSON.parse(t.geo) as GeoJSON.Point, {
            code: t.code,
          });
        })
      );

      setTrains(collection);
    }

    // console.log(trains?.map((e) => e.toJSON())[0]);

    // setTrains()
  }, [trains, setTrains]);

  if (range) {
    const [min, max] = range;

    return (
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => setValue(e.target.valueAsNumber)}
      />
    );
  }

  return <></>;
}

function useQuery<
  T extends {
    [key: string]: arrow.DataType;
  }
>(query: string) {
  const db = use(dbImport);
  const [results, setResults] = useState<arrow.StructRowProxy<T>[]>();
  useEffect(() => {
    async function run() {
      const conn = await db.connect();

      const result = await conn.query<T>(query);

      console.log(query);

      const accum: arrow.StructRowProxy<T>[] = [];
      for (const batch of result.batches) {
        for (const row of batch) {
          accum.push(row);
        }
      }

      setResults(accum);

      await conn.close();
    }
    run();
  }, [db, query]);

  return results;
}

export default App;
