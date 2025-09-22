import test, { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { parsePublicMessage } from './messageParser.js';


describe("parsing public message", () => {

    it("example depart", () => {

        const parsed = parsePublicMessage('A514\n13:15 - Dublin Heuston to Waterford (2 mins late)\nDeparted Athy next stop Carlow')

        assert.partialDeepStrictEqual(parsed, {
            train: 'A514',
            route: '13:15 - Dublin Heuston to Waterford',
            type: 'departed',
            station: 'Athy'
        })
    })


    it("handles pre departure", () => {

        const parsed = parsePublicMessage('E217\nHowth to Bray\nExpected Departure 09:52')

        assert.partialDeepStrictEqual(parsed, {
            train: 'E217',
            route: '09:52 - Howth to Bray',
            type: 'waiting',
            station: 'Howth'
        })

    })

    it('handles departure', () => {

        const parsed = parsePublicMessage('E217\n09:52 - Howth to Bray (1 mins late)\nDeparted Howth next stop Sutton')

        assert.partialDeepStrictEqual(parsed, {
            train: 'E217',
            route: '09:52 - Howth to Bray',
            type: 'departed',
            station: 'Howth',
        })

    })



    it('handles arrival', () => {

        const parsed = parsePublicMessage('E217\n09:52 - Howth to Bray (0 mins late)\nArrived Howth Junction next stop Kilbarrack')

        assert.partialDeepStrictEqual(parsed, {
            train: 'E217',
            route: '09:52 - Howth to Bray',
            type: 'arrived',
            station: 'Howth Junction',
        })

    })


    it("handles termination", () => {

        const parsed = parsePublicMessage('E217\n09:52 - Howth to Bray(0 mins late)\nTERMINATED Bray at 11:10')

        assert.partialDeepStrictEqual(parsed, {
            train: 'E217',
            route: '09:52 - Howth to Bray',
            type: 'terminated',
            station: 'Bray',
        })
    })


    describe("edge cases", () => {

        it("handles stations with multiple words", () => {

            const parsed = parsePublicMessage("A903\n06:40 - Sligo to Dublin Connolly(-1 mins late)\nTERMINATED Dublin Connolly at 09:38")

            assert.partialDeepStrictEqual(parsed, {
                train: 'A903',
                route: '06:40 - Sligo to Dublin Connolly',
                type: 'terminated',
                station: 'Dublin Connolly',
            })

        })

        it("handles termination at other stations", () => {

            const parsed = parsePublicMessage("A205\n07:00 - Cork to Dublin Heuston(6 mins late)\nTERMINATED Park West and Cherry Orchard at 09:38")

            assert.partialDeepStrictEqual(parsed, {
                train: 'A205',
                route: '07:00 - Cork to Dublin Heuston',
                type: 'terminated',
                station: 'Park West and Cherry Orchard',
            })
        })


    })

})

