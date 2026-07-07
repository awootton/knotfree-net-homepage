
import * as THREE from 'three';

import { CacheIntf } from './CacheIntf';
import * as oct from './UrlOctTree'
import { error } from 'console';

// import * as octload from './OctTreeLoaders'
import * as utils from './utils';
// import { BatchFetchAndMergeControllerSlowest } from './BatchFetchAndMergeController';
import * as fetchAndMerge from './BatchFetchAndMergeController'
import * as loaders from './OctTreeLoaders'
import * as dnstypes from './DnsTypes'
import { truncate } from 'fs/promises';


// BuildVisibleTreeStatus aka bvts in the logs.
export class BuildVisibleTreeStatus {

    cubeCache: CacheIntf
    minRatioToBeVisible = 0
    // We should calculate this based on the camera FOV and the size of the cubes at each level. 
    // Later, at render time we should check if the cubes are actually in the frustum and if not, we can skip rendering them.

    // this is what we're trying to build.
    public showingLeaves: Map<string, oct.TreeStatus>

    // 2. Constructor to initialize properties
    constructor(cubeCache: CacheIntf) {
        this.cubeCache = cubeCache;
        this.showingLeaves = new Map<string, oct.TreeStatus>();
        const degrees = 0.5
        const angle = degrees * Math.PI / 180 // convert degrees to radians
        this.minRatioToBeVisible = Math.atan(angle) // a ratio.
    }

    // 3. Methods
    // we'll do this better with frustrum later, but for now we'll just say a cube is visible if it's within some distance of the camera.
    // a lot fluffier than I expected but should run out of the cache and be really fast after the first run.

    public async buildSubTree(tree: oct.TreeStatus, cameraPos: THREE.Vector3, depth: number): Promise<Error | null> {

        // console.log("BuildVisibleTreeStatus building level ", tree.cube.p)

        if (depth < -16) { // we screwed up.
            // we could go down to 2^-16 meter.
            // more than just a big world. A universe of atoms.
            console.log("bvts min depth reached, stopping recursion.")
            return null
        }

        // if (tree.cube.p <= 7) {
        //     console.log("bvts buildSubTree hit .")
        // }

        // let debugHere = false
        // if ( tree.name === "testmain-0n0u0e7p-0") {
        //     console.log("wait a minute:)")
        //     debugHere = true
        // }

        // in the current example testmain-0n0u0e16p-0 is the tree and it has it's child bits.
        // if this is testmain-0n0u0e16p-0, for instance, we know there's no leaf at this level but the zeroth node exists.
        // does it have the child bits set? if not we need to look it up and set that array.
        // didn't we just do this? Can we delete this?
        if (tree.childrenBits === -1) {
            const [childBits, err] = await calcChildrenBits(tree.cube, tree.name, tree.childrenBits);
            tree.childrenBits = childBits;
            if (err) {
                console.error("bvts Error calculating children bits for tree ", tree.name, err)
                return err
            }
        }
        // console.log(oct.DisplayChildBits(tree.childrenBits, tree.name))
        // // now we should have the children array filled in for this treeStatus. We can use that to recurse down to the visible children.
        const baseCube = oct.GetChildCube(tree.cube, -1) // the cube of the treeStatus is the base cube for the children. We can get the child cubes from that and the index.
        for (let i = 0; i < 8; i++) {
            // check the child first. I don't care about extra parents
            if (oct.ChildExists(tree.childrenBits, i)) { // if there's a leaf node here.
                // the child is a child of the base cube of this treeStatus, not the subtree cube. 
                // So we can just get it from the base cube and the index.
                let aCube = oct.GetChildCube(baseCube, i)
                const visible = this.isCubeVisible(aCube, cameraPos)
                if (visible) {
                    const childKey = oct.CubeToString(aCube)[0] // and it's visible.
                    let childStatus = this.cubeCache.get(childKey)
                    if (!childStatus) {
                        // eg 'testmain-0n0u0e5p'
                        // we know it exists. Let's just fake it
                        const fakeStatus: oct.TreeStatus = {
                            name: childKey,
                            cube: aCube,
                            found: true,
                            level: aCube.p,
                            isParent: false,
                            wasXYZ: oct.IsXyz(tree.childrenBits, i),
                            childrenBits: -1,
                            error: null,
                            addresses: []
                        }
                        // we should look up the children bits, but we don't care about that because it's a leaf.
                        // console.log("bvts Error: childStatus not found in cache for child that exists and is visible. ", oct.CubeToString(aCube)[0])
                        // return new Error("bvts Error: childStatus not found in cache for child that exists and is visible. " + oct.CubeToString(aCube)[0])
                        this.cubeCache.set(childKey, fakeStatus) // optionally add the fake status to the cache
                        childStatus = fakeStatus
                    }
                    this.showingLeaves.set(childKey, childStatus)
                    // ok console.log("showing leaf tree, adding to showingLeaves ", childKey)
                }
            } else if (oct.IsParent(tree.childrenBits, i)) { // if exists
                // we might recurse into this.
                let aCube = oct.GetChildCube(tree.cube, i)
                const visible = this.isCubeVisible(aCube, cameraPos) // if exists and is visible.
                if (visible) {
                    // recurse on the subtree 
                    const subKeyCube = { ...aCube, whichParent: i } as oct.Cube
                    const subTreeKey = oct.CubeToString(subKeyCube)[0] // eg testmain-0n0u0e15p-0 
                    // the existance of 16-p-0 implies there's a subtree here before we even look up anything. 

                    // if (subTreeKey === "testmain-0n0u2w4p-0") {
                    //     console.log("bvts buildSubTree hit testmain-0n0u2w4p-0, which is a known parent. This is a good sign. We should see this in the logs and it should not cause any errors. If we don't see this in the logs, or if it causes an error, then something is wrong with our tree traversal logic.")
                    // }

                    // if we've been here before then subTreeKey is in the cache and knows the bits
                    let subTreeStatus = this.cubeCache.get(subTreeKey)
                    // else let's just calc the childbits for it right now and that will load it.
                    if (subTreeStatus == undefined || subTreeStatus?.childrenBits === -1) {
                        const [childBits, childErr] = await calcChildrenBits(subKeyCube, subTreeKey, -1) // 
                        if (childErr) {
                            console.error("bvts Error: failed to calculate child bits for subtree ", subTreeKey, childErr);
                            return childErr;
                        }
                        // console.log(oct.DisplayChildBits(childBits, subTreeKey))

                        // there really should be some freaking children here unless the existance of the //  
                        subTreeStatus = this.cubeCache.get(subTreeKey)
                        // the calc of the children bits doesn't mean we loaded that parent yet. But, we'll need it.
                        // to hold the child bits. So, if we don't have it, let's just make one.
                        if (!subTreeStatus) {
                            // console.error("bvts Error: subTreeStatus not found in cache for child that is a parent and is visible. ", subTreeKey)
                            // return new Error("bvts Error: subTreeStatus not found in cache for child that is a parent and is visible. " + subTreeKey)
                            // if we know that much about it then just fake it.
                            const fakeStatus: oct.TreeStatus = {
                                name: subTreeKey,
                                cube: subKeyCube,
                                found: true,
                                level: subKeyCube.p,
                                isParent: true,
                                wasXYZ: oct.IsXyz(tree.childrenBits, i),
                                childrenBits: childBits,
                                error: null,
                                addresses: []
                            }
                            subTreeStatus = fakeStatus
                        }
                        // and, we know it's childBits already.
                        subTreeStatus.childrenBits = childBits
                    }

                    // The one from inside buildSubTree
                    const got = this.buildSubTree(subTreeStatus, cameraPos, depth - 1) // recurse !!! 
                    const err = await got
                    // console.log("got from buildSubTree for ", subTreeKey, ": ", err)
                    if (err) {
                        console.error("bvts Error in buildSubTree for child that is a parent and is visible. ", subTreeKey, err)
                        return err
                    }
                } // if it's not visible then we don't care.
            } else {
                // nothing.
            }
        } // for each of the 8 children.
        return null
    }

