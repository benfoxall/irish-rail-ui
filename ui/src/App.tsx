import { Suspense, use, useEffect, useState } from "react";

const dbImport = import("./db").then((d) => d.default);

function App() {
  return (
    <>
      <h3>Trains!</h3>
      <Suspense fallback="Waiting for db">
        <Foobar />
      </Suspense>
    </>
  );
}

import * as arrow from "apache-arrow";

const Foobar = () => {
  const db = use(dbImport);

  const [items, setItems] = useState<
    { geo: string; desc: string; code: string }[]
  >([]);

  useEffect(() => {
    async function run() {
      const conn = await db.connect();

      const result = await conn.query<{
        geo: arrow.Utf8;
        desc: arrow.Utf8;
        code: arrow.Utf8;
      }>(`select ST_AsGeoJSON(point) as geo, "desc", code, from stations`);

      setItems([]);
      for (const batch of result.batches) {
        for (const row of batch) {
          setItems((p) => [row.toJSON(), ...p]);
        }
      }

      await conn.close();
    }

    run();
  }, [db]);

  return (
    <div>
      stations:
      {items.map((item) => (
        <div key={item.code + item.desc}>
          {item.code} {item.desc}
        </div>
      ))}
    </div>
  );
};

export default App;
