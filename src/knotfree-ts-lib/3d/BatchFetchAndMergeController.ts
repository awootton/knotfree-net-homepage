
import * as oct from './UrlOctTree'
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
        if (knotfreeNative) {
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

    // groupId?: GroupTextParameters | boolean, 
    // the group that this tree belongs to, which is the same for all leaf nodes rendered by the same iFrame or server. 
    let somegrp: oct.GroupTextParameters = {
        id: utils.randomString(24)
    }
    try {
        somegrp = JSON.parse(theanswertext) as oct.GroupTextParameters
    } catch {
        // still a valid groupId.
        somegrp = { id: utils.randomString(24) }
    }
    if (somegrp) {
        if (somegrp.id === undefined || somegrp.id === "") {
            somegrp.id = utils.randomString(24)
        }
    } else {
        // didn't parse.
        somegrp = { id: utils.randomString(24) }
    }
    treeStatus.groupId = somegrp
}

// async function doOnePass() {

//     const frame = new BatchFetchAndMergeControllerSlowest(exampleInput, "A", "")
//     const [result, err] = await frame.TwoWayLookupAndMerge()

//     // console.log("We're back, but are we done ? TwoWayLookupAndMerge result: ", result, " error: ", err)
//     // console.log("We're back, but are we done ? TwoWayLookupAndMerge length: ", result?.length, " error: ", err)

//     // check result against Expected_output, assert the results are the same.
//     if (err) {
//         console.error("Error occurred:", err)
//         return
//     }

//     if (!result || result.length !== Our_Expected_Output.length) {
//         console.error("Result length mismatch. Expected:", Our_Expected_Output.length, "Got:", result?.length)
//         return
//     }

//     for (let i = 0; i < result.length; i++) {
//         const actual = result[i]
//         const expected = Our_Expected_Output[i] // an ad-hock object. Not a TreeStatus. We

//         if (actual.name !== expected.name) {
//             console.error(`A Mismatch at index ${i}: name. Expected ${expected.name}, got ${actual.name}`)
//         }
//         if (actual.found !== expected.found) {
//             console.error(`A Mismatch at index ${i}: found. Expected ${expected.found}, got ${actual.found}`)
//         }
//         if (actual.isParent !== expected.isParent) {
//             console.error(`A Mismatch at index ${i}: isParent. Expected ${expected.isParent}, got ${actual.isParent}`)
//         }
//         if (actual.wasXYZ !== expected.wasXYZ) {
//             console.error(`A Mismatch at index ${i}: wasXYZ. Expected ${expected.wasXYZ}, got ${actual.wasXYZ}`)
//         }
//         if (JSON.stringify(actual.addresses) !== JSON.stringify(expected.addresses)) {
//             console.error(`A Mismatch at index ${i}: addresses. Expected ${JSON.stringify(expected.addresses)}, got ${JSON.stringify(actual.addresses)}`)
//         }
//     }
//     // console.log("Assertion check complete.")
//     {
//         // let's try the text one
//         const frame = new BatchFetchAndMergeControllerSlowest(exampleInput, "TXT", "meta_group_id")
//         const [result, err] = await frame.TwoWayLookupAndMerge()

//         if (!result || result.length !== Our_Expected_Output.length) {
//             console.error("Result length mismatch. Expected:", Our_Expected_Output.length, "Got:", result?.length)
//             return
//         }

//         for (let i = 0; i < result.length; i++) {
//             const actual = result[i]

//             if (i === 11) { // several have some text

//                 const want = {
//                     grp: 'j9xK3mP8wL2z',
//                     dbg: 'localhost:3010',
//                     type: 'floor',
//                     asset: 'cobblestonesgrok512.jpg:repeat:20'
//                 }
//                 // console.log("Actual groupId for index 11: ", actual.groupId)
//                 const actualText = JSON.stringify(actual.groupId)
//                 const wantText = JSON.stringify(want)
//                 if (actualText !== wantText) { // we don't know what the groupId will be, so just set it to the expected value for comparison.
//                     console.error(`Mismatch at index ${i}: groupId. Expected ${wantText}, got ${actualText}`)
//                 }

