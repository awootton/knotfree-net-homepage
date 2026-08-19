
import * as oct from './Dns8Tree'
import * as atwdns from './DnsTypes'
import { error } from 'console';
import * as utils from './utils';



type fetchTracker = {
    name: string,
    cube: oct.Cube,
    index: number,
    isXYZ: boolean,
    hadProblem: boolean
}

// It's too slow for a complicated tree. TODO: make a better batch mode one later. 
// I already wasted a day on this. 
// I just need something that always works so I can get other things done. I don't care if it's slow. 
// I just need to get the right answer. Agile rules. I can use it to compare with the fancy version later.
// BatchFetchAndMergeController is a wrapper for all the other fetches we'll be running.
// The main thing is we want to re-run some of them, however that works. 
// we're checking the cache before we get here.
// We compare the .vr and .xyz results. And pick the best one. If either one is a 2, we have to do it again.
// The results will be made into a TreeStatus.
export class BatchFetchAndMergeControllerSlowest {

    cubes: oct.Cube[]
    fetchTrackers: fetchTracker[]    // we do one .vr and one .xyz for each cube.
    promises: Promise<Response>[]   // we do one .vr and one .xyz for each cube.
    type: "TXT" | "A"
    prefix: string
    // I heard this is how the cool kids do it. 
    signal: AbortSignal
    controller: AbortController

    dnsResponses: atwdns.DnsResponse[]   // we do one .vr and one .xyz for each cube.
    theDamnAnswers: oct.TreeStatus[]   // we do one .vr and one .xyz for each cube.

    problemChildren = new Map<fetchTracker, number>() // this is the set of cube names that had problems. We want to retry these.

    constructor(cubes: oct.Cube[], type: "TXT" | "A", prefix: string) {
        this.cubes = cubes
        this.type = type
        this.prefix = prefix
        this.fetchTrackers = new Array(this.cubes.length * 2) // we do one .vr and one .xyz for each cube.
        this.promises = new Array(this.cubes.length * 2) // we do one .vr and one .xyz for each cube.
        this.dnsResponses = new Array(this.cubes.length * 2) // we do one .vr and one .xyz for each cube.

        this.controller = new AbortController();
        this.signal = this.controller.signal;

        this.theDamnAnswers = new Array(this.cubes.length) // we do one .vr and one .xyz for each cube.
    }

    // let's stick them all into little objects.
    // save them up

    // The goal is to NEVER return an error unless we have tried, relentlessly, for at least 30 seconds.
    // I hate it but I've seen horrors. People return a 2 when really mean to say 0 or 3
    async TwoWayLookupAndMerge(): Promise<[oct.TreeStatus[], Error | null]> {

        // console.log("TwoWayLookupAndMerge: Starting with cubes: ", this.cubes.map(c => oct.CubeToString(c)[0]).join(","))

        // let's try them one at a time, the slowest possible way. We can do them in parallel later.  
        // every other one is an .xyz. We don't need the trackers.
        // We DO care about the order. Later we process them in pairs to form the result TreeStatus.
        for (let i = 0; i < this.cubes.length * 2; i++) {

            const cube = this.cubes[Math.floor(i / 2)]
            const [name, err] = oct.CubeToString(cube)
            if (err) {
                console.error("TwoWayLookupAndMerge: Error converting cube to string: ", err)
                return [[], err]
            }
            let fetchTracker1: fetchTracker = {
                name: name,
                cube: cube,
                index: i,
                isXYZ: false, // (i && 1 !== 0 ) lol.
                hadProblem: false
            }
            if ((i & 1) !== 0) {
                fetchTracker1.isXYZ = true
            }
            this.fetchTrackers[i] = fetchTracker1 // why?
            const aPromise = this.FetchOneDnsResponse(name, fetchTracker1.isXYZ === false) // is knotfree 
            const result = await this.fetchThisBadBoy(aPromise, fetchTracker1)
            // console.log("TwoWayLookupAndMerge: fetchThisBadBoy result: ", result)
            // what we want is a atwdns.DnsResponse
            const resp: atwdns.DnsResponse = result // {} as atwdns.DnsResponse
            // ok? 
            this.dnsResponses[i] = resp
        }

        // console.log("TwoWayLookupAndMerge: Finished fetching all cubes. Now handling the results.", this.dnsResponses)
        // all the async stuff is done. Isn't it? 

        // handlePairOfResponses
        for (let i = 0; i < this.cubes.length; i++) {
            const cube = this.cubes[i]
            const dnsResponseVr = this.dnsResponses[i * 2]
            const dnsResponseXyz = this.dnsResponses[i * 2 + 1]
            this.theDamnAnswers[i] = this.handlePairOfResponses(dnsResponseVr, dnsResponseXyz, cube)
        }

        return [this.theDamnAnswers, null]
    }

    // the odd ones:
    //             const fetchTracker2: fetchTracker = {
    //                 cube: cube,
    //                 index: i,
    //                 isXYZ: true,
    //                 hadProblem: false
    //             }
    //             this.fetchTrackers[i * 2 + 1] = fetchTracker2
    //             this.promises[i * 2 + 1] = this.FetchOneDnsResponse(name, false) // is xyz


