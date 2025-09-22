import { it, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { stationParser, trainParser } from './xml.js';


describe('parsing stations', () => {
    it('parses', () => {

        const stations = stationParser(`
<?xml version="1.0" encoding="utf-8"?>
<ArrayOfObjStation xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns="http://api.irishrail.ie/realtime/">
  <objStation>
    <StationDesc>Belfast</StationDesc>
    <StationAlias />
    <StationLatitude>54.6123</StationLatitude>
    <StationLongitude>-5.91744</StationLongitude>
    <StationCode>BFSTC</StationCode>
    <StationId>228</StationId>
  </objStation>
  <objStation>
    <StationDesc>Lisburn</StationDesc>
    <StationAlias />
    <StationLatitude>54.514</StationLatitude>
    <StationLongitude>-6.04327</StationLongitude>
    <StationCode>LBURN</StationCode>
    <StationId>238</StationId>
  </objStation>
</ArrayOfObjStation>`)


        assert.deepStrictEqual(stations,

            [
                {
                    alias: '',
                    code: 'BFSTC',
                    desc: 'Belfast',
                    id: '228',
                    lat: '54.6123',
                    lon: '-5.91744'
                },
                {
                    alias: '',
                    code: 'LBURN',
                    desc: 'Lisburn',
                    id: '238',
                    lat: '54.514',
                    lon: '-6.04327'
                }
            ]

        );
    });


})



describe('parsing trains', () => {
    it('parses', () => {

        const trains = trainParser(`<?xml version="1.0" encoding="utf-8"?>
<ArrayOfObjTrainPositions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns="http://api.irishrail.ie/realtime/">
  <objTrainPositions>
    <TrainStatus>N</TrainStatus>
    <TrainLatitude>51.8491</TrainLatitude>
    <TrainLongitude>-8.29956</TrainLongitude>
    <TrainCode>P522</TrainCode>
    <TrainDate>19 Sep 2025</TrainDate>
    <PublicMessage>P522\nCobh to Cork\nExpected Departure 15:00</PublicMessage>
    <Direction>To Cork</Direction>
  </objTrainPositions>
  <objTrainPositions>
    <TrainStatus>N</TrainStatus>
    <TrainLatitude>51.9018</TrainLatitude>
    <TrainLongitude>-8.4582</TrainLongitude>
    <TrainCode>D524</TrainCode>
    <TrainDate>19 Sep 2025</TrainDate>
    <PublicMessage>D524\nCork to Cobh\nExpected Departure 15:00</PublicMessage>
    <Direction>To Cobh</Direction>
  </objTrainPositions>
</ArrayOfObjTrainPositions>`)


        assert.deepStrictEqual(trains,

            [
                {
                    code: 'P522',
                    date: '19 Sep 2025',
                    direction: 'To Cork',
                    lat: '51.8491',
                    lon: '-8.29956',
                    message: 'P522\nCobh to Cork\nExpected Departure 15:00',
                    status: 'N'
                },
                {
                    code: 'D524',
                    date: '19 Sep 2025',
                    direction: 'To Cobh',
                    lat: '51.9018',
                    lon: '-8.4582',
                    message: 'D524\nCork to Cobh\nExpected Departure 15:00',
                    status: 'N'
                }
            ]

        );
    });


})

