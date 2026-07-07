
import * as THREE from 'three';

import { CacheIntf } from './CacheIntf';
import * as oct from './UrlOctTree'
// import * as atwdns from './DnsTypes'
import { error } from 'console';
import * as utils from './utils';
// import { BatchFetchAndMergeControllerSlowest } from './BatchFetchAndMergeController';
// import { ThingsThatAlreadyExistType } from './UrlOctTree';
//import { BatchFetchAndMergeController } from './BatchFetchAndMergeController.tsXX';

import * as dnstypes from './DnsTypes'
import * as fetchAndMerge from './BatchFetchAndMergeController'



// // PrepareToReserveProperty will prepare a list of names to reserve. 
// // It does not actually do the reservation, and it will NOT check the cache and return the whole list.
// // The idea is that we can then batch those missing ones together and reserve them all at once, and then update the cache with the new ones.
// // it does not have to be swift. Doesn't happen during render, it can be a button click or something.
// export async function PrepareToReservePropertyBatch(startingProperties: string[], cache: Map<string, oct.TreeStatus>): Promise<[oct.ReserveResult, Error | null]> {

//     let result: oct.ReserveResult = {
//         startingProperties,
//         thingsThatAlreadyExist: [],
//         thingsToActuallyReserve: [],
//         rawChains: [],
//         cubeCache: cache,
//         error: null
//     }
//     for (const property of startingProperties) {
//         console.log(`Processing property ${property}`)
//         // do we check if this property exists and if we own it? 
//         // now? 
//         let rawChainCubes: oct.Cube[] = []
//         let [c, err] = oct.StringToCube(property)
//         if (err) {
//             console.error(`Error parsing property ${property}: ${err}`)
//             return [result, err]
//         }
//         // fill the raw chain
//         rawChainCubes.push(c) // the child
//         var [parent, i] = oct.GetParentCubeWithOcttreeIndex(c)
//         c = parent
//         while (c.p < 16) {
//             [parent, i] = oct.GetParentCubeWithOcttreeIndex(c)
//             rawChainCubes.push({ ...parent, whichParent: i })
//             c = parent
//         }
//         result.rawChains.push(rawChainCubes)
//         // let's take a look. Print the rawChainCubes
//         // a little verbose console.log(rawChainCubes)
//         // itarate through the rawChainCubes  
//         for (const cubeParent of rawChainCubes) {
//             const [name, err] = oct.CubeToString(cubeParent)
//             if (err) {
//                 console.error(`Error converting cube to URL string: ${err}`)
//                 continue
//             }
//         }
//     }
//     return [result, null]
// }


type twlmPart1ResponsePair = Promise<[PromiseSettledResult<dnstypes.DnsResponse[] | Error>, PromiseSettledResult<dnstypes.DnsResponse[] | Error>]>

// TwoWayLookupPart1 returns a pair of promises for the VR and XYZ lookups. It does not wait for them to complete, it just starts them and returns the promises.
export async function twoWayLookupPart1(rawChain: oct.Cube[], recordType: "A" | "TXT", prefix?: string): Promise<twlmPart1ResponsePair> {

    // for each name in a rawChain, check if it exists.
    const vrNames: string[] = []
    const zyzNames: string[] = []
    for (const cubeParent of rawChain) {
        const [name, err] = oct.CubeToString(cubeParent)
        if (err) {
            console.error(`Error converting cube to URL string: ${err}`)
            continue
        }
        let vrName = `${name}.vr`
        let xyzName = `${name}.xyz`
        if (prefix) {
            vrName = `${prefix}.${vrName}`
            xyzName = `${prefix}.${xyzName}`
        }
        vrNames.push(vrName)
        zyzNames.push(xyzName)
    }
    const vrCommaNames = vrNames.join(",")
    const zyzCommaNames = zyzNames.join(",")
    const howMany = vrNames.length

    const got = Promise.allSettled([
        dnstypes.FetchDnsResponseTryHard(vrCommaNames, recordType, "none-using-knotfree", true, howMany),
        dnstypes.FetchDnsResponseTryHard(zyzCommaNames, recordType, dnstypes.currentDnsServer, false, howMany)
    ])
    return got
}