//                 continue // the one with the group. 
//             }
//         }
//     }

// }













// type fetchTracker = {
//     cube: oct.Cube,
//     index: number,
//     isXYZ: boolean,
//     hadProblem: boolean
// }

// BatchFetchAndMergeController is a wrapper for all the other fetches we'll be running.
// The main thing is we want to re-run some of them, however that works. 
// we're checking the cache before we get here.
// We compare the .vr and .xyz results. And pick the best one. If either one is a 2, we have to do it again.
// The results will be made into a TreeStatus.
// export class BatchFetchAndMergeController {

//     cubes: oct.Cube[]
//     fetchTrackers: fetchTracker[]    // we do one .vr and one .xyz for each cube.
//     promises: Promise<Response>[]   // we do one .vr and one .xyz for each cube.
//     type: "TXT" | "A"
//     prefix: string
//     // I heard this is how the cool kids do it. 
//     signal: AbortSignal
//     controller: AbortController

//     dnsResponses: atwdns.DnsResponse[]   // we do one .vr and one .xyz for each cube.
//     theDamnAnswers: oct.TreeStatus[]   // we do one .vr and one .xyz for each cube.

//     problemChildren = new Map<fetchTracker, number>() // this is the set of cube names that had problems. We want to retry these.

//     constructor(cubes: oct.Cube[], type: "TXT" | "A", prefix: string) {
//         this.cubes = cubes
//         this.type = type
//         this.prefix = prefix
//         this.fetchTrackers = new Array(this.cubes.length * 2) // we do one .vr and one .xyz for each cube.
//         this.promises = new Array(this.cubes.length * 2) // we do one .vr and one .xyz for each cube.
//         this.dnsResponses = new Array(this.cubes.length * 2) // we do one .vr and one .xyz for each cube.

//         this.controller = new AbortController();
//         this.signal = this.controller.signal;

//         this.theDamnAnswers = new Array(this.cubes.length) // we do one .vr and one .xyz for each cube.
//     }

//     // let's stick them all into little objects.
//     // save them up

//     // The goal is to NEVER return an error unless we have tried, relentlessly, for at least 30 seconds.
//     // I hate it but I've seen horrors. People return a 2 when really mean to say 0 or 3
//     async TwoWayLookupAndMerge(): Promise<[oct.TreeStatus[], Error | null]> {

//         const uberPromise = this.makeThePromisesAll() // this kicks off all the fetches in parallel and gives us a promise that resolves when they are all done. 

//         await uberPromise.then(

//             results => {
//                 // console.log("Uber promise level 0 results: ", results)
//                 // handle level 0 results. We probably have 200's ?
//                 const textPromises =  this.handleFetchResults(results)
//                 await textPromises.then(([answers, err]) => {
//                     if (err) {
//                         console.log("TwoWayLookupAndMerge: Error in handleFetchResults: ", err)
//                         return [[], err]
//                     }
//                 }).catch(err => {   
//                     console.log("TwoWayLookupAndMerge: Error in textPromises: ", err)
//                     return [[], err]
//                 })

//         ).catch(err => {
//             // is this handled now or will it puke on the caller too?
//             // it needs all new promises. We have to remake the fetches and the promises and then do it again.
//             if (err.cause && err.cause.code === "ECONNREFUSED") {

//                 this.controller.abort() // this will abort all the fetches that are still in flight. If the server is down they are ALL dead.

//                 const server = atwdns.knotfreeServer // localhost:  or knotfree.dog:  or knotfree.net (secure) or knotfree.io (http)
//                 console.log(`BatchFetchAndMergeController Connection refused to ${server}: pass`, 0)
//                 return this.tryAgain(0)
//             }
//             console.log("TwoWayLookupAndMerge giving up due to unhandled error: ", err)
//             return [[], err]
//         }).finally(() => {
//             // no, why? console.log("Error in uberPromise: ", "finally block reached. We can do something here if needed.")
//         })

//         // console.log("TwoWayLookupAndMerge Uber promise result: end initial call. ")