    // this had to go live outside of the class so other people can play with it. 
    // // The calcChildrenBits of testmain-0n0u1w7p-4 are actually the bits of the 4th subspace of 
    // //  the 7p, which are all 6p's 
    // //  if we want to check for leaves they would be the 8 subcubes of the 6p, which would be 5p's.
    // //  we favor the children so it's not a problem.
    // public async calcChildrenBits(cube: oct.Cube, Xname: string, previousBits: number): Promise<[number, Error | null]> {

    //     if (previousBits === -1) {

    //         // just check the cache first. We may have to clear the cache if we 
    //         const aCachedEntry: oct.ChildBitsCacheEntry | null = oct.GetChildBitsCache(Xname)
    //         if (aCachedEntry !== null) {
    //             return [aCachedEntry.childrenBits, null]
    //         }


    //         const originalCube = cube
    //         if (originalCube.p <= 8) {
    //             //  console.log("bvts calcChildrenBits hit testmain-0n0u1w16p-4, which is a known parent. This is a good sign. We should see this in the logs and it should not cause any errors. If we don't see this in the logs, or if it causes an error, then something is wrong with our tree traversal logic.")
    //         }

    //         if (cube.whichParent !== undefined) {
    //             cube = oct.GetChildCube(cube, -1) // the space we care about.
    //         }
    //         // we're getting the child bits for this space, not a name with a dash.

    //         // look it up and update the cache and the treeStatus
    //         // we have to also look up the 8 subtreees numbered 0-7 and then also check for the existence 
    //         // of the 8 children possible. We want to cache the found ones but a zero bit in the childrenBits is enouggh to know that it's not there, so we don't have to cache the not found ones. 
    //         // We should only have one or the other, not both, but we should check for both just in case because evil exists.

    //         // console.log("bvts calculating children bits for tree ", name)
    //         const name2indexMap = new Map<string, number>()
    //         const needToLookUp: oct.Cube[] = []

    //         // nodes first
    //         const nodesList: (oct.TreeStatus)[] = new Array(8) // where a 'node' is a parent that has children, and a 'leaf' is a child that has no children. 

    //         // we'll cheat and generate the names.
    //         const spacename = oct.CubeToString(cube)[0]
    //         for (let i = 0; i < 8; i++) {
    //             const nodename = spacename + "-" + i // this is the naming convention for the subtrees. It's a bit gross but it works.
    //             // console.log("bvts checking cache nodename ", nodename)
    //             name2indexMap.set(nodename, i)
    //             const tmp = this.cubeCache.get(nodename)
    //             if (!tmp) {
    //                 const acube = oct.StringToCube(nodename)[0] // todo: check err
    //                 needToLookUp.push(acube)
    //             } else {
    //                 nodesList[i] = tmp
    //             }
    //         }
    //         const leavesList: (oct.TreeStatus)[] = new Array(8)
    //         for (let i = 0; i < 8; i++) {
    //             const childCube = oct.GetChildCube(cube, i)
    //             const childKey = oct.CubeToString(childCube)[0] // check error
    //             name2indexMap.set(childKey, i)
    //             const tmp = this.cubeCache.get(childKey)
    //             if (!tmp) {
    //                 needToLookUp.push(childCube)
    //             } else {
    //                 leavesList[i] = tmp
    //             }
    //         }

    //         let result: [oct.TreeStatus[], Error | null]

    //         if (needToLookUp.length === 0) {
    //             console.log("bvts Error: no children to look up but we thought we needed to look up children. ", Xname)
    //             result = [[], null]
    //         } else {
    //             // console.log("bvts merged list of children we need to look up for tree ", ": ", needToLookUp.map(c => oct.CubeToUrlString(c)[0]))
    //             result = await loaders.TwoWayLookupAndMerge(needToLookUp)
    //             if (result instanceof Error) {
    //                 console.error("bvts Error in TwoWayLookupAndMerge: ", result)
    //                 return [-1, result]
    //             }
    //         }
    //         // now we have to merge this into two arrays, one for the leaves and one for the nodes, and also update the cache with the new treeStatuses.
    //         // and not with the damn cache. 
    //         // console.log("bvts got tree statuses for children of ", name, ": ", result[0].map(ts => ts.name))
    //         // now we walk the results and fill in the two array.
    //         // There should be no holes when we're done.
    //         for (let i = 0; i < result[0].length; i++) {
    //             const treeStatus = result[0][i]
    //             // const treeStatiusName = treeStatus.name
    //             const index = name2indexMap.get(treeStatus.name)
    //             if (index === undefined) {
    //                 // some of these will never happen.
    //                 console.error("bvts Error: treeStatus name not found in name2indexMap: ", treeStatus.name)
    //                 return [-1, new Error(`bvts Error: treeStatus name not found in name2indexMap: ${treeStatus.name}`)]
    //             }
    //             // how do we know if it's a parent. TwoWayLookupAndMerge can't tell
    //             // test if childKey ends in '-' and then 0..7 gross.
    //             const endsWithHyphenDigit = /-[0-7]$/.test(treeStatus.name) // not happy with this technique.    
    //             treeStatus.isParent = endsWithHyphenDigit
    //             if (treeStatus.isParent) {
    //                 nodesList[index] = treeStatus
    //             } else {
    //                 leavesList[index] = treeStatus
    //             }
    //         }