// TwoWayLookupAndMerge will attempt to find the names as .xyz names
// then it will try to find them as .vr names, and then it will merge the results together.
// a rawChain is just a list of cubes from the leaf to the root. 
// We will check later if they exists when they should not.
// note that the TXT parts are not filled out.
export async function TwoWayLookupAndMergeOldAndBusted(rawChain: oct.Cube[]): Promise<[oct.TreeStatus[], Error | null]> {

    const results: oct.TreeStatus[] = []
    // call FetchDnsResponseTryHard twice in parallel, once with knotfreeNative true and once with knotfreeNative false, and then merge the results together.
    const p1result = await twoWayLookupPart1(rawChain, "A")

    let vrResult: dnstypes.DnsResponse[]
    let xyzResult: dnstypes.DnsResponse[]

    const vrResultSettledPrmise = await p1result[0]
    if (vrResultSettledPrmise.status === 'fulfilled') {
        const tmp = vrResultSettledPrmise.value
        if (tmp instanceof Error) {
            console.error(`Error fetching VR DNS response: ${tmp}`)
            return [results, tmp]
        }
        vrResult = tmp
        // console.log('VR Success for', vrResult);

    } else {
        console.log('VR Failed with reason:', vrResultSettledPrmise.reason);
        return [results, vrResultSettledPrmise.reason instanceof Error ? vrResultSettledPrmise.reason : new Error(String(vrResultSettledPrmise.reason))]
    }
    const xyzResultSettledPrmise = await p1result[1]
    if (xyzResultSettledPrmise.status === 'fulfilled') {
        const tmp = xyzResultSettledPrmise.value
        if (tmp instanceof Error) {
            console.error(`Error fetching XYZ DNS response: ${tmp}`)
            return [results, tmp]
        }
        xyzResult = tmp
        // console.log('XYZ Success for', xyzResult);

    } else {
        console.log('XYZ Failed with reason:', xyzResultSettledPrmise.reason);
        return [results, xyzResultSettledPrmise.reason instanceof Error ? xyzResultSettledPrmise.reason : new Error(String(xyzResultSettledPrmise.reason))]
    }
    if (vrResult.length !== rawChain.length || xyzResult.length !== rawChain.length) {
        const err = new Error(`Unexpected result length from FetchDnsResponseTryHard. Expected ${rawChain.length} but got ${vrResult.length} and ${xyzResult.length}`)
        console.error(err)
        return [results, err]
    }
    for (let i = 0; i < rawChain.length; i++) {
        const cube = rawChain[i]
        const [cubename, err] = oct.CubeToString(cube)
        if (err) {
            console.error(`Error converting cube to URL string: ${err}`)
            return [results, err]
        }
        const cubeVr: dnstypes.DnsResponse = vrResult[i]
        const cubeXyz: dnstypes.DnsResponse = xyzResult[i]
        // console.log(`VR DNS response for ${cubeVr.Question[0].name}:`, cubeVr)
        // console.log(`XYZ DNS response for ${cubeXyz.Question[0].name}:`, cubeXyz)

        // if ( cubename === "testmain-0n0u0e12p-0") {
        //     // we know this is in xyz but not vr, and it's a parent, so we can check if we are parsing it correctly.
        //     console.log(`Debug info for ${cubename}: cubeVr:`, cubeVr, `cubeXyz:`, cubeXyz)
        // }

        const status: oct.TreeStatus = {
            name: cubename,
            cube: cube,
            level: cube.p,
            //  index: -1,
            found: false,
            isParent: false,
            wasXYZ: false,
            childrenBits: -1,
            error: null
        }
        if (cubeVr.Status === dnstypes.DnsStatusCode.NOERROR && cubeXyz.Status === dnstypes.DnsStatusCode.NOERROR) {
            // we got them both. Cool.
            // which one is has an older creation date? 
            // TODO: get the creation date from the nameservice and use that to decide which one is older. 
            // Since someone spend some money on this, we will go with the .xyz for now. We can deal with them later if needed.
            status.found = true
            status.wasXYZ = true
        }
        else {
            if (cubeXyz.Status === dnstypes.DnsStatusCode.NOERROR) {
                status.found = true
                status.wasXYZ = true
            } else if (cubeVr.Status === dnstypes.DnsStatusCode.NOERROR) {
                status.found = true
                status.wasXYZ = false
            } else {
                status.found = false
            }
        }
        // they are never parents. How do we know if they are parents? Check for -N suffix. What a hack.
        // not doing that here.
        // if (status.found && !status.isParent && cubeVr.Answer) {
        if (status.found && cubeVr.Answer) {
            status.addresses = cubeVr.Answer.map(a => a.data || "").filter(d => d)
        }
        results.push(status)
    }
    return [results, null]
}

// this was to build a test.
export const allTheNames: string[] = []