//         return [this.theDamnAnswers, null]
//     }

//     async tryAgain(level: number): Promise<[oct.TreeStatus[], Error | null]> {

//         if (level > 6) { // 30 seconds baby.
//             console.error("tryAgain Too many retries. Giving up.")
//             return [[], new Error("Too many retries. Giving up.")]
//         }

//         await new Promise(resolve => setTimeout(resolve, 5000)) // wait for 5 seconds before trying again.

//         const newUberPromises = this.makeThePromisesAll()
//         await newUberPromises.then((results) => {

//             // now we have to look at them all being errors.
//             // The whole batch is not going to be ECONNREFUSED
//             for (let i = 0; i < results.length; i++) {
//                 const result = results[i]
//                 const fetchTracker = this.fetchTrackers[i]
//                 const response = result
//                 if (response.ok === false || response.status !== 200 || response.statusText !== "OK") {
//                     console.log(`tryAgain: Fetch failed for cube ${oct.CubeToString(fetchTracker.cube)[0]} (${fetchTracker.isXYZ ? "xyz" : "vr"}): ${response.status} ${response.statusText}`)
//                     fetchTracker.hadProblem = true
//                     this.problemChildren.set(fetchTracker, i)
//                     continue // just bail? I'm getting tired of beiing perfect. We can try again later.
//                 }
//             }

//             console.log(`tryAgain succeeded. level ${level} treeStatuses: `, results)
//             return this.handleFetchResults(results)

//         }).catch(err => {
//             if (err.cause && err.cause.code === "ECONNREFUSED") {

//                 this.controller.abort() // this will abort all the fetches that are still in flight. If the server is down they are ALL dead.

//                 const server = atwdns.knotfreeServer // localhost:  or knotfree.dog:  or knotfree.net (secure) or knotfree.io (http)
//                 console.log(`tryAgain Connection refused to ${server}: pass`, level)

//                 return this.tryAgain(level + 1)
//             }
//             console.log("tryAgain giving up due to unhandled error: ", err)
//             return [[], err]
//         })
//         return [[], null]
//     }

//     makeThePromisesAll(): Promise<Response[]> {
//         for (let i = 0; i < this.cubes.length; i++) {
//             const cube = this.cubes[i]
//             const name = oct.CubeToString(cube)[0]
//             const fetchTracker1: fetchTracker = {
//                 cube: cube,
//                 index: i,
//                 isXYZ: false,
//                 hadProblem: false
//             }
//             this.promises[i * 2] = this.FetchOneDnsResponse(name, true) // is knotfree 
//             this.fetchTrackers[i * 2] = fetchTracker1

//             const fetchTracker2: fetchTracker = {
//                 cube: cube,
//                 index: i,
//                 isXYZ: true,
//                 hadProblem: false
//             }
//             this.fetchTrackers[i * 2 + 1] = fetchTracker2
//             this.promises[i * 2 + 1] = this.FetchOneDnsResponse(name, false) // is xyz
//         }
//         // we can kick these off in parallel.
//         // we need to track them so we can retry if needed. 
//         // maybe we put them in an array and then check them all after a certain time? 
//         // or we could use Promise.allSettled and then check the results. That might be cleaner. 

//         const uberPromise = Promise.all(this.promises)
//         return uberPromise
//     }

//     // FetchOneDnsResponse set up the promise. Just one.  We work from the botom up.
//     async FetchOneDnsResponse(name: string, knotfreeNative: boolean):
//         Promise<Response> {

//         const server = atwdns.knotfreeServer // localhost:  or knotfree.dog:  or knotfree.net (secure) or knotfree.io (http)

