import {
  Suspense,
  use,
  useCallback,
  useEffect,
  useState,
  type FC,
} from "react";
import * as arrow from "apache-arrow";
import { feature, featureCollection } from "@turf/turf";
import Map, {
  Layer,
  Source,
  type MapLayerMouseEvent,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

const dbImport = import("./db").then((d) => d.default);

type Tr = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  {
    code: string;
  }
>;

function App() {
  const [hovered, setHovered] = useState<string[]>([]);

  const hover = useCallback((event: MapLayerMouseEvent) => {
    console.log(event.features?.map((f) => f.properties.name));

    const under = event.features?.map((f) => f.properties.name as string) || [];

    if (under.length == 0) return;

    setHovered((prev) => {
      if (prev.length != under.length) return under;
      if (prev.every((value, i) => value === under[i])) {
        return prev;
      }
      return under;
    });
  }, []);

  return (
    <>
      <Map
        initialViewState={{
          longitude: -6.2603,
          latitude: 53.3498,
          zoom: 10,
        }}
        style={{ position: "fixed", left: 0, top: 0, right: 0, bottom: 0 }}
        mapStyle="https://tiles.openfreemap.org/styles/positron"
        onMouseMove={hover}
        interactiveLayerIds={["stations"]}
      >
        <Suspense fallback={null}>
          <Stations hover={hovered} />
        </Suspense>

        {/* <Trains trains={trains} /> */}
      </Map>
      <ControlPanel hovered={hovered} />
    </>
  );
}

const Stations: FC<{ hover: string[] }> = ({ hover }) => {
  const db = use(dbImport);

  const [geo, setGeo] = useState<
    GeoJSON.FeatureCollection<
      GeoJSON.Point,
      {
        name: string;
        // desc: string;
      }
    >
  >();

  useEffect(() => {
    async function run() {
      const conn = await db.connect();

      const result = await conn.query<{
        station: arrow.Utf8;
        geo: arrow.Utf8;
      }>(`
        select distinct
          station,
          ST_AsGeoJSON(ST_Point(lon, lat)) as geo
        from
          events
        where
          lat != 0
          AND lon != 0  
        `);

      const features: GeoJSON.Feature<
        GeoJSON.Point,
        {
          name: string;
        }
      >[] = [];

      for (const batch of result.batches) {
        for (const row of batch) {
          const geometry = JSON.parse(row.geo);

          const f = feature(geometry as GeoJSON.Point, {
            name: row.station,
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

  const [connected, setConnected] = useState<string[]>([]);

  useEffect(() => {
    if (hover.length === 0) {
      setConnected([]);
      return;
    }

    async function run() {
      const conn = await db.connect();

      const result = await conn.query<{
        station: arrow.Utf8;
      }>(`
        with routes as (
          select distinct route from events
          where station = '${hover[0]}'
        )

        select distinct station from events
        join routes on events.route = routes.route
        `);

      const features: string[] = [];

      for (const batch of result.batches) {
        for (const row of batch) {
          features.push(row.station);
        }
      }

      setConnected(features);

      console.log(features);

      await conn.close();
    }

    run();
  }, [db, hover]);

  if (geo) {
    return (
      <Source type="geojson" data={geo}>
        <Layer
          id="stations"
          type="circle"
          paint={{
            "circle-radius": 12,
            "circle-opacity": 0.1,
            "circle-color": "#f0f",
          }}
        ></Layer>
        <Layer
          id="stations"
          type="circle"
          paint={{
            "circle-radius": 2,
            "circle-opacity": 0.8,
            "circle-color": "#f0f",
          }}
        ></Layer>
        <Layer
          id="station-hover"
          type="circle"
          paint={{
            "circle-radius": 12,
            "circle-opacity": 0.5,
            "circle-color": "#98f",
          }}
          filter={["in", ["get", "name"], ["literal", hover]]}
        ></Layer>

        <Layer
          id="station-connected"
          type="circle"
          paint={{
            "circle-radius": 4,
            "circle-opacity": 1,
            "circle-color": "#ff0",
          }}
          filter={["in", ["get", "name"], ["literal", connected]]}
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

function ControlPanel({ hovered }: { hovered: string[] }) {
  return (
    <div className="control-panel">
      <h3>Irish Rail</h3>
      <p>{hovered.join(" ")}</p>
      <p>
        source{" "}
        <a href="https://api.irishrail.ie/realtime/">Irish Rail Realtime API</a>
      </p>
    </div>
  );
}

function TrainPicker({ setTrains }: { setTrains: Setter }) {
  return null;

  const rangeResults = useQuery<{
    min: arrow.DateMillisecond;
    max: arrow.DateMillisecond;
  }>(`select min(timestamp) as min, max(timestamp) as max from events`);

  console.log(rangeResults);

  const range = rangeResults?.length
    ? [rangeResults[0].min, rangeResults[0].max]
    : null;

  const [value, setValue] = useState<number>();
  console.log(value);

  // const trains = null;

  const trains = useQuery<{
    code: arrow.Utf8;
    geo: arrow.Utf8;
  }>(`
    -- Load the spatial extension first!
-- INSTALL spatial;
-- LOAD spatial;

WITH
-- Step 1: Find the last event for RECENTLY ACTIVE trains.
last_event AS (
    SELECT
        e.train,
        e."timestamp" AS prev_ts,
        s.point AS prev_point
    FROM events AS e
    JOIN stations AS s ON e.station_id = s.id
    WHERE
        -- The event must be before our target time...
        e."timestamp" <= to_timestamp(1758537149295 / 1000)
        -- AND it must be within the last 30 minutes from our target time.
        AND e."timestamp" >= to_timestamp(1758537149295 / 1000) - INTERVAL '30' MINUTE -- ADDED FILTER
    QUALIFY ROW_NUMBER() OVER(PARTITION BY e.train ORDER BY e."timestamp" DESC) = 1
),

-- Step 2: Find the first event AFTER the target time (this logic remains the same).
next_event AS (
    SELECT
        e.train,
        e."timestamp" AS next_ts,
        s.point AS next_point
    FROM events AS e
    JOIN stations AS s ON e.station_id = s.id
    WHERE e."timestamp" > to_timestamp(1758537149295 / 1000)
    QUALIFY ROW_NUMBER() OVER(PARTITION BY e.train ORDER BY e."timestamp" ASC) = 1
)

-- Step 3: Join and calculate the interpolated position.
SELECT
    le.train,
    ST_AsGeoJSON(
    CASE
        -- If no 'next_event', train is at its last known location.
        WHEN ne.train IS NULL THEN le.prev_point

        -- Avoid division by zero if timestamps are the same.
        WHEN epoch_ms(ne.next_ts) <= epoch_ms(le.prev_ts) THEN le.prev_point

        -- Otherwise, the train is in transit. Interpolate its position.
        ELSE
            ST_Point(
                -- Interpolated X coordinate
                ST_X(le.prev_point) +
                (
                    -- Interpolation factor
                    (1758537149295 - epoch_ms(le.prev_ts)) /
                    CAST(epoch_ms(ne.next_ts) - epoch_ms(le.prev_ts) AS DOUBLE)

                ) * (ST_X(ne.next_point) - ST_X(le.prev_point)),

                -- Interpolated Y coordinate
                ST_Y(le.prev_point) +
                (
                    -- Interpolation factor (repeated)
                    (1758537149295 - epoch_ms(le.prev_ts)) /
                    CAST(epoch_ms(ne.next_ts) - epoch_ms(le.prev_ts) AS DOUBLE)

                ) * (ST_Y(ne.next_point) - ST_Y(le.prev_point))
            )
    END) AS current_location
FROM last_event AS le
LEFT JOIN next_event AS ne ON le.train = ne.train;
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
