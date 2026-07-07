
import * as oct from './UrlOctTree'

import * as loaders from './OctTreeLoaders'
import * as atwdns from './DnsTypes'
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import * as utils from './utils'
import * as names from './NamesApi'
import * as fetchAndMerge from './BatchFetchAndMergeController'

// Where should this live? It's a lib now.

export type ThingsThatAlreadyExistType = {
    cube: oct.Cube,
    wasXYZ: boolean,
    weOwnIt: boolean // if we own it, then we can reserve it again. If we don't own it, then we can't reserve it or add the TXT record. or anything else.
}

// ReserveResult is the accumulation of results during the process of reserving a property. 
// It includes the original list of properties we wanted to reserve, the raw chains of cubes that we would need to reserve, 
// the list of cubes that we already had in the cache, the list of cubes that we actually need to reserve, 
// a reference to the cube cache, and any error that occurred during the process.
// Prepared by PrepareToReservePropertyBatch
export type ReserveResult = {
    startingProperties: string[],
    rawChains: oct.Cube[][], // the raw chain of cubes that we would need to reserve, including the ones that are already in the cache. This is for debugging and visualization purposes.

    // thingsWeWillNeed: Cube[][], // same as rawChain. will have duplicates in the parents.
    // never, ever ever do this again: loser:thingsThatAlreadyExist: { cube: Cube, from: string }[],  // of all the chains, from vr or xyz
    thingsThatAlreadyExist: ThingsThatAlreadyExistType[],  // of all the chains, from vr or xyz
    thingsToActuallyReserve: ThingsThatAlreadyExistType[],  // because they might exist anyway.

    leavesWeOwn: ThingsThatAlreadyExistType[],  // leaves that we own

    cubeCache: Map<string, oct.TreeStatus>, // a reference to the cache. Is oct.gCubeCache and I think it should be passed in as an arg and not just assumed.
    error: Error | null
}


// ReserveVr checks which of the cube names already exist, and then reserves the ones that don't exist, with the given group text parameters. 
// It also checks that the environment variables for the passphrase and big knotfree token are set and valid before attempting to reserve. 
// It prompts the user for confirmation before proceeding with the reservation. It returns an error if any step fails, or null if it succeeds.
// If it fails partway through, you can just run it again and it will skip the ones that already exist and try to reserve the rest.
// TODO: we should be able to use it to just change the group params. TODO: test that.
export class ReserveVrFunctions {

    pubk: string
    priv: string
    bigKnotfreeToken: string

    // we could add the passphrase and the token as args to cnstruct this instead 
    // of just having it pull from the environment variables. But for now, this is the crap we got.
    constructor() {
        let [[pubk, priv], bigKnotfreeToken, err] = GetTheKeys()
        if (err) {
            throw new Error("Error getting keys: " + err.message)
        }
        this.pubk = pubk
        this.priv = priv
        this.bigKnotfreeToken = bigKnotfreeToken
    }