//         // eg  url = "https://knotfree.net/api1/dns-query?name=meta_group_id.testmain-0n0u0e16p-0.vr&type=TXT&knotfree=1"&dnsServer="1.1.1.1"
//         if (this.prefix) {
//             name = `${this.prefix}.${name}`
//         }
//         if (knotfreeNative) {
//             name = `${name}.vr`
//         } else {
//             name = `${name}.xyz`
//         }
//         let url = `${server}/api1/dns-query?name=${name}&type=${this.type}&dnsServer=${atwdns.currentDnsServer}`
//         if (knotfreeNative) {
//             url += `&knotfree=1`
//         }
//         // console.log("FetchOneDnsResponse url is", url)
//         const responsePromise = fetch(url, { signal: this.signal });
//         // should we just wait for the text now?
//         // no, catch problems here and then we can do the parsing in the caller and catch problems there too.
//         return responsePromise
//     }

//     async handleFetchResults(results: Response[]): [ Promise<string>[], Error | null]> { // these are fetch Responses. We need to check the status codes and then parse the json.
//         console.log("handleFetchResults: results length: ", results.length)
//         if (results.length !== this.promises.length) {
//             console.error("handleFetchResults: results length does not match fetchTrackers length. Something is wrong.")
//             return Promise.resolve([[], new Error("handleFetchResults: results length does not match fetchTrackers length. Epic fail.")])
//         }
//         // we should make promises for getting the text and run those all at once too. 

//         const textPromises: Promise<string>[] = new Array(results.length)

//         // we have to check them all and see if any of them had problems. If they did, we have to try again.
//         for (let i = 0; i < results.length; i++) {
//             const result = results[i]
//             const fetchTracker = this.fetchTrackers[i]
//             const response = result
//             if (response.ok === false || response.status !== 200 || response.statusText !== "OK") {
//                 console.log(`handleFetchResults: Fetch failed for cube ${oct.CubeToString(fetchTracker.cube)[0]} (${fetchTracker.isXYZ ? "xyz" : "vr"}): ${response.status} ${response.statusText}`)
//                 fetchTracker.hadProblem = true
//                 this.problemChildren.set(fetchTracker, i)
//                 continue // just bail? I'm getting tired of beiing perfect. We can try again later.
//             }
//             // we have a 200 
//             textPromises[i] = response.text()

//             // response.text().then(text => {
//             //     // it's fetch Responses.
//             //     try {
//             //         const dnsResponse: atwdns.DnsResponse = JSON.parse(text) as atwdns.DnsResponse
//             //         if (dnsResponse === undefined || dnsResponse === null) {
//             //             fetchTracker.hadProblem = true
//             //             this.problemChildren.set(fetchTracker, i)
//             //         } else {
//             //             // console.log(`handleFetchResults have dns Response ${JSON.stringify(dnsResponse)}`)
//             //             // console.log(`handleFetchResults have dns Response dnsResponse `, dnsResponse)
//             //             if (dnsResponse.Status !== atwdns.DnsStatusCode.NOERROR && dnsResponse.Status !== atwdns.DnsStatusCode.NXDOMAIN) {
//             //                 // god, you're annoyibng, console.error(`handleFetchResults: DNS response status not success for cube ${oct.CubeToString(fetchTracker.cube)[0]} (${fetchTracker.isXYZ ? "xyz" : "vr"}): ${dnsResponse.Status} ${dnsResponse.Comment}`)
//             //                 fetchTracker.hadProblem = true
//             //                 this.problemChildren.set(fetchTracker, i)
//             //                 // continue
//             //             } else {
//             //                 // good to go. is atwdns.DnsResponse and is not SERVFAIL = 2 or any other such rubbish
//             //                 this.dnsResponses[i] = dnsResponse
//             //             }
//             //         }
//             //     } catch (err) {
//             //         console.log(`handleFetchResults: Error parsing JSON response for cube ${oct.CubeToString(fetchTracker.cube)[0]} (${fetchTracker.isXYZ ? "xyz" : "vr"}): ${err}`)
//             //         fetchTracker.hadProblem = true
//             //         this.problemChildren.set(fetchTracker, i)
//             //     }
//             // }).catch(err => {
//             //     // I see ECONNRESET from retarded servers. We have to try again later. 
//             //     console.log(`handleFetchResults: Error getting response text for cube ${oct.CubeToString(fetchTracker.cube)[0]} (${fetchTracker.isXYZ ? "xyz" : "vr"}): ${err}`)
//             //     fetchTracker.hadProblem = true
//             //     this.problemChildren.set(fetchTracker, i)
//             // })
//             // try {
//             //     const text = await response.text() // this
//             //     // it's fetch Responses.
//             //     const dnsResponse: atwdns.DnsResponse = JSON.parse(text) as atwdns.DnsResponse
//             //     // console.log(`handleFetchResults have dns Response ${JSON.stringify(dnsResponse)}`)
//             //     // console.log(`handleFetchResults have dns Response dnsResponse `, dnsResponse)
//             //     if (dnsResponse.Status !== atwdns.DnsStatusCode.NOERROR && dnsResponse.Status !== atwdns.DnsStatusCode.NXDOMAIN) {
//             //         // god, you're annoyibng, console.error(`handleFetchResults: DNS response status not success for cube ${oct.CubeToString(fetchTracker.cube)[0]} (${fetchTracker.isXYZ ? "xyz" : "vr"}): ${dnsResponse.Status} ${dnsResponse.Comment}`)
//             //         fetchTracker.hadProblem = true
//             //         this.problemChildren.set(fetchTracker, i)
//             //         continue
//             //     }
//             //     this.dnsResponses[i] = dnsResponse