    //         // console.log("bvts final leavesList for ", Xname, ": ", leavesList.map(ts => ts ? ts.name + (ts.found ? " (found)" : " (not found)") : "undefined"))
    //         // console.log("bvts final nodesList for ", Xname, ": ", nodesList.map(ts => ts ? ts.name + (ts.found ? " (found)" : " (not found)") : "undefined"))
    //         if (originalCube.p <= 8) {
    //             //  console.log("bvts calcChildrenBits hit testmain-0n0u1w16p-4, which is a known parent. This is a good sign. We should see this in the logs and it should not cause any errors. If we don't see this in the logs, or if it causes an error, then something is wrong with our tree traversal logic.")
    //         }

    //         // and form the children array for the parent treeStatus
    //         let madeChildBits = 0//: { exists: boolean, isParent: boolean }[] = []
    //         for (let i = 0; i < 8; i++) {

    //             const child = leavesList[i]
    //             const node = nodesList[i]
    //             // don't cache the not found because we're never coming back here again unless the cache clears.
    //             // this is where we blow up when the fetch fails and the whole react fails.
    //             if (!child || !node) {
    //                 return [-1, new Error(`bvts Error: child or node missing for index ${i}`)]
    //             }
    //             if (child.found) {
    //                 this.cubeCache.set(child.name, child)
    //             }
    //             if (node.found) {
    //                 this.cubeCache.set(node.name, node)
    //             }
    //             if (child.found && node.found) {
    //                 // console.error("bvts Error: both child and node found for index ", i, " child: ", child.name, " node: ", node.name)
    //                 // pick the child later.
    //                 madeChildBits = oct.SetChildExists(madeChildBits, i, true)
    //                 madeChildBits = oct.SetIsParent(madeChildBits, i, true)
    //             } else if (child.found) {
    //                 madeChildBits = oct.SetChildExists(madeChildBits, i, true)
    //                 madeChildBits = oct.SetIsParent(madeChildBits, i, false)
    //             } else if (node.found) {
    //                 madeChildBits = oct.SetChildExists(madeChildBits, i, false)
    //                 madeChildBits = oct.SetIsParent(madeChildBits, i, true)
    //             } else {
    //                 // redundant to set these to false because madeChildBits starts at 0, but we'll do it for clarity.
    //                 madeChildBits = oct.SetChildExists(madeChildBits, i, false)
    //                 madeChildBits = oct.SetIsParent(madeChildBits, i, false)
    //             }
    //         }

    //         if (originalCube.p <= 8) {
    //             //  console.log("bvts calcChildrenBits hit testmain-0n0u1w16p-4, which is a known parent. This is a good sign. We should see this in the logs and it should not cause any errors. If we don't see this in the logs, or if it causes an error, then something is wrong with our tree traversal logic.")
    //         }

    //         // console.log("bvts cache is now: ", Array.from(oct.gCubeCache.entries()).map(e => e[0] + ": " + (e[1].found ? "found" : "not found")).join(", "))

    //         // console.log("children array we made: ", madeChildBits.toString(16), "for parent ", name)
    //         // let's hope we don't have to do this again for a long time.
    //         return [madeChildBits, null]
    //     }
    //     return [previousBits, null]
    // }