    async ReserveVr(cubeNames: string[], groupTextParameters: oct.GroupTextParameters): Promise<Error | null> {

        // from GetTheKeys ...
        // const passPhrase = process.env.PRIVATE_KNOTFREE_PASSPHRASE || "failed";
        // let bigKnotfreeToken = process.env.BIG_KNOTFREE_TOKEN || "failed";

        const gtpString = JSON.stringify(groupTextParameters)
        if (gtpString.length > 255) {
            console.error("Group text parameters are too long to fit in a TXT record. Please shorten them.")
        }
        // console.log("Group text parameters for the reservation:", JSON.stringify(groupTextParameters), gtpString.length)

        let tmp = await this.PrepareToReservePropertyBatch(cubeNames, oct.gCubeCache)
        // console.log("PrepareToReservePropertyBatch result", tmp)
        if (tmp instanceof Error) {
            console.error("Error preparing to reserve property batch:", tmp)
            return new Error("Error preparing to reserve property batch: " + tmp.message)
        }
        const reserveResult = tmp[0]
        {
            tmp = await this.VerifyReservePropertyBatch(reserveResult)
            //console.log("VerifyReservePropertyBatch result", tmp)
            if (tmp instanceof Error) {
                console.error("Error verifying reserve property batch:")

                return new Error("Error verifying reserve property batch: " + tmp.message)
            } else {
                console.log("Successfully verified reserve property batch. Starting properties:", tmp[0].startingProperties)
                console.log("Successfully verified reserve property batch. thingsThatAlreadyExist:", tmp[0].thingsThatAlreadyExist)
                //console.log("Successfully verified reserve property batch. Result:", tmp)
            }
            for (const chain of reserveResult.rawChains) {
                // too many to log
                // console.log("Raw chain:", chain.map(cube => oct.CubeToString(cube)[0]))
            }

            // prepare the lists. 
            await this.PrepareTheLists(reserveResult)

            if (reserveResult.thingsThatAlreadyExist.length > 0) {
                console.log("The following properties already exist and won't be reserved again:", reserveResult.thingsThatAlreadyExist.map(item => oct.CubeToString(item.cube)[0]))
            }

            if (reserveResult.thingsToActuallyReserve.length === 0) {
                console.error("No properties to reserve after preparation.")
                if (reserveResult.leavesWeOwn.length > 0) {
                    console.log("We do have some properties that already exist that we could re-do to add group params and such.", reserveResult.leavesWeOwn.map(item => oct.CubeToString(item.cube)[0]))

                    const yn = await askQuestion("Would you like to keep going and process these existing properties? (y/n) ")
                    if (yn.toLowerCase() === "n") {
                        console.log("Aborting reservation.")
                        return new Error("No properties to reserve after preparation.")
                    }
                    // copy the leavesWeOwn into thingsToActuallyReserve so we can process them.
                    reserveResult.thingsToActuallyReserve.push(...reserveResult.leavesWeOwn)
                }
            }
            console.log("Ready to reserve the following properties:", reserveResult.thingsToActuallyReserve.map(thing => oct.CubeToString(thing.cube)[0]))

            const gtpString = JSON.stringify(groupTextParameters)
            if (gtpString.length > 255) {
                console.error("Group text parameters are too long to fit in a TXT record. Please shorten them.")
                return new Error("Group text parameters are too long to fit in a TXT record. Please shorten them.")
            }
            // console.log("Group text parameters for the reservation:", JSON.stringify(groupTextParameters), gtpString.length)
        }

        const yn = await askQuestion("Would you like to reserve these names now? (y/n) ")
        if (yn.toLowerCase() !== "y") {
            console.log("Aborting reservation.")
            return new Error("Reservation aborted by user.")
        } else {
            console.log("going through with it.")
            console.log()
            let i = 0
            for (const thing of reserveResult.thingsToActuallyReserve) {
                try {
                    let err: Error | null
                    let cubeStr: string
                    [cubeStr, err] = oct.CubeToString(thing.cube)
                    if (err) {
                        console.error("Error converting cube to URL string:", err)
                        return new Error("Error converting cube to URL string: " + err.message)
                    }
                    // if (!thing.cube.whichParent) {
                    //     console.log(`Reserving property ${cubeStr}.vr with group text parameters:`, JSON.stringify(groupTextParameters))
                    // }
                    // Here you would call the function to actually reserve the property using the cubeStr and groupTextParameters.
                    // This might involve sending a command to the knotfree API or some other action depending on how your reservation system works.
                    // what if it fails in the middle? Seppuku. The only recourse.
                    // just kidding. if we run it again it should skip the ones that already exist and try to reserve the rest.
                    const cubeUrlVr = cubeStr + "_vr" // how knotfree does a .vr domain. (or any domain)

                    if (!thing.weOwnIt) {
                        // don't do the exist and the reserve again.

                        let res: string
                        [res, err] = await names.sendNameserviceCommandHarder("exists", cubeUrlVr, { pubk: this.pubk, priv: this.priv })
                        if (err) {
                            console.error("Error checking if name exists:", err)
                            return new Error("Error checking if name exists: " + err.message)
                        }
                        const existsObj = JSON.parse(res) as names.LookupNameExistsReturnType
                        if (existsObj.Exists && existsObj.Owner !== this.pubk) {
                            console.log(`How can this exist, we just checked? ${cubeStr} as ${cubeUrlVr}. It now exists in the name service.`)
                        }


                        // does it belong to me? If it does then we can just keep going anyway.
                        // if (existsObj.Exists && existsObj.Owner !== this.pubk) 
                        // then we can just keep going anyway, boldly.
                        // const tokenAsBase64 = utils.fromBase64Url(this.bigKnotfreeToken)
                        const astr = "reserve " + cubeUrlVr + " " + this.bigKnotfreeToken;
                        [res, err] = await names.sendNameserviceCommandHarder(astr, cubeUrlVr, { pubk: this.pubk, priv: this.priv })
                        if (err) {
                            console.error("Error reserving name:", err)
                            return new Error("Error reserving name: " + err.message)
                        }
                        console.log(`Attempted to reserve ${cubeUrlVr}. Response:`, res)
                        if (res.startsWith("FAILED")) {
                            console.error(`Failed to reserve ${cubeUrlVr}:`, res)
                        } else {
                            console.log(`Successfully reserved ${cubeUrlVr}. Response:`, res)
                        }
                    }
                    // if cubeStr ends has -0 or -1 ... -7 at the end, then it's a parent and we should not set the group text parameters on it. We should only set the group text parameters on the leaf nodes that we actually reserved. This is because the parent nodes are shared with other properties and we don't want to mess with their group text parameters.
                    // just look for the dash
                    // isn't this already done? 
                    const leafNodeMatch = cubeStr.match(/-([0-7])\_vr$/)
                    if (leafNodeMatch === null) { // no match for parent it's a leaf

                        var theseParams = {
                            ...groupTextParameters,
                        } as oct.GroupTextParameters
                        if ( i === 0) {
                            // if it's the first one, then we should set it as the master. 
                            theseParams.mstr = true
                            console.log(`Setting ${cubeUrlVr} as the master node for the group. ${theseParams.id}`)
                        }
                        const gtpString = JSON.stringify(theseParams)

                        // don't set these on parents.
                        const gtpStringBase64Url = Buffer.from(gtpString).toString('base64url')
                        // this is a CRAP convention that I made up and I apologize for it. 
                        const gtpStringBase64UrlWithEquals = "=" + gtpStringBase64Url

                        const cmd = `set option txt meta_group_id ${gtpStringBase64UrlWithEquals}`
                        console.log(`Setting group text parameters on ${cubeUrlVr} since it appears to be a leaf node. cmd = ${cmd}`)
                        const [res, err] = await names.sendNameserviceCommandHarder(cmd, cubeUrlVr, { pubk: this.pubk, priv: this.priv })
                        if (err) {
                            console.error("Error setting option:", err)
                            return new Error("Error setting option: " + err.message)
                        }
                        console.log(`set option ${cubeUrlVr}`, res)
                        console.log()
                    }
                } catch (e) {
                    // let's keep trying to do the rest of them even though the 
                    // server rudely hung up on us. 
                    console.error("Error during reservation process:", e)
                    // keep going return new Error("Error during reservation process: " + (e instanceof Error ? e.message : String(e)))
                }
                i++
            }
            return null;
        }
    }