//             // } catch (err) {
//             //     console.log(`handleFetchResults: Error parsing response for cube ${oct.CubeToString(fetchTracker.cube)[0]} (${fetchTracker.isXYZ ? "xyz" : "vr"}): ${err}`)
//             //     fetchTracker.hadProblem = true
//             //     this.problemChildren.set(fetchTracker, i)
//             //     continue
//             // }
//         }// results loop. 

//         // we have to recurse on the problem children now, which might be all of them if 
//         // the server is down.
//         console.log(`handleFetchResults: end results loop problemChildren size: ${this.problemChildren.size}`)

//             return [textPromises,null]

//         // const allTheTexts = Promise.all(textPromises).then(texts => {
//         //     for (let i = 0; i < texts.length; i++) {

//         //         const text = texts[i]

//         //        // console.log(`handleFetchResults: text for cube : ${text}`)

//         //         const fetchTracker = this.fetchTrackers[i]
//         //         try {
//         //             const dnsResponse: atwdns.DnsResponse = JSON.parse(text) as atwdns.DnsResponse
//         //             if (dnsResponse === undefined || dnsResponse === null) {
//         //                 fetchTracker.hadProblem = true
//         //                 this.problemChildren.set(fetchTracker, i)
//         //             } else {
//         //                 if (dnsResponse.Status !== atwdns.DnsStatusCode.NOERROR && dnsResponse.Status !== atwdns.DnsStatusCode.NXDOMAIN) {
//         //                     fetchTracker.hadProblem = true
//         //                     this.problemChildren.set(fetchTracker, i)
//         //                 } else {
//         //                     this.dnsResponses[i] = dnsResponse
//         //                 }
//         //             }
//         //         } catch (err) {
//         //             console.log(`handleFetchResults: Error parsing response for cube ${oct.CubeToString(fetchTracker.cube)[0]} (${fetchTracker.isXYZ ? "xyz" : "vr"}): ${err}`)
//         //             fetchTracker.hadProblem = true
//         //             this.problemChildren.set(fetchTracker, i)
//         //         }
//         //     }
//         //     // now, check them
//         //     const doWeHaveThemAll1 = this.problemChildren.size === 0
//         //     let doWeHaveThemAll2 = true
//         //     // let's make the dnsResponses
//         //     for (let i = 0; i < this.dnsResponses.length; i++) {
//         //         if (this.dnsResponses[i] === undefined || this.dnsResponses[i] === null) {
//         //             doWeHaveThemAll2 = false
//         //             const fetchTracker = this.fetchTrackers[i]
//         //             console.error(`handleFetchResults: Missing dnsResponse for cube ${oct.CubeToString(fetchTracker.cube)[0]} (${fetchTracker.isXYZ ? "xyz" : "vr"})`)
//         //         }
//         //     }

