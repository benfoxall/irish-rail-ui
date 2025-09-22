import sax from 'sax'

// extract a single array of objects from an xml string
function createParser(tagElement, tagMap) {
    return function (xmlstr) {

        const items = []
        let current = {}

        const parser = sax.parser(true)

        parser.onopentag = t => {
            if (t.name === tagElement)
                current = {}
        }
        parser.onclosetag = t => {
            if (t === tagElement)
                items.push(current)
        }

        parser.ontext = (t) => {
            const { name } = parser.tag;
            if (tagMap.has(name))
                current[tagMap.get(name)] = t.trim().replace(/\\n/g, '\n')
        }

        parser.write(xmlstr).close()

        return items;
    }
}

export const stationParser = createParser('objStation', new Map([
    ['StationDesc', 'desc'],
    ['StationAlias', 'alias'],
    ['StationLatitude', 'lat'],
    ['StationLongitude', 'lon'],
    ['StationCode', 'code'],
    ['StationId', 'id'],
]))

export const trainParser = createParser('objTrainPositions', new Map([
    ['TrainStatus', 'status'],
    ['TrainLatitude', 'lat'],
    ['TrainLongitude', 'lon'],
    ['TrainCode', 'code'],
    ['TrainDate', 'date'],
    ['PublicMessage', 'message'],
    ['Direction', 'direction'],
]))