    // recurse up to N times.

    reallyBAdREsult: atwdns.DnsResponse = {
        Status: atwdns.DnsStatusCode.SERVFAIL,
        TC: false,
        RD: false,
        RA: false,
        AD: false,
        CD: false,
        Answer: [],
        Authority: [],
        Question: []
    }

    async fetchThisBadBoy(p: Promise<Response>, fetchTracker: fetchTracker, depth: number = 0): Promise<atwdns.DnsResponse> {

        if (depth > 5) {
            console.error("fetchThisBadBoy: Too many retries for cube: ", fetchTracker.name, " isXYZ: ", fetchTracker.isXYZ)
            return this.reallyBAdREsult // give up.
        }
        let areWeOk = true
        let status = 0
        let statusText = ""
        try {
            // did it screw up? 
            const q = await p
            status = q.status
            statusText = q.statusText
            if (q.ok && q.status === 200) {
                const jsonPromise = q.json()
                const json = await jsonPromise
                const dnsResponse: atwdns.DnsResponse = json as atwdns.DnsResponse
                // ok? 
                if (dnsResponse === undefined || dnsResponse === null) {
                    console.error("fetchThisBadBoy: dnsResponse is null or undefined for cube: ", fetchTracker.name, " isXYZ: ", fetchTracker.isXYZ)
                    areWeOk = false // recurse
                } else {
                    if (dnsResponse.Status !== atwdns.DnsStatusCode.NOERROR && dnsResponse.Status !== atwdns.DnsStatusCode.NXDOMAIN) {
                        console.error("fetchThisBadBoy: dnsResponse has unexpected status for cube: ", fetchTracker.name, " isXYZ: ", fetchTracker.isXYZ, " status: ", dnsResponse.Status)
                        areWeOk = false // recurse, try again. It's knotfree screwing up. It always is. 
                    } else {
                        return json
                    }
                }
            } else {
                console.error("fetchThisBadBoy failed with status: ", q.status, q.statusText)
                const json = await q.json()
                console.log("fetchThisBadBoy fail result json: ", json)
                areWeOk = false
            }
        } catch (error) {
            // do we HAVE to see this?
            // console.error("fetchThisBadBoy: Exception caught for cube: ", fetchTracker.name, " isXYZ: ", fetchTracker.isXYZ, " error: ", error)
            areWeOk = false
        }

        if (!areWeOk) {
            // it's not failed YET
            // fetchTracker.hadProblem = true
            // recurse up to N times.
            await new Promise(resolve => setTimeout(resolve, 100)); // wait .1 whole second before retrying. Still tooo slow.
            // interesting but is ugly in long running tests.
            console.error("fetchThisBadBoy Recursing: ", fetchTracker.name, " isXYZ: ", fetchTracker.isXYZ, " status: ", status, " statusText: ", statusText, " depth: ", depth)
            const aPromise = this.FetchOneDnsResponse(fetchTracker.name, fetchTracker.isXYZ === false) // is knotfree 
            return this.fetchThisBadBoy(aPromise, fetchTracker, depth + 1)
        }
        // what do we return here? we have to return a Response.
        return this.reallyBAdREsult
    }


    // FetchOneDnsResponse set up the promise. Just one.  We work from the botom up.
    // this used to work. See examples below.
    async FetchOneDnsResponse(name: string, knotfreeNative: boolean): Promise<Response> {

        const server = atwdns.knotfreeServer // localhost:  or knotfree.dog:  or knotfree.net (secure) or knotfree.io (http)

        // eg  url = "https://knotfree.net/api1/dns-query?name=meta_group_id.testmain-0n0u0e16p-0.vr&type=TXT&knotfree=1"&dnsServer="1.1.1.1"
        if (this.prefix) {
            name = `${this.prefix}.${name}`
        }
        if (knotfreeNative) { // like the one place where this is is allowed.
            name = `${name}.vr`
        } else {
            name = `${name}.xyz`
        }
        let url = `${server}/api1/dns-query?name=${name}&type=${this.type}&dnsServer=${atwdns.currentDnsServer}`
        if (knotfreeNative) {
            url += `&knotfree=1`
        }
        // console.log("FetchOneDnsResponse url is", url)
        const responsePromise = fetch(url, { signal: this.signal });
        // should we just wait for the text now?
        // no, catch problems here and then we can do the parsing in the caller and catch problems there too.
        return responsePromise
    }