//         //     if (!doWeHaveThemAll1 || !doWeHaveThemAll2) {
//         //         console.error(`handleFetchResults: We have problems with ${this.problemChildren.size} fetches. We have to try again. `, this.problemChildren)
//         //         return [[], new Error(`handleFetchResults: We have problems with ${this.problemChildren.size} fetches. We have to try again.`)]
//         //     }
//         //     // make the actual responses we need. Man, I'm tired of this. it's been 4 hours.
//         //     for (let i = 0; i < this.dnsResponses.length; i += 2) {
//         //         const dnsResponseVr = this.dnsResponses[i]
//         //         const dnsResponseXyz = this.dnsResponses[i + 1]
//         //         // don't I already have logic for this? 
//         //         const cubeIndex = Math.floor(i / 2)
//         //         const cube = this.cubes[cubeIndex]
//         //         this.theDamnAnswers[cubeIndex] = this.handlePairOfResponses(dnsResponseVr, dnsResponseXyz, cube)
//         //     }
//         //     return [this.theDamnAnswers, null]
//         // }).catch(err => {
//         //     console.log("handleFetchResults: Error in Promise.all for textPromises: ", err)
//         //     return [[], err]
//         // })
//         return allTheTexts
//     }

//     async handleTextResults(textPromises: Response[]): Promise<[oct.TreeStatus[], Error | null]> { 
//      const allTheTexts = Promise.all(textPromises).then(texts => {
//             for (let i = 0; i < texts.length; i++) {

//                 const text = texts[i]

//                // console.log(`handleFetchResults: text for cube : ${text}`)

//                 const fetchTracker = this.fetchTrackers[i]
//                 try {
//                     const dnsResponse: atwdns.DnsResponse = JSON.parse(text) as atwdns.DnsResponse
//                     if (dnsResponse === undefined || dnsResponse === null) {
//                         fetchTracker.hadProblem = true
//                         this.problemChildren.set(fetchTracker, i)
//                     } else {
//                         if (dnsResponse.Status !== atwdns.DnsStatusCode.NOERROR && dnsResponse.Status !== atwdns.DnsStatusCode.NXDOMAIN) {
//                             fetchTracker.hadProblem = true
//                             this.problemChildren.set(fetchTracker, i)
//                         } else {
//                             this.dnsResponses[i] = dnsResponse
//                         }
//                     }
//                 } catch (err) {
//                     console.log(`handleFetchResults: Error parsing response for cube ${oct.CubeToString(fetchTracker.cube)[0]} (${fetchTracker.isXYZ ? "xyz" : "vr"}): ${err}`)
//                     fetchTracker.hadProblem = true
//                     this.problemChildren.set(fetchTracker, i)
//                 }
//             }
//             // now, check them
//             const doWeHaveThemAll1 = this.problemChildren.size === 0
//             let doWeHaveThemAll2 = true
//             // let's make the dnsResponses
//             for (let i = 0; i < this.dnsResponses.length; i++) {
//                 if (this.dnsResponses[i] === undefined || this.dnsResponses[i] === null) {
//                     doWeHaveThemAll2 = false
//                     const fetchTracker = this.fetchTrackers[i]
//                     console.error(`handleFetchResults: Missing dnsResponse for cube ${oct.CubeToString(fetchTracker.cube)[0]} (${fetchTracker.isXYZ ? "xyz" : "vr"})`)
//                 }
//             }

//             if (!doWeHaveThemAll1 || !doWeHaveThemAll2) {
//                 console.error(`handleFetchResults: We have problems with ${this.problemChildren.size} fetches. We have to try again. `, this.problemChildren)
//                 return [[], new Error(`handleFetchResults: We have problems with ${this.problemChildren.size} fetches. We have to try again.`)]
//             }
//             // make the actual responses we need. Man, I'm tired of this. it's been 4 hours.
//             for (let i = 0; i < this.dnsResponses.length; i += 2) {
//                 const dnsResponseVr = this.dnsResponses[i]
//                 const dnsResponseXyz = this.dnsResponses[i + 1]
//                 // don't I already have logic for this? 
//                 const cubeIndex = Math.floor(i / 2)
//                 const cube = this.cubes[cubeIndex]
//                 this.theDamnAnswers[cubeIndex] = this.handlePairOfResponses(dnsResponseVr, dnsResponseXyz, cube)
//             }
//             return [this.theDamnAnswers, null]
//         }).catch(err => {
//             console.log("handleFetchResults: Error in Promise.all for textPromises: ", err)
//             return [[], err]
//         })
//     }