    // PrepareToReserveProperty will prepare a list of names to reserve. 
    // It does not actually do the reservation, and it will NOT check the cache and return the whole list.
    // The idea is that we can then batch those missing ones together and reserve them all at once, and then update the cache with the new ones.
    // it does not have to be swift. Doesn't happen during render, it can be a button click or something.
    async PrepareToReservePropertyBatch(startingProperties: string[], cache: Map<string, oct.TreeStatus>): Promise<[ReserveResult, Error | null]> {

        let result: ReserveResult = {
            startingProperties,
            thingsThatAlreadyExist: [],
            thingsToActuallyReserve: [],
            leavesWeOwn: [],
            rawChains: [],
            cubeCache: cache,
            error: null
        }
        for (const property of startingProperties) {
            console.log(`Processing property ${property}`)
            // do we check if this property exists and if we own it? 
            // now? 
            let rawChainCubes: oct.Cube[] = []
            let [c, err] = oct.StringToCube(property)
            if (err) {
                console.error(`Error parsing property ${property}: ${err}`)
                return [result, err]
            }
            // fill the raw chain
            rawChainCubes.push(c) // the child
            var [parent, i] = oct.GetParentCubeWithOcttreeIndex(c)
            c = parent
            while (c.p < 16) {
                [parent, i] = oct.GetParentCubeWithOcttreeIndex(c)
                rawChainCubes.push({ ...parent, whichParent: i })
                c = parent
            }
            result.rawChains.push(rawChainCubes)
            // let's take a look. Print the rawChainCubes
            // a little verbose console.log(rawChainCubes)
            // itarate through the rawChainCubes  
            for (const cubeParent of rawChainCubes) {
                const [name, err] = oct.CubeToString(cubeParent)
                if (err) {
                    console.error(`Error converting cube to URL string: ${err}`)
                    continue
                }
            }
        }
        return [result, null]
    }

