INSTALL spatial;

LOAD spatial;

CREATE TABLE
    stationsRaw AS
select
    *
from
    'tmp/stations.csv';

CREATE TABLE
    eventsRaw AS
select
    *
from
    'tmp/events.csv';

-- generate stations 
-- DROP TABLE if exists stations;
CREATE TABLE
    stations (
        id INTEGER PRIMARY KEY,
        code VARCHAR,
        "desc" VARCHAR,
        alias VARCHAR,
        point POINT_2D
    );

INSERT INTO
    stations
SELECT
    id,
    code,
    stationsRaw.desc,
    stationsRaw.alias,
    ST_Point (lon, lat) AS point
FROM
    stationsRaw;

-- drop table if exists events;
CREATE TABLE
    events (
        "timestamp" TIMESTAMP,
        train VARCHAR,
        type VARCHAR,
        station_id INTEGER,
        date VARCHAR,
        route VARCHAR,
        CONSTRAINT fk_events_station_id FOREIGN KEY (station_id) REFERENCES stations (id)
    );

INSERT INTO
    events
SELECT
    to_timestamp ("timestamp" / 1000) as timestamp,
    train,
    type,
    stations.id AS station_id,
    date,
    route
FROM
    eventsRaw
    JOIN stations ON stations.desc = eventsRaw.station;

DROP TABLE stationsRaw;

DROP TABLE eventsRaw;

CHECKPOINT;