//     handlePairOfResponses(dnsResponseVr: atwdns.DnsResponse, dnsResponseXyz: atwdns.DnsResponse, cube: oct.Cube): oct.TreeStatus {
//         // this is where we compare the .vr and .xyz responses and decide what the TreeStatus is. 
//         // This is a simplification for this example. In reality, you would need to parse the responses according to your specific format and logic.

//         if (!dnsResponseVr || !dnsResponseXyz) {
//             console.error("handlePairOfResponses: One of the DNS responses is null or undefined.")
//             // we should not be getting ANY undefined in here.
//             // FIXME: can't return this.
//             return {
//                 name: oct.CubeToString(cube)[0],
//                 found: false,
//                 cube: cube,
//                 level: cube.p,
//                 isParent: false,
//                 wasXYZ: false,
//                 childrenBits: -1,
//                 error: new Error("One of the DNS responses is null or undefined.")
//             }
//         }

//         let whichResponse = dnsResponseVr
//         const treeStatus: oct.TreeStatus = {
//             name: oct.CubeToString(cube)[0],
//             found: false,
//             cube: cube,
//             level: cube.p,
//             isParent: false,
//             wasXYZ: false,
//             childrenBits: -1,
//             error: null
//         }
//         if (dnsResponseXyz.Status === atwdns.DnsStatusCode.NOERROR && dnsResponseVr.Status === atwdns.DnsStatusCode.NOERROR) {
//             // got both. This is weird but let's go with the .vr for now. We can merge them later if needed.
//             whichResponse = dnsResponseXyz
//             treeStatus.wasXYZ = true
//             treeStatus.found = true
//         } else if (dnsResponseXyz.Status === atwdns.DnsStatusCode.NOERROR) {
//             treeStatus.found = true
//             treeStatus.wasXYZ = true
//             whichResponse = dnsResponseVr
//         } else if (dnsResponseVr.Status === atwdns.DnsStatusCode.NOERROR) {
//             treeStatus.found = true
//         } else {
//             treeStatus.found = false
//         }
//         if (treeStatus.found) {
//             const theanswer = atwdns.GetAnswer(whichResponse)
//             const theanswertext = theanswer[1]
//             // was it an A request? 
//             // there's a version of this at the end of BuildVisibleTree
//             // where the answer is parsed as a oct.GroupTextParameters
//             // should we do that HERE? it's a terrible hack 
//             // that will hurt someone someday but where to put the Answer?

//             if (this.type == "A") {
//                 // do we need the array of address that they supply?
//                 // I don't know that we EVER use it.
//                 treeStatus.addresses = [theanswertext]
//             } else { // the type MUST BE TXT. There's only two types now.
//                 // what if we want to do CNAMES someday?? Death and destruction.

//                 // groupId?: GroupTextParameters | boolean, 
//                 // the group that this tree belongs to, which is the same for all leaf nodes rendered by the same iFrame or server. 
//                 let somegrp: oct.GroupTextParameters = {
//                     grp: utils.randomString(24)
//                 }
//                 try {
//                     somegrp = JSON.parse(theanswertext) as oct.GroupTextParameters
//                 } catch {
//                     somegrp = { grp: utils.randomString(24) }
//                     somegrp.ex = { "actually-got": theanswertext }
//                 }
//                 if (somegrp) {
//                     if (somegrp.grp === undefined || somegrp.grp === "") {
//                         somegrp.grp = utils.randomString(24)
//                     }
//                 } else {
//                     // didn't parse.
//                     somegrp = { grp: utils.randomString(24) }
//                 }
//                 treeStatus.groupId = somegrp
//             }
//         }
//         return treeStatus
//     }
// }

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
