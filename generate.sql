INSTALL spatial;

LOAD spatial;

CREATE TABLE
    trainsRaw AS
select
    *
from
    'tmp/trains/*.csv';

CREATE TABLE
    stationsRaw AS
select
    *
from
    'tmp/stations.csv';

CREATE TABLE
    trains AS
SELECT
    to_timestamp ("Time") AS time,
    TrainCode as code,
    TrainStatus as status,
    PublicMessage as message,
    Direction as direction,
    ST_Point (TrainLongitude, TrainLatitude) AS point
FROM
    trainsRaw;

CREATE TABLE
    stations AS
SELECT
    StationId as id,
    StationCode as code,
    StationDesc as desc,
    StationAlias as alias,
    ST_Point (StationLongitude, StationLatitude) AS point
FROM
    stationsRaw;

DROP TABLE trainsRaw;

DROP TABLE stationsRaw;