// TwoWayLookupAndMerge will attempt to find the names as .xyz names
// then it will try to find them as .vr names, and then it will merge the results together.
// a rawChain is just a list of cubes from the leaf to the root. 
// We will check later if they exist when they should not.
// note that the TXT parts are not filled out.
//  This is the NEW HOTNESS version. Kinda. It's the new hotness slow version. But it's reliable.
// You can bounce the server right in the middle and it will still return a good result.
export async function TwoWayLookupAndMerge(rawChain: oct.Cube[]): Promise<[oct.TreeStatus[], Error | null]> {

    const doTheOldWay = true

    if (doTheOldWay) {

        // Time taken to BuildVisibleTreeStatus:  58950 ms for 1 run. or 58950 ms per run. 60 leaves. cold server
        // Time taken to BuildVisibleTreeStatus:  661 ms for 1 run. or 661 ms per run. 60 leaves. warm server. 
        // Time taken to BuildVisibleTreeStatus:  658 ms for 1 run. or 658 ms per run. warm. much better. 

        // there is a 64 limit on this on the server. We'll have to break it up into chunks of 32.
        // Break up the rawChain into an array of arrays of 32.
        const chunkSize = 32
        const chunks: oct.Cube[][] = []
        for (let i = 0; i < rawChain.length; i += chunkSize) {
            const chunk = rawChain.slice(i, i + chunkSize)
            chunks.push(chunk)
        }// cool. let's see them 
        // console.log(`TwoWayLookupAndMerge: rawChain length: ${rawChain.length}, chunked into ${chunks.length} chunks of up to ${chunkSize} each.`)
        const passCount = chunks.length
        // console.log(`TwoWayLookupAndMerge: passCount: ${passCount}`)
        // fun.
        const results: oct.TreeStatus[] = []

        for (let pass = 0; pass < passCount; pass++) {
            const chunk = chunks[pass]
            // console.log(`TwoWayLookupAndMerge: pass ${pass + 1} of ${passCount}, chunk length: ${chunk.length}`)
            const [result, err] = await TwoWayLookupAndMergeOldAndBusted(chunk)
            if (err) {
                console.error(`Error in TwoWayLookupAndMergeOldAndBusted: ${err}`)
                return [results, err]
            }
            // append the results into the final result.
            // we should have a treeStatus for each cube in the rawChain.
            if (result.length !== chunk.length) {
                const err = new Error(`Unexpected treeStatuses length from TwoWayLookupAndMergeOldAndBusted. Expected ${chunk.length} but got ${result.length}`)
                console.error(err)
                return [results, err]
            }
            results.push(...result)
        }
        if (results.length !== rawChain.length) {
            const err = new Error(`Unexpected final results length from TwoWayLookupAndMerge. Expected ${rawChain.length} but got ${results.length}`)
            console.error(err)
            return [results, err]
        }
        return [results, null]

    }  else {
        // this is  147976 ms per run to find 60 leaves in BuildVisibleTreeStatus. 2.5 minutes.  
        // This is the slowest version and it SUCKS much too much to use. Use as comparison only. Or never. 
        const frame = new fetchAndMerge.BatchFetchAndMergeControllerSlowest(rawChain, "A", "")
        // why does this not format? 
                        const [result, err] = await frame.TwoWayLookupAndMerge()
        if (err) {
            console.error(`Error in TwoWayLookupAndMerge: ${err}`)
            return [result, err]
        }
        return [result, null]
    }

    // log the names so we can write a test in go.
    // let commaList: string = "" //= rawChain.map(c => '"' + oct.CubeToString(c)[0] + '"').join(",")
    // for (const cubeParent of rawChain) {
    //     const [name, err] = oct.CubeToString(cubeParent)
    //     if (err) {
    //         console.error(`Error converting cube to URL string: ${err}`)
    //         return [[], err]
    //     }
    //     if (commaList.length > 0) { // skip the first one, we don't want a leading comma
    //         commaList += ","
    //     }
    //     commaList += '"' + name + '"'
    // }
    // const aname = "{" + commaList + "}"
    // allTheNames.push(aname  )

    //console.log("names for test in go: ", allTheNames)

    // these are supposed to return the EXACT same thing. Always. 
    // we should run them both and check that they do. If they don't then we have a problem.
    // const oldAndBusted = true
    // if (oldAndBusted) {
    //     return TwoWayLookupAndMergeOldAndBusted(rawChain)
    // }
}


// Copyright 2026 Alan Tracey Wootton
// See LICENSE
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.
