import { Suspense, use, useEffect, useState, type FC } from "react";
import * as arrow from "apache-arrow";
import { feature, featureCollection } from "@turf/turf";
import Map, { Layer, Source } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

const dbImport = import("./db").then((d) => d.default);

function App() {
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
      </Map>
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

  console.log(geo);

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

          // }
          // setItems((p) => [row.toJSON(), ...p]);
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
        <Layer type="circle"></Layer>
      </Source>
    );
  }

  return null;
};

export default App;