    // if the property is already exists, or we find it in the cache (same thing) then we CAN'T reserve it. 
    // actually, if ANY of the parents are not parents and are actually leaves then, also a fail.
    // please tell me this works in a browser environment. I'm nervious about .map and stuff.
    // the problem is that, if we own those things, then we could be idimpotent and just keep going.
    // we MUST be idimpotent.
    async VerifyReservePropertyBatch(result: ReserveResult): Promise<[ReserveResult, Error | null]> {

        // check for leafs. If any of the parents are actually leafs, then we can't reserve this property. 
        // This is a failure case that we need to handle.
        for (const rawChain of result.rawChains) {
            const leafList: string[] = []
            const cubesAsLeaves: oct.Cube[] = []

            // the raw chain is leaf and parents. 
            // we just want to check leaves. 
            for (const cubeParent of rawChain) {
                const parentAsChild = {
                    x: cubeParent.x,
                    y: cubeParent.y,
                    z: cubeParent.z,
                    p: cubeParent.p,
                    world: cubeParent.world
                } as oct.Cube
                const [name, err] = oct.CubeToString(parentAsChild)
                if (err) {
                    err.message += (`Error converting cube to URL string: ${err}`)
                    console.error(err)
                    return [result, err]
                }
                leafList.push(name)
                cubesAsLeaves.push(parentAsChild)
            }
            // note that the final leaf and it's parent have the same name, 
            // but the final leaf is actually a leaf and the parent is actually a parent. 
            let commaList = ""
            if (leafList.length > 1 && leafList[0] === leafList[1]) {
                commaList = leafList.slice(1).join(",")
            }
            else {
                commaList = leafList.join(",")
            }
            // lets make leafList into a command separated string and print it out.
            // console.log(`Leaf list for property ${result.startingProperties[0]}: ${commaList}`)
            // too bad this doesn't return ownership. Thus would save time later.
            const mergResults = loaders.TwoWayLookupAndMerge(cubesAsLeaves)
            const [treeStatuses, err] = await mergResults
            if (err) {
                console.error(`Error in TwoWayLookupAndMerge: ${err}`)
                return [result, err]
            }
            // we should have a treeStatus for each cube in the rawChain. 
            if (treeStatuses.length !== rawChain.length) {
                const err = new Error(`Unexpected treeStatuses length from TwoWayLookupAndMerge. Expected ${rawChain.length} but got ${treeStatuses.length}`)
                console.error(err)
                return [result, err]
            }
            // we should check if any of the treeStatuses are found and are leaves. If so, then we can't reserve this property. 
            // if it's a problem, and we reserved the leaf but can't to the rest then
            // delete the leaf, if it's our and try again.
            // we can also check if the leaf is reserved by us, and if so then we can just delete it and try again.
            // for (const ts of treeStatuses) {
            //     if (ts.found) {
            //         // const err = new Error(`Cannot reserve property ${result.startingProperties[0]} because parent ${ts.name} is already a leaf.`)
            //         // keep going and deal with it later?  return [result, err]
            //         // And, how do we not know if these are parents? 
            //         // TwoWayLookupAndMerge says checking for -[0-7] is a hack and screw you.
            //         const leafNodeMatch = ts.name.match(/-([0-7])$/) // check for -[0-7] it has no ".vr" or "_vr" at this point.
            //         if (leafNodeMatch !== null) {
            //             // it's a parent. 
            //             ts.isParent = true
            //         }
            //     }
            //     // console.log(`Tree status for ${ts.name}: found=${ts.found}, isParent=${ts.isParent}, wasXYZ=${ts.wasXYZ}`)
            // }
        }
        return [result, null]
    }