    public async BuildVisibleTree(worldName: string, cameraPos: THREE.Vector3): Promise<Error | null> {

        this.showingLeaves.clear()
        // generate the 8 octants.
        // We will see if they exist before we look for their names and cache them
        const baseOctantLevel = 16 // this is the level of the octants that we generate at. We could make this smaller or larger depending on how much we want to do in this function vs how much we want to do in the recursion. If we make it smaller, we'll have more octants and more recursion. If we make it larger, we'll have fewer octants and less recursion. We should experiment with this to find the sweet spot.
        const octants: { name: string, cube: oct.Cube }[] = []
        // I'm not sure if these are in the right order.  
        // Maybe just generate the names and then get the cubes from the names?
        let index = 0
        for (let z = 0; z >= -1; z--) {
            for (let y = 0; y >= -1; y--) {
                for (let x = 0; x >= -1; x--) {
                    const a0: oct.Cube = {
                        world: worldName,
                        x: x * 2 ** baseOctantLevel,
                        y: y * 2 ** baseOctantLevel,
                        z: z * 2 ** baseOctantLevel,
                        p: baseOctantLevel,
                        whichParent: index
                    }
                    const [s, err] = oct.CubeToString(a0)
                    if (err) {
                        console.error("Error generating URL string for cube: ", err)
                        continue
                    }
                    octants.push({ name: s, cube: a0 })
                    index++
                }
            }
        } // end gen 8 octants
        const octantNames = octants.map(o => oct.CubeToString(o.cube)[0])
        // console.log("Generated octant names: ", octantNames)
        // I'm not sure that the stupid -n suffixes on these make sense but they are correct! 

        // We shall build this. it will be in the cache. 
        // We just need to check if it's visible and if so, recurse into it.
        const octantList: oct.TreeStatus[] = new Array(8)

        // I know that testmain-0n0u0e16p-0, exists, for instance. 
        // and 'testmain-0n0u1w16p-4' exists. We need the names to match.
        // fill the cache. Including the not found. This is just for the top level.
        const getMe = []
        let i = 0
        for (const octant of octants) {
            let treeStatus = this.cubeCache.get(octant.name)
            if (!treeStatus) {
                getMe.push(octant.cube)
            } else {
                octantList[i] = treeStatus
            }
            i++
        }
        // get all the missing ones in one batch.
        if (getMe.length > 0) {
            let result = [] as oct.TreeStatus[]
            // show me the getMe so I can make a test elsewhere:  
            // console.log("BuildVisibleTree about to call TwoWayLookupAndMerge for octants. getMe: ", JSON.stringify(getMe, null, 2))
            const tmp = await loaders.TwoWayLookupAndMerge(getMe)
            if (tmp instanceof Error) {
                console.error("Error in TwoWayLookupAndMerge: ", tmp)
                return tmp
            } else {
                result = tmp[0]
            }
            // you know, the getMe.length and the result.length should match. If they don't, something is very wrong.
            if (getMe.length !== result.length) {
                console.error("Error: getMe length does not match result length. ", getMe.length, result.length)
                return new Error(`Error: getMe length does not match result length. GetMe length: ${getMe.length}, result length: ${result.length}`)
            }
            for (const treeStatus of result) {
                treeStatus.isParent = true // we just say so.
                this.cubeCache.set(treeStatus.name, treeStatus)
                const lastChar = treeStatus.name[treeStatus.name.length - 1]
                const index = parseInt(lastChar)
                if (isNaN(index) || index < 0 || index > 7) {
                    console.error("Error: invalid treeStatus name format, cannot extract index. ", treeStatus.name)
                    return new Error(`Error: invalid treeStatus name format, cannot extract index. Name: ${treeStatus.name}`)
                }
                octantList[index] = treeStatus
            }
            // boom baby
            // console.log("got tree statuses for octants: ", octantList.map(ts => ts.name))
        }
        // let's go over them again. fill stuff in.
        for (const tree of octantList) {
            if (tree.found) {
                if (tree.childrenBits === -1) { // needs init.
                    const [newBits, err] = await calcChildrenBits(tree.cube, tree.name, tree.childrenBits)
                    if (err) {
                        console.error("Error calculating children bits for tree ", tree.name, err)
                        return err
                    }
                    tree.childrenBits = newBits
                }
            }
        }
        // are we good up to here?
        // does the octantList have all it's child bits?
        // console.log("octantList after calcChildrenBits: ", octantList.map(ts => ({ name: ts.name, found: ts.found, childrenBits: ts.childrenBits.toString(16) })))
        // for each of the 8 calc their child bits and recurse.
        for (let i = 0; i < octantList.length; i++) {
            if (!octantList[i]) {
                console.error("Error: octantList has undefined entry at index ", i)
                return new Error(`Error: octantList has undefined entry at index ${i}`)
            }
            const treeStatus = octantList[i]
            if (treeStatus.found) {
                // that's a whole octant. 
                // we need to walk through the subtrees.
                for (let j = 0; j < 8; j++) {
                    if (oct.IsParent(treeStatus.childrenBits, j)) {
                        const subTreeCube = oct.GetChildCube(treeStatus.cube, j)
                        const subTreeKey = oct.CubeToString({ ...subTreeCube, whichParent: j })[0]

                        // it's 'testmain-0n0u0e15p-0' it should be in the cache when we get there. 
                        // how did we know there's a child here? Because the child bits say it's a parent. How.
                        // We will find out more about it when we recurse into it.
                        let subTreeStatus = this.cubeCache.get(subTreeKey) //  
                        if (!subTreeStatus) {
                            const [childBits, err2] = await calcChildrenBits(subTreeCube, subTreeKey, -1) // always.
                            if (err2) {
                                console.error("bvts Error calculating children bits for subtree ", subTreeKey, err2)
                                return err2
                            }
                            subTreeStatus = this.cubeCache.get(subTreeKey) // calcChildrenBits will have cached it
                            if (!subTreeStatus) {
                                console.error("bvts Error: subTreeStatus not found in cache for child that is a parent and is visible. ", subTreeKey)
                                return new Error("bvts Error: subTreeStatus not found in cache for child that is a parent and is visible. " + subTreeKey)
                            }
                            subTreeStatus.childrenBits = childBits
                        }
                        // recurse from an octant into its child subtree. This will walk down the tree until it hits the leaves and fill in the showingLeaves map with the visible leaves.
                        // the first one from BuildVisibleTree, level is 0
                        const errP = this.buildSubTree(subTreeStatus, cameraPos, baseOctantLevel)
                        const err = await errP
                        if (err) {
                            console.error("bvts Error in buildSubTree: ", err)
                            return err
                        }
                    } else if (oct.ChildExists(treeStatus.childrenBits, j)) {
                        const childCube = oct.GetChildCube(treeStatus.cube, j)
                        const childKey = oct.CubeToString(childCube)[0]
                        const childStatus = this.cubeCache.get(childKey)
                        if (!childStatus) {
                            console.error("bvts Error: childStatus not found in cache for child that exists and is visible. ", oct.CubeToString(childCube)[0])
                            return new Error("bvts Error: childStatus not found in cache for child that exists and is visible. " + oct.CubeToString(childCube)[0])
                        }
                        if (this.isCubeVisible(childCube, cameraPos)) {
                            this.showingLeaves.set(childKey, childStatus)
                            console.log("showing leaf tree ", childKey)
                        }
                    } else {
                        // nothing, empty space.
                    }
                }
            }
        }

        // TODO: make into separate functions.
        // before we return, let's check if we need the TXT records.
        // dammit, we do. We need the groupId to know which ones belong together for rendering.
        // todo: make this a function.
        // when we do this we'll make a unique groupId for all leaves no matter what.
        const needGroupIdLookup: oct.TreeStatus[] = []
        for (const [key, treeStatus] of this.showingLeaves) {
            // check the cache for the groupId. If it's not there, we need to look it up.
            const akey = "meta_group_id." + treeStatus.name
            // if we're fully primed, or this is our second time here we'll have the groupId in the cache.
            const cachedEntry = oct.GetChildBitsCache(akey)
            if (cachedEntry && cachedEntry.TXT) {
                // we have the groupId in the cache. Let's fill it in.
                const groupObj = cachedEntry.TXT
                treeStatus.groupId = groupObj
            }
            if (treeStatus.groupId === undefined) {
                // we haven't looked it up yet. Let's look it up and fill in the groupId.
                needGroupIdLookup.push(treeStatus)
            }
        }
        if (needGroupIdLookup.length > 0) {

            const useBatchFetchAndMergeControllerInstead = false
            if (useBatchFetchAndMergeControllerInstead) {
                // no, delete me. We ALREADY did a merge. And the fetching them one by one was a 
                // bad idea in the first place.
                const cubes = needGroupIdLookup.map(ts => ts.cube)
                // this one is way too slow now that batches are working again.
                const frame = new fetchAndMerge.BatchFetchAndMergeControllerSlowest(cubes, "TXT", "meta_group_id")
                const [result, err] = await frame.TwoWayLookupAndMerge()
                if (err) {
                    console.error("bvts Error in BatchFetchAndMergeController for groupId lookup: ", err)
                    return err
                }

                // these should have their groupIds filled in now. We can check the cache for them.
                for (const treeStatus of result) {
                    const existingTree = this.cubeCache.get(treeStatus.name)
                    if (existingTree) {
                        existingTree.groupId = treeStatus.groupId
                        // do we have to put it back or can we just modify the existing object? I think we can just modify the existing object because it's a reference.
                        this.cubeCache.set(existingTree.name, existingTree)
                    } else {
                        console.error("bvts Error: treeStatus not found in cache for cube that has a groupId TXT record. ", treeStatus.name)
                    }
                }
                return null
            } else {

                console.log("bvts need groupId lookup for leaves: ", needGroupIdLookup.length)

                // These are the ones that need TXT records looked up separated by type.
                // I want to tell it I have a pretty good idea how long the list of listOfVrleaves will be
                // but I also just want to use push and not have to worry about the length. 
                // screw it. This doesn't happen often enough to matter.
                const listOfXyzleaves: oct.TreeStatus[] = []
                const listOfVrleaves: oct.TreeStatus[] = []
                for (const ts of needGroupIdLookup) {
                    if (!ts.wasXYZ) {
                        listOfVrleaves.push(ts)
                    } else {
                        listOfXyzleaves.push(ts)
                    }
                }
                // the names must look like this: "meta_group_id.testmain-0n0u0e16p-0.vr"

                if (listOfXyzleaves.length > 0) {
                    // I don't think I've seen this called. Beware. 
                    console.log("bvts need groupId lookup for xyz leaves: ", listOfXyzleaves.length)
                    let commaList = ""// = listOfXyzleaves.map(ts => ts.name).join(".xyz,")
                    for (let i = 0; i < listOfXyzleaves.length; i++) {
                        const ts = listOfXyzleaves[i]
                        commaList += "meta_group_id." + ts.name + ".xyz"
                        if (i < listOfXyzleaves.length - 1) {
                            commaList += ","
                        }
                    }

                    const isNative = false
                    const got: dnstypes.DnsResponse[] | Error = await dnstypes.FetchDnsResponseTryHard(commaList, "TXT", dnstypes.currentDnsServer, isNative, listOfXyzleaves.length)
                    if (got instanceof Error) {
                        console.error("bvts Error in FetchDnsResponseTryHard for groupId lookup xyz: ", got)
                        return got
                    }
                    // now we have the responses. We need to merge them into the treeStatuses.

                    for (let i = 0; i < got.length; i++) {
                        const response = got[i]
                        const ts = listOfXyzleaves[i]
                        // get it from the cache and fill in the groupId.
                        const answerText = dnstypes.GetAnswer(response)[1]
                        const tstmp = this.cubeCache.get(ts.name)
                        if (!tstmp) {
                            console.error("bvts Error: treeStatus not found in cache for cube that has a groupId TXT record. ", ts.name)
                            continue
                        }
                        fetchAndMerge.FillInTxtLogic(answerText, tstmp)
                        this.cubeCache.set(tstmp.name, tstmp) // back in the cache, as if that makes a difference. 
                        // put this in the child bits cache or else put the cubeCache in localStorage. TODO: atw
                        // now, the same for the .vs ones.
                        const key = "meta_group_id." + tstmp.name
                        // not a str. const groupstr = JSON.stringify({ grp: tstmp.groupId })
                        const groupEntry : oct.ChildBitsCacheEntry = {
                            name: key,
                            childrenBits: -1, // it's a child bits cache entry but we don't know the children bits. We just want to cache the groupId.    
                            TXT: tstmp.groupId, // cache the groupId in the TXT field
                            when: Date.now()
                        }
                        oct.SetChildBitsCacheEntry(key, groupEntry)
                    }
                }
                if (listOfVrleaves.length > 0) {
                    // this one happens all the time.
                    console.log("bvts need groupId lookup for vr leaves: ", listOfVrleaves.length)
                    let commaList = "" //= listOfVrleaves.map(ts => ts.name).join(",")
                    for (let i = 0; i < listOfVrleaves.length; i++) {
                        const ts = listOfVrleaves[i]
                        commaList += "meta_group_id." + ts.name + ".vr"
                        if (i < listOfVrleaves.length - 1) {
                            commaList += ","
                        }
                    }

                    const isNative = true
                    const got: dnstypes.DnsResponse[] | Error = await dnstypes.FetchDnsResponseTryHard(commaList, "TXT", dnstypes.currentDnsServer, isNative, listOfVrleaves.length)
                    if (got instanceof Error) {
                        console.error("bvts Error in FetchDnsResponseTryHard for groupId lookup vr: ", got)
                        return got
                    }
                    // now we have the responses. We need to merge them into the treeStatuses.

                    for (let i = 0; i < got.length; i++) {
                        const response = got[i]
                        const ts = listOfVrleaves[i]
                        // get it from the cache and fill in the groupId.
                        const answerText = dnstypes.GetAnswer(response)[1]
                        // console.log("bvts got answer for ", ts.name, ": ", answerText)
                        // topic not found errid=bvBbhJawYXIMWsxJOWHt is normal and common but not ALWAYS.
                        const tstmp = this.cubeCache.get(ts.name)
                        if (!tstmp) {
                            console.error("bvts Error: treeStatus not found in cache for cube that has a groupId TXT record. ", ts.name)
                            continue
                        }
                        fetchAndMerge.FillInTxtLogic(answerText, tstmp)
                        this.cubeCache.set(tstmp.name, tstmp) // back in the cache, as if that makes a difference. 
                        // put this in the child bits cache or else put the cubeCache in localStorage. TODO: atw

                        const key = "meta_group_id." + tstmp.name
                        // not a str const groupstr = JSON.stringify({ grp: tstmp.groupId })
                        const groupEntry : oct.ChildBitsCacheEntry = {
                            name: key,
                            childrenBits: -1, // it's a child bits cache entry but we don't know the children bits. We just want to cache the groupId.    
                            TXT: tstmp.groupId, // cache the groupId in the TXT field
                            when: Date.now()
                        }
                        oct.SetChildBitsCacheEntry(key, groupEntry)
                    }
                }
            }

            // if (false) { where did twoWayLookupPart1 go, anyway? 
            //     // no, bad design. We would be fetching stuff we already know we don't need because we just merged it.
            //     // a two way lookup ?? yep. Why are we doing the merge again here? 
            //     // this is a bad design. Fire the programmer.
            //     const a = octload.twoWayLookupPart1(needGroupIdLookup, "TXT", "meta_group_id")
            //     // this is a NOT merged result of the .vr and then .xyz lookups. 
            //     // totally annoying how this is hard to use.
            //     const result = await a
            //     // then the AI writes it and it's fluffy.

            //     let vrResponses: atwdns.DnsResponse[] = []
            //     let xyzResponses: atwdns.DnsResponse[] = []
            //     // for (const part of result)
            //     { // first the vr list and then the xyz list
            //         const settledVR = await result[0]
            //         if (settledVR.status === "fulfilled" && !(settledVR.value instanceof Error)) {
            //             // const answers = await settledVR.value
            //             vrResponses = settledVR.value as atwdns.DnsResponse[]
            //         } else {
            //             console.error("bvts Error in TwoWayLookupPart1 for groupId lookup: part promise rejected: ")
            //         }

            //         const settledXYZ = await result[1]
            //         if (settledXYZ.status === "fulfilled" && !(settledXYZ.value instanceof Error)) {
            //             // const answers = await settledXYZ.value
            //             xyzResponses = settledXYZ.value as atwdns.DnsResponse[]
            //         } else {
            //             console.error("bvts Error in TwoWayLookupPart1 for groupId lookup: part promise rejected: ")
            //         }
            //     }
            //     // do they have the same length?
            //     if (vrResponses.length !== xyzResponses.length) {
            //         console.error("bvts Error: VR and XYZ responses have different lengths in groupId lookup. VR length: ", vrResponses.length, " XYZ length: ", xyzResponses.length)
            //         // we can still try to merge them based on the names, but this is a sign that something is wrong.
            //         // no, we're screwed
            //         return new Error(`bvts Error: VR and XYZ responses have different lengths in groupId lookup. VR length: ${vrResponses.length}, XYZ length: ${xyzResponses.length}`)
            //     }
            //     // are they in order?
            //     for (let i = 0; i < vrResponses.length; i++) {
            //         const [vrName, vrType] = atwdns.GetQuestion(vrResponses[i])
            //         const [xyzName, xyzType] = atwdns.GetQuestion(xyzResponses[i])
            //         // console.log("VR response question: ", vrName, " type: ", vrType)
            //         // console.log("XYZ response question: ", xyzName, " type: ", xyzType)
            //         if (vrName !== xyzName.replace(".xyz", ".vr") || vrType !== xyzType) {
            //             console.error("bvts Error: VR and XYZ responses are not in the same order in groupId lookup. VR question: ", vrName, " type: ", vrType, " XYZ question: ", xyzName, " type: ", xyzType)
            //             // there's still the needGroupIdLookup array that we made and it should match
            //             // I just want to know. 
            //         }
            //         // yes, in order. The name is in the question
            //         const parts = vrName.split(".")
            //         let cubeName = ""
            //         if (parts.length > 2) {
            //             const cubePart = parts[1] // this should be the cube name. We can use this to match back to the treeStatus.
            //             cubeName = cubePart.replace(".vr", "") // remove the -vr suffix to get the cube name. This should match the names in needGroupIdLookup and the cache.
            //         } else {
            //             // can't find the name
            //             const [cubeNameFromUrl, err] = oct.CubeToString(needGroupIdLookup[i])
            //             cubeName = cubeNameFromUrl
            //         }
            //         const treeStatus = this.cubeCache.get(cubeName)
            //         if (!treeStatus) {
            //             console.error("bvts Error: treeStatus not found in cache for cube that has a groupId TXT record. ", cubeName)
            //             continue
            //         }
            //         const answer1 = atwdns.GetAnswer(vrResponses[i])[1] // eg '{"grp":"j9xK3mP8wL2z","dbg":"localhost:3010","type":"floor","asset":"cobblestonesgrok512.jpg:repeat:20"}'
            //         const answer2 = atwdns.GetAnswer(xyzResponses[i])[1] // eg ''
            //         // console.log("VR response answer: ", answer1)
            //         // console.log("XYZ response answer: ", answer2)
            //         let answer = answer1
            //         if (answer.length < answer2.length) {
            //             answer = answer2
            //         }
            //         try {
            //             const grp = JSON.parse(answer) as oct.GroupTextParameters
            //             if (grp.grp === undefined || grp.grp === "") {
            //                 grp.grp = utils.randomString(24)
            //             }
            //             treeStatus.groupId = grp
            //             this.cubeCache.set(treeStatus.name, treeStatus)
            //         } catch (err) {
            //             const defaultgrp = {
            //                 grp: utils.randomString(24) //
            //             } as oct.GroupTextParameters
            //             treeStatus.groupId = defaultgrp
            //             this.cubeCache.set(treeStatus.name, treeStatus)
            //         }
            //     }
            // }
        }
        return null
    }

