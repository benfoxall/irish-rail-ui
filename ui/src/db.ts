import * as duckdb from "@duckdb/duckdb-wasm";
import duckdb_wasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";
import mvp_worker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import duckdb_wasm_eh from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import eh_worker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";

import dbUrl from "./assets/data.ddb?url";

const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
  mvp: {
    mainModule: duckdb_wasm,
    mainWorker: mvp_worker,
  },
  eh: {
    mainModule: duckdb_wasm_eh,
    mainWorker: eh_worker,
  },
};
// Select a bundle based on browser checks
const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
// Instantiate the asynchronus version of DuckDB-wasm
const worker = new Worker(bundle.mainWorker!);
const logger = new duckdb.ConsoleLogger();

// open stored data
export const db = new duckdb.AsyncDuckDB(logger, worker);

await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

await db.registerFileURL(
  "remote.duckdb",
  dbUrl,
  duckdb.DuckDBDataProtocol.HTTP,
  false
);

await db.open({
  path: "remote.duckdb",
});

// console.log("open?");

// // Create a new connection
const conn = await db.connect();

await conn.query("INSTALL spatial; LOAD spatial;");

// const result = await conn.query(`select ST_AsGeoJSON(point) as geo, "desc", code, from stations`);

// console.log(
//   "result",
//   result.toArray().map((row) => row.toJSON())
// );

// window.sss = result;

await conn.close();

export default db;