    // PrepareTheLists assumes VerifyReservePropertyBatch has passed
    // it's going to check for what's already reserved in the various dns servers and prepare the lists of what we will actually need to reserve.
    async PrepareTheLists(result: ReserveResult): Promise<[ReserveResult, Error | null]> {

        const cubeSet = new Map<string, oct.Cube>()
        for (const rawList of result.rawChains) {
            for (const cube of rawList) {
                cubeSet.set(oct.CubeToString(cube)[0], cube)
            }
        }
        console.log("All cubes we will need to reserve:", Array.from(cubeSet.keys())) // from all the chains from all the starting properties. 
        // it dedupes the parents.
        const cubeArray = Array.from(cubeSet.values())

        // a big fat lookup.
        const [mergeResults, e] = await loaders.TwoWayLookupAndMerge(cubeArray)
        if (e) {
            const err = new Error(`Error during TwoWayLookupAndMerge: ${e.message}`)
            console.error(err)
            return [result, err]
        }
        // subtract the ones we already have from the ones we need to reserve.
        for (let i = 0; i < mergeResults.length; i++) {
            const ts = mergeResults[i]
            if (!ts.cube) {
                const err = new Error(`Error: When does this happen? ${ts.name}`)
                console.error(err)
                return [result, err]
            }
            if (ts.found && ts.cube) {

                let existor: ThingsThatAlreadyExistType = {
                    cube: ts.cube,
                    wasXYZ: ts.wasXYZ,
                    weOwnIt: false
                }
                // we MUST check ownership now. 
                // do we have creds? yes. in the surrounding class 
                // should we just check the leaves? If the parents exist then that's fine,
                // someone else did the work so, great. But if the leaf exists then we can't reserve it without checking.
                // is parent is useless. 
                const leafNodeMatch = ts.name.match(/-([0-7])$/)
                if (leafNodeMatch !== null) { // it's a leaf
                    // lol what's the match in leafNodeMatch
                    // console.log(`leafNodeMatch: ${leafNodeMatch[0]}`) eg "-5"
                    ts.isParent = true
                } else {
                    const sliced = ts.name.slice(-2, -1)
                    if (sliced === "-") { // it's a leaf
                        ts.isParent = true // Which is better? Faster?
                    }
                }
                if ((!ts.isParent) && (!ts.wasXYZ)) { // it's a leaf, from .vr. We can't know ownership of .xyz

                    console.log(`Checking ownership of ${ts.name} is parent ${ts.isParent}  (wasXYZ: ${ts.wasXYZ})`)

                    const leafName = ts.name + "_vr"
                    try {

                        let [res, err] = await names.sendNameserviceCommandHarder("exists ", leafName, { pubk: this.pubk, priv: this.priv })
                        if (err) {
                            console.error("Error checking if name exists:", err)
                        } else {
                            // console.log("exists sendNameserviceCommand", res)
                            const existsObj = JSON.parse(res) as names.LookupNameExistsReturnType
                            if (existsObj.Exists && existsObj.Owner === this.pubk) {
                                // we own it, so we can reserve it again.
                                existor.weOwnIt = true
                            } else if (!existsObj.Exists) {
                                // it doesn't exist, so we can reserve it.
                                existor.weOwnIt = false
                            } else {
                                // it exists and we don't own it, so we can't reserve it.
                                // We'll worry about this later.
                                // console.log(`Cannot reserve ${leafName} because it already exists and is owned by someone else.`)
                            }
                        }
                    } catch (e) {
                        console.error("Error PrepareTheLists checking ownership of leaf:", e)
                    }
                    if (existor.weOwnIt) {
                        result.leavesWeOwn.push(existor)
                    }
                }
                result.thingsThatAlreadyExist.push(existor)
            }
        }
        // that was fun.
        console.log("Things that already exist:", result.thingsThatAlreadyExist.map(t => t.cube ? oct.CubeToString(t.cube)[0] : "unknown"))
        // subtract it from the stuff we'd need to buy and that gives us the stuff we actually need to reserve.
        // subtract from the cubeSet.
        for (const existing of result.thingsThatAlreadyExist) {
            cubeSet.delete(oct.CubeToString(existing.cube)[0])
        }
        // result.thingsToActuallyReserve = Array.from(cubeSet.values())
        for (const cube of cubeSet.values()) {
            const item: ThingsThatAlreadyExistType = {
                cube: cube,
                wasXYZ: false,
                weOwnIt: false // do this later?
            }
            result.thingsToActuallyReserve.push(item)
        }

        console.log("Things we actually need to reserve:", result.thingsToActuallyReserve.map(t => t.cube ? oct.CubeToString(t.cube)[0] : "unknown"))
        // looks good. We have the list of things we actually need to reserve, and the list of things that already exist. We can use this to show the user what they are about to reserve, and what they already have.

        // the thing is.. if we own them we may wish to reserve them again. If we don't own them, then we can't reserve them again. So we need to check ownership.
        // for (const cube of cubeSet.values()) {
        //     let res = await names.sendNameserviceCommand("exists ", oct.CubeToString(cube)[0], { pubk: this.pubk, priv: this.priv })
        //     console.log("exists get-unix-time", res)
        //     const existsObj = JSON.parse(res) as names.LookupNameExistsReturnType
        //     if (existsObj.Exists && existsObj.Owner === this.pubk) {
        //         // we own it, so we can reserve it again.
        //         result.thingsToActuallyReserve.push({ cube, wasXYZ: false, weOwnIt: true })
        //     } else if (!existsObj.Exists) {
        //         // it doesn't exist, so we can reserve it.
        //         result.thingsToActuallyReserve.push({ cube, wasXYZ: false, weOwnIt: false })
        //     } else {
        //         // it exists and we don't own it, so we can't reserve it.
        //         console.log(`Cannot reserve ${oct.CubeToString(cube)[0]} because it already exists and is owned by someone else.`)
        //     }
        // }

        return [result, null]
    }
}