    // TODO: make virtual and do fancier stuff with it later. For now, just a simple angle check.
    public isCubeVisible(cube: oct.Cube, cameraPos: THREE.Vector3) {

        // I'm going to calc the dist from the camera to the center of the cube and then make a ratio with the size of the cube 
        // and compare that to a desired ratio computed from a desired number of degrees.
        const halfCubeSize = 2 ** (cube.p - 1)
        const cubeCenter = new THREE.Vector3(cube.x + halfCubeSize, cube.y + halfCubeSize, cube.z + halfCubeSize)
        const difference = new THREE.Vector3().subVectors(cubeCenter, cameraPos)
        const distance = difference.length()

        const ratio = halfCubeSize / distance
        const isVis = ratio > this.minRatioToBeVisible
        if (!isVis) {
            // console.log(`cube ${oct.CubeToString(cube)[0]} is not visible. ratio: ${ratio}, distance: ${distance}, halfCubeSize: ${halfCubeSize}`)
        }
        return isVis

        // let closestX = Math.max(cube.x, Math.min(cameraPos.x, cube.x + 2 ** cube.p))
        // let closestY = Math.max(cube.y, Math.min(cameraPos.y, cube.y + 2 ** cube.p))
        // let closestZ = Math.max(cube.z, Math.min(cameraPos.z, cube.z + 2 ** cube.p))

        // let dx = closestX - cameraPos.x
        // let dy = closestY - cameraPos.y
        // let dz = closestZ - cameraPos.z

        // let dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
        // let width = 2 ** cube.p // the diagonal of the cube, which is the longest distance from the center to a corner. If we're within this distance, we should see at least part of the cube. We can adjust this with a multiplier if we want to be more or less aggressive about showing cubes.
        // const ratio = dist / width
        // const tan = Math.tan(angle) * 180 / Math.PI // convert to degrees
        // return tan > angle
    }
}