    // you're good too.
    handlePairOfResponses(dnsResponseVr: atwdns.DnsResponse, dnsResponseXyz: atwdns.DnsResponse, cube: oct.Cube): oct.TreeStatus {
        // this is where we compare the .vr and .xyz responses and decide what the TreeStatus is. 
        // This is a simplification for this example. In reality, you would need to parse the responses according to your specific format and logic.
        // const cubeName = oct.CubeToString(cube)[0]
        // if ( cubeName.includes("0n0u1w16p") ) {
        //      // 0n0u1w16p debug me.
        //     console.log("handlePairOfResponses: Found cube 0n0u1w16p. dnsResponseVr: ", dnsResponseVr, " dnsResponseXyz: ", dnsResponseXyz)
        // }
        if (!dnsResponseVr || !dnsResponseXyz) {
            console.error("handlePairOfResponses: One of the DNS responses is null or undefined.")
            // we should not be getting ANY undefined in here.
            // FIXME: can't return this.
            return {
                name: oct.CubeToString(cube)[0],
                found: false,
                cube: cube,
                level: cube.p,
                isParent: false,
                wasXYZ: false,
                childrenBits: -1,
                error: new Error("One of the DNS responses is null or undefined.")
            }
        }

        let whichResponse = dnsResponseVr
        const treeStatus: oct.TreeStatus = {
            name: oct.CubeToString(cube)[0],
            found: false,
            cube: cube,
            level: cube.p,
            isParent: false,
            wasXYZ: false,
            childrenBits: -1,
            error: null
        }
        if (dnsResponseXyz.Status === atwdns.DnsStatusCode.NOERROR && dnsResponseVr.Status === atwdns.DnsStatusCode.NOERROR) {
            // got both. Cool let's go with the .xyz for now. We can merge them later if needed.
            // Somebody spent money on this.
            treeStatus.wasXYZ = true
            treeStatus.found = true
            whichResponse = dnsResponseXyz

        } else if (dnsResponseXyz.Status === atwdns.DnsStatusCode.NOERROR) {
            treeStatus.found = true
            treeStatus.wasXYZ = true
            whichResponse = dnsResponseXyz
        } else if (dnsResponseVr.Status === atwdns.DnsStatusCode.NOERROR) {
            treeStatus.found = true
            treeStatus.wasXYZ = false
            whichResponse = dnsResponseVr
        } else {
            treeStatus.found = false
        }
        if (treeStatus.found) {
            const theanswer = atwdns.GetAnswer(whichResponse)
            const theanswertext = theanswer[1]
            // was it an A request? 
            // there's a version of this at the end of BuildVisibleTree
            // where the answer is parsed as a oct.GroupTextParameters
            // should we do that HERE? it's a terrible hack 
            // that will hurt someone someday but where to put the Answer?

            if (this.type == "A") {
                // do we need the array of address that they supply?
                // I don't know that we EVER use it.
                treeStatus.addresses = [theanswertext]
            } else { // the type MUST BE TXT. There's only two types now.
                // what if we want to do CNAMES someday?? 

                FillInTxtLogic(theanswertext, treeStatus)

                // groupId?: GroupTextParameters | boolean, 
                // the group that this tree belongs to, which is the same for all leaf nodes rendered by the same iFrame or server. 
                // let somegrp: oct.GroupTextParameters = {
                //     grp: utils.randomString(24)
                // }
                // try {
                //     somegrp = JSON.parse(theanswertext) as oct.GroupTextParameters
                // } catch {
                //     somegrp = { grp: utils.randomString(24) }
                //     somegrp.ex = { "actually-got": theanswertext }
                // }
                // if (somegrp) {
                //     if (somegrp.grp === undefined || somegrp.grp === "") {
                //         somegrp.grp = utils.randomString(24)
                //     }
                // } else {
                //     // didn't parse.
                //     somegrp = { grp: utils.randomString(24) }
                // }
                // treeStatus.groupId = somegrp
            }
        }
        return treeStatus
    }
}

// FillInTxtLogic makes sure everybody has a groupId. If the TXT record is missing or malformed, it generates a random one.
// the random id's are used to sort them into groups so everyone needs one. 
export function FillInTxtLogic(theanswertext: string, treeStatus: oct.TreeStatus) {
    // the type MUST BE TXT. There's only two types now.
    // what if we want to do CNAMES someday?? Death and destruction.

    theanswertext = theanswertext.replace(/'/g, '"') // replace single quotes with double quotes.
    // cloudflare refuses double quites in TXT so we end up like this.

    console.log("FillInTxtLogic for ", treeStatus.name, treeStatus.wasXYZ ? ".xyz" : ".vr", "with", theanswertext)

    // if we use treeStatus.name as the id instead of random string then they still 
    // group correctly.

    // groupId?: GroupTextParameters | boolean, 
    // the group that this tree belongs to, which is the same for all leaf nodes rendered by the same iFrame or server. 
    let somegrp: oct.GroupTextParameters = {
        id: treeStatus.name,// utils.randomString(24),
        master: "unknown-must-be-set"
    }
    try {
        somegrp = JSON.parse(theanswertext) as oct.GroupTextParameters
    } catch {
        // still a valid groupId.
        somegrp = {
            id: treeStatus.name,// utils.randomString(24),
            master: "unknown-must-be-set2"
        }
    }
    if( "mstr" in somegrp) { // from a refactor
        somegrp.master = treeStatus.name
    }
    if (somegrp) {
        if (somegrp.id === undefined || somegrp.id === "") {
            somegrp.id = treeStatus.name// utils.randomString(24)
        }
    } else {
        // didn't parse.
        somegrp = {
            id: treeStatus.name,// utils.randomString(24),
            master: "unknown-must-be-set3"
        }
    }
    treeStatus.groupId = somegrp
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