export function GetTheKeys(): [[string, string], string, Error | null] {

    const passPhrase = process.env.PRIVATE_KNOTFREE_PASSPHRASE || "failed";
    let bigKnotfreeToken = process.env.BIG_KNOTFREE_TOKEN || "failed";
    let [pubk, priv]: [string, string] = ["", ""]

    if (passPhrase.length < 25) {
        console.error("Passphrase is too short. Please set the PRIVATE_KNOTFREE_PASSPHRASE environment variable to a legit value.")

        return [["", ""], "", new Error("Passphrase is too short. Please set the PRIVATE_KNOTFREE_PASSPHRASE environment variable to a legit value.")]
    }
    if (bigKnotfreeToken.length < 128) {
        console.error("Big knotfree token is too short. Please set the BIG_KNOTFREE_TOKEN environment variable to a real value.")

        return [["", ""], "", new Error("Big knotfree token is too short. Please set the BIG_KNOTFREE_TOKEN environment variable to a real value.")]
    }

    console.log()
    // assumes it's 16 !!! 
    if (passPhrase.length < 16) {
        console.error("Passphrase is too short. You need at least 16 characters. Please set the PRIVATE_KNOTFREE_PASSPHRASE environment variable to a real value.")
        return [["", ""], "", new Error("Passphrase is too short. Please set the PRIVATE_KNOTFREE_PASSPHRASE environment variable to a real value.")]
    }
    console.log(`Have Passphrase: ${passPhrase.slice(0, 8)}...${passPhrase.slice(-8)}`);
    // eg atw-domain-secret-wheel...
    console.log()
    console.log(`Have Big Private Token: ${bigKnotfreeToken.slice(0, 16)}...${bigKnotfreeToken.slice(-16)}`);
    // eg eyJhbGciOi...
    console.log()

    const keypair = utils.getBoxKeyPairFromPassphrase(passPhrase)

    const keyPairBase64 = utils.KeypairToBase64(keypair)
    pubk = keyPairBase64[0]
    priv = keyPairBase64[1]
    console.log("pubk", pubk)
    console.log("priv", priv)

    // we should take apart the token and check that the pubk in the token matches the pubk we just generated from the passphrase. Just to be sure.
    // it will not be possible to change it and re-sign the jwtid token.
    const tokenParts = bigKnotfreeToken.split('.')
    if (tokenParts.length !== 3) {
        console.error("Invalid big knotfree token format. Expected three parts separated by dots.")
        return [["", ""], "", new Error("Invalid big knotfree token format. Expected three parts separated by dots.")]
    }
    const payload = tokenParts[1]
    let decodedPayload: string
    try {
        decodedPayload = Buffer.from(payload, 'base64').toString('utf-8')
    } catch (e) {
        console.error("Failed to decode big knotfree token payload:", e)
        return [["", ""], "", new Error("Failed to decode big knotfree token payload")]
    }
    let payloadObj: any
    try {
        payloadObj = JSON.parse(decodedPayload)
    } catch (e) {
        console.error("Failed to parse big knotfree token payload as JSON:", e)
        return [["", ""], "", new Error("Failed to parse big knotfree token payload as JSON")]
    }
    if (payloadObj.pubk !== pubk) {
        console.error("Public key in the big knotfree token does not match the public key derived from the passphrase. Please check your environment variables.")
        return [["", ""], "", new Error("Public key in the big knotfree token does not match the public key derived from the passphrase. Please check your environment variables.")]
    }
    console.log("Public key in the big knotfree token matches the public key derived from the passphrase. Good to go. Yay.")
    console.log()

    return [[pubk, priv], bigKnotfreeToken, null]
}


async function askQuestion(q: string): Promise<string> {
    // Create the interface link to standard I/O
    const rl = readline.createInterface({ input, output });
    try {
        // Prompt the user and wait for their answer
        const answer = await rl.question(q);
        return answer;
    } finally {
        // Always close the interface to release the terminal stream
        rl.close();
    }
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