// calcChildrenBits doesn't live in the class anymore. It's isolated. 
// It's hard coded with oct.gCubeCache

// Example: The calcChildrenBits of testmain-0n0u1w7p-4 are actually the bits of the 4th subspace of 
//  the 7p, which are all 6p's 
//  if we want to check for leaves they would be the 8 subcubes of THAT 6p, which would be 5p's.
//  It's hard to think about sometimes.
export async function calcChildrenBits(cube: oct.Cube, Xname: string, previousBits: number): Promise<[number, Error | null]> {

    if (previousBits === -1) {

        const originalCube = cube
        if (originalCube.p <= 8) {
            //  console.log("bvts calcChildrenBits hit testmain-0n0u1w16p-4, which is a known parent. This is a good sign. We should see this in the logs and it should not cause any errors. If we don't see this in the logs, or if it causes an error, then something is wrong with our tree traversal logic.")
        }

        if (cube.whichParent !== undefined) {
            cube = oct.GetChildCube(cube, -1) // the space we care about.
        }
        // we're getting the child bits for this space, not a name with a dash.
        const spacename = oct.CubeToString(cube)[0]

        // if (false){ // test of the names we'll need later
        //     const name2indexMap = new Map<string, number>()
        //     const needToLookUp: oct.Cube[] = []

        //     // nodes first
        //     const nodesList: (oct.TreeStatus)[] = new Array(8) // where a 'node' is a parent that has children, and a 'leaf' is a child that has no children. 

        //     // we'll cheat and generate the names.
        //     for (let i = 0; i < 8; i++) {
        //         const nodename = spacename + "-" + i // this is the naming convention for the subtrees. It's a bit gross but it works.
        //         // console.log("bvts checking cache nodename ", nodename)
        //         name2indexMap.set(nodename, i)
        //         const tmp = oct.gCubeCache.get(nodename)
        //         if (!tmp) {
        //             const acube = oct.StringToCube(nodename)[0] // todo: check err
        //             needToLookUp.push(acube)
        //         } else {
        //             nodesList[i] = tmp
        //         }
        //     }
        //     const leavesList: (oct.TreeStatus)[] = new Array(8)
        //     for (let i = 0; i < 8; i++) {
        //         const childCube = oct.GetChildCube(cube, i)
        //         const childKey = oct.CubeToString(childCube)[0] // check error
        //         name2indexMap.set(childKey, i)
        //         const tmp = oct.gCubeCache.get(childKey)
        //         if (!tmp) {
        //             needToLookUp.push(childCube)
        //         } else {
        //             leavesList[i] = tmp
        //         }
        //     }
        //     console.log("bvts final leavesList for ", Xname, ": ", leavesList.map(ts => ts ? ts.name + (ts.found ? " (found)" : " (not found)") : "undefined"))
        //     console.log("bvts final nodesList for ", spacename, ": ", nodesList.map(ts => ts ? ts.name + (ts.found ? " (found)" : " (not found)") : "undefined"))
        // } // end test of the names we'll need later

        // just check the cache first. We may have to clear the cache if we 
        const aCachedEntry: oct.ChildBitsCacheEntry | null = oct.GetChildBitsCache(spacename)
        if (aCachedEntry !== null) {
            // we still have to look up the names of the existing items. Put them in the cache. 
            let tmp = Xname
            // I was going to say if tmp.substring(-2,-1) === "-", but whatever
            if (tmp.endsWith("-0") || tmp.endsWith("-1") || tmp.endsWith("-2") || tmp.endsWith("-3") || tmp.endsWith("-4") || tmp.endsWith("-5") || tmp.endsWith("-6") || tmp.endsWith("-7")) {
                tmp = tmp.substring(0, tmp.length - 2) // remove the -n suffix to get the parent name. 
            }
            DoNameLookupsForCachedChildBits(aCachedEntry, tmp)
            return [aCachedEntry.childrenBits, null]
        }

        // look it up and update the cache and the treeStatus
        // we have to also look up the 8 subtreees numbered 0-7 and then also check for the existence 
        // of the 8 children possible. We want to cache the found ones but a zero bit in the childrenBits is enouggh to know that it's not there, so we don't have to cache the not found ones. 
        // We should only have one or the other, not both, but we should check for both just in case because evil exists.

        // console.log("bvts calculating children bits for tree ", name)
        const name2indexMap = new Map<string, number>()
        const needToLookUp: oct.Cube[] = []

        // nodes first
        const nodesList: (oct.TreeStatus)[] = new Array(8) // where a 'node' is a parent that has children, and a 'leaf' is a child that has no children. 

        // we'll cheat and generate the names the quick way. The non-checked error prone way.
        for (let i = 0; i < 8; i++) {
            const nodename = spacename + "-" + i // this is the naming convention for the subtrees. It's a bit gross but it works.
            // console.log("bvts checking cache nodename ", nodename)
            name2indexMap.set(nodename, i)
            const tmp = oct.gCubeCache.get(nodename)
            if (!tmp) {
                const acube = oct.StringToCube(nodename)[0] // todo: check err
                needToLookUp.push(acube)
            } else {
                nodesList[i] = tmp
            }
        }
        const leavesList: (oct.TreeStatus)[] = new Array(8)
        for (let i = 0; i < 8; i++) {
            const childCube = oct.GetChildCube(cube, i)
            const childKey = oct.CubeToString(childCube)[0] // check error
            name2indexMap.set(childKey, i)
            const tmp = oct.gCubeCache.get(childKey)
            if (!tmp) {
                needToLookUp.push(childCube)
            } else {
                leavesList[i] = tmp
            }
        }

        let result: [oct.TreeStatus[], Error | null]

        if (needToLookUp.length === 0) {
            console.log("bvts Error: no children to look up but we thought we needed to look up children. ", Xname)
            result = [[], null]
        } else {
            // console.log("bvts merged list of children we need to look up for tree ", ": ", needToLookUp.map(c => oct.CubeToUrlString(c)[0]))
            result = await loaders.TwoWayLookupAndMerge(needToLookUp)
            if (result instanceof Error) {
                console.error("bvts Error in TwoWayLookupAndMerge: ", result)
                return [-1, result]
            }
        }
        // now we have to merge this into two arrays, one for the leaves and one for the nodes, and also update the cache with the new treeStatuses.
        // and not with the damn cache. 
        // console.log("bvts got tree statuses for children of ", name, ": ", result[0].map(ts => ts.name))
        // now we walk the results and fill in the two array.
        // There should be no holes when we're done.
        for (let i = 0; i < result[0].length; i++) {
            const treeStatus = result[0][i]
            // const treeStatiusName = treeStatus.name
            const index = name2indexMap.get(treeStatus.name)
            if (index === undefined) {
                // some of these will never happen.
                console.error("bvts Error: treeStatus name not found in name2indexMap: ", treeStatus.name)
                return [-1, new Error(`bvts Error: treeStatus name not found in name2indexMap: ${treeStatus.name}`)]
            }
            // how do we know if it's a parent. TwoWayLookupAndMerge can't tell
            // test if childKey ends in '-' and then 0..7 gross.
            const endsWithHyphenDigit = /-[0-7]$/.test(treeStatus.name) // not happy with this technique.    
            treeStatus.isParent = endsWithHyphenDigit
            if (treeStatus.isParent) {
                nodesList[index] = treeStatus
            } else {
                leavesList[index] = treeStatus
            }
        }

        // console.log("bvts final leavesList for ", Xname, ": ", leavesList.map(ts => ts ? ts.name + (ts.found ? " (found)" : " (not found)") : "undefined"))
        // console.log("bvts final nodesList for ", Xname, ": ", nodesList.map(ts => ts ? ts.name + (ts.found ? " (found)" : " (not found)") : "undefined"))
        if (originalCube.p <= 8) {
            //  console.log("bvts calcChildrenBits hit testmain-0n0u1w16p-4, which is a known parent. This is a good sign. We should see this in the logs and it should not cause any errors. If we don't see this in the logs, or if it causes an error, then something is wrong with our tree traversal logic.")
        }

        // and form the children array for the parent treeStatus
        let madeChildBits = 0//: { exists: boolean, isParent: boolean }[] = []
        for (let i = 0; i < 8; i++) {

            const child = leavesList[i]
            const node = nodesList[i]
            // don't cache the not found because we're never coming back here again unless the cache clears.
            // this is where we blow up when the fetch fails and the whole react fails.
            if (!child || !node) {
                return [-1, new Error(`bvts Error: child or node missing for index ${i}`)]
            }
            if (child.found) {
                oct.gCubeCache.set(child.name, child)
            }
            if (node.found) {
                oct.gCubeCache.set(node.name, node)
            }
            if (child.found && node.found) {
                // console.error("bvts Error: both child and node found for index ", i, " child: ", child.name, " node: ", node.name)
                // pick the child later.
                madeChildBits = oct.SetChildExists(madeChildBits, i, true)
                madeChildBits = oct.SetIsParent(madeChildBits, i, true)
            } else if (child.found) {
                madeChildBits = oct.SetChildExists(madeChildBits, i, true)
                madeChildBits = oct.SetIsParent(madeChildBits, i, false)
            } else if (node.found) {
                madeChildBits = oct.SetChildExists(madeChildBits, i, false)
                madeChildBits = oct.SetIsParent(madeChildBits, i, true)
            } else {
                // redundant to set these to false because madeChildBits starts at 0, but we'll do it for clarity.
                madeChildBits = oct.SetChildExists(madeChildBits, i, false)
                madeChildBits = oct.SetIsParent(madeChildBits, i, false)
            }
        }
        if (originalCube.p <= 8) {
            //  console.log("bvts calcChildrenBits hit testmain-0n0u1w16p-4, which is a known parent. This is a good sign. We should see this in the logs and it should not cause any errors. If we don't see this in the logs, or if it causes an error, then something is wrong with our tree traversal logic.")
        }
        // console.log("bvts cache is now: ", Array.from(oct.gCubeCache.entries()).map(e => e[0] + ": " + (e[1].found ? "found" : "not found")).join(", "))

        // console.log("children array we made: ", madeChildBits.toString(16), "for parent ", name)
        // let's hope we don't have to do this again for a long time.
        oct.SetChildBitsCache(spacename, madeChildBits)
        return [madeChildBits, null]
    }

    return [previousBits, null]
}

// is this the SAME list printed above? 
export function DoNameLookupsForCachedChildBits(aCachedEntry: oct.ChildBitsCacheEntry, spacename: string) {
    // can we just FAKE them and never do the loopup? are you sure? 
    // we have to look up the names of the existing items. Put them in the cache. or. FAKE them. 
    for (let i = 0; i < 8; i++) {
        const nodename = spacename + "-" + i // this is the naming convention for the subtrees. It's a bit gross but it works.
        if (oct.IsParent(aCachedEntry.childrenBits, i)) {
            const acube = oct.StringToCube(nodename)[0] // todo: check err
            const tmp = oct.gCubeCache.get(nodename)
            if (!tmp) {
                const newTreeStatus: oct.TreeStatus = {
                    name: nodename,
                    cube: acube,
                    level: acube.p,
                    found: true,
                    isParent: true,
                    childrenBits: -1, // we don't know yet.
                    wasXYZ: oct.IsXyz(aCachedEntry.childrenBits, i), // we don't know yet.
                    addresses: ["unknown so far"], // we don't know yet. Who cares?
                    error: null
                }
                // FAKED console.log("bvts DoNameLookupsForCachedChildBits adding to cache: ", nodename)
                oct.gCubeCache.set(nodename, newTreeStatus)
            }
        } else if (oct.ChildExists(aCachedEntry.childrenBits, i)) {
            const childCube = oct.GetChildCube(oct.StringToCube(spacename)[0], i)
            const childKey = oct.CubeToString(childCube)[0] // check error
            const tmp = oct.gCubeCache.get(childKey)
            if (!tmp) {
                const newTreeStatus: oct.TreeStatus = {
                    name: childKey,
                    cube: childCube,
                    level: childCube.p,
                    found: true,
                    isParent: false,
                    childrenBits: -1, // None for a child. 
                    wasXYZ: oct.IsXyz(aCachedEntry.childrenBits, i), // we don't know yet.
                    addresses: ["unknown so far"], // we don't know yet.
                    error:null
                }
                // FAKED console.log("bvts DoNameLookupsForCachedChildBits adding to cache: ", childKey)
                oct.gCubeCache.set(childKey, newTreeStatus)
            }
        }
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
