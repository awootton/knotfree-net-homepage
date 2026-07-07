

import { ourLocalStorage } from './LocalStorageFakery'

// This file contains the code for the octree data structure and related functions.
// This is the core of the system and is used for both reserving properties and for rendering the world.
// It includes functions for converting between cube coordinates and URL strings, for getting parent and child cubes, and for parsing lists of cubes.
// It also includes the main data structures for representing the status of the octree and the results of operations on it.

// using Go naming rules and error returns.

// string format of a cube (see regex below):
// "worldname"-number['n'|'s']number['u'|'d']number['e'|'w']['-'|'']number'p' with optional '-[0-7]'.
// where world is the name of world in lowercase letters, 
// n/s is north/south, 
// u/d is up/down, 
// e/w is east/west, 
// and 2^p is the size of the cube and also all coordinates must be multiplied by 2^p to get real value.
// For example: "testmain-10n5u3e2p" represents a cube in the world named "testmain"
// the size of the cube is 2^2=4 meters, and the coordinates are x = 10*4 meters north, y = 5*4 meters up, z = 3*4 meters east of the origin.
// When there's a whichParent then the cube coordinates are NOT the actual coordinates of the cube 
// but rather the coordinates of the parent cube and the whichParent tells us which child cube it is.
export type Cube = {
    world: string,      // name of the world
    x: number,          // in meters, where positive x is north and negative x is south
    y: number,          // in meters, where positive y is up and negative y is down
    z: number,          // in meters, where positive z is east and negative z is west
    p: number,          // a power of 2, representing the size of the cube. For example, if p = 2, then the cube is 2^2=4 units wide in each dimension.
    whichParent?: number,  // When we know it's a parent. whichParent=0 is not a child. It's the north, east, up parent.
}

export type CubeString = string

export function GetParentCube(cube: Cube): Cube {
    return GetParentCubeWithOcttreeIndex(cube)[0]
}

export function GetParentCubeWithOcttreeIndex(cube: Cube): [Cube, number] {
    const newpower = 2 ** (cube.p + 1)
    const remainderx = Math.abs(cube.x % newpower)
    const remaindery = Math.abs(cube.y % newpower)
    const remainderz = Math.abs(cube.z % newpower)
    const index = (remainderx != 0 ? 1 : 0) | (remaindery != 0 ? 2 : 0) | (remainderz != 0 ? 4 : 0)

    const temp = {
        world: cube.world,
        // round down to the nearest multiple of power
        x: cube.x - remainderx,
        y: cube.y - remaindery,
        z: cube.z - remainderz,
        p: cube.p + 1,
        whichParent: index
    } as Cube
    return [temp, index]
}

// getChildCube makes the cube object, depending upon the index of the child cube. The index is a number from 0 to 7 that represents which child cube it is.
// we don't know if there's a parent at the location or if it's a leaf.
export function GetChildCube(cube: Cube, which: number): Cube {
    // the whichParent in the cube will override the which passed if there is one.
    if (cube.whichParent !== undefined) {
        which = cube.whichParent
    }
    // is will have the same coordinates as the parent cube except that the p value will be 1 less 
    // and then depending on which child cube it is it will add the appropriate amount to the x, y, and z coordinates.
    let childCube = {
        world: cube.world,
        x: cube.x,
        y: cube.y,
        z: cube.z,
        p: cube.p - 1,
    } as Cube
    const halfSize = 2 ** (cube.p - 1)
    if (which & 1) {
        childCube.x += halfSize
    }
    if (which & 2) {
        childCube.y += halfSize
    }
    if (which & 4) {
        childCube.z += halfSize
    }
    return childCube
}


// CubeToString will Convert a cube to a string.
// There are no negative numbers in cube string land. 
// note that the coordinates must be multiples of 2^p, so if they are not then it's an error. 
// For example, if p is 1 then the cube size is 2, so all the coordinates must be even numbers or else it's an error. 
// When we make it into a string it should round down to the nearest even number and then when we parse it back it should be the same as the original cube but with the coordinates rounded down to the nearest even number. So we expect x to become 2, y to become 4, and z to become -4 when we parse it back from the string.
export function CubeToString(cube: Cube): [CubeString, Error | null] {

    // we don't add the '-n' even if it's a parent because we don't know it.
    const xDir = cube.x >= 0 ? 'n' : 's'
    const yDir = cube.y >= 0 ? 'u' : 'd'
    const zDir = cube.z >= 0 ? 'e' : 'w'
    const power = 2 ** cube.p
    const scaledx = cube.x / power
    const scaledy = cube.y / power
    const scaledz = cube.z / power
    if (!Number.isInteger(scaledx) || !Number.isInteger(scaledy) || !Number.isInteger(scaledz)) {
        let errorMessage = `Cube coordinates must be multiples of p. Got x: ${cube.x}, y: ${cube.y}, z: ${cube.z}, p: ${cube.p}`
        return ["", new Error(errorMessage)]
    }
    let str = `${cube.world}-${Math.abs(scaledx)}${xDir}${Math.abs(scaledy)}${yDir}${Math.abs(scaledz)}${zDir}${cube.p}p`
    if (cube.whichParent !== undefined) {
        str += `-${cube.whichParent}`
    }
    return [str, null]
}

// StringToCube will Convert a string to a cube.
// It's very picky and precise. It will return an error if the string is not in the correct format or if the coordinates are not multiples of 2^p.
// It's completely reversible with CubeToString. If you convert a cube to a string and then back to a cube, you WILL get the same cube back.
export function StringToCube(str: CubeString): [Cube, Error | null] {
    const regex = /^([a-z]+)-(\d+)([ns])(\d+)([ud])(\d+)([ew])(-?\d+)p(?:-([0-7]))?$/

    const match = str.match(regex)
    if (!match) {
        return [{
            world: "",
            x: 0,
            y: 0,
            z: 0,
            p: 0
        }, new Error(`Invalid cube string: ${str}`)]
    }
    const world = match[1]
    const xnum = parseInt(match[2]) * (match[3] === 'n' ? 1 : -1)
    const ynum = parseInt(match[4]) * (match[5] === 'u' ? 1 : -1)
    const znum = parseInt(match[6]) * (match[7] === 'e' ? 1 : -1)
    const p = parseInt(match[8])
    const size = Math.pow(2, p)
    let w: Cube = { world, x: xnum * size, y: ynum * size, z: znum * size, p }
    if (match[9]) {
        w.whichParent = parseInt(match[9])
    }
    return [w, null]
}

// IsSameCube returns true if the two cubes have the same world, x, y, z, and p values. 
// They occupy the same space in the world. 
export function IsSameCube(cube1: Cube, cube2: Cube): boolean {
    return cube1.world === cube2.world && cube1.x === cube2.x && cube1.y === cube2.y && cube1.z === cube2.z && cube1.p === cube2.p
}

// ParseCubeList will take a comma delimited list of cube strings and return an array of cubes and an error 
// if any of the cube strings were invalid. For example, if the input is "testmain-10n5u3e2p, testmain-20n10u6e4p" 
// then it will return an array with two cubes and no error. 
// If the input is "testmain-10n5u3e2p, invalidcube" then it will return an array with one cube and an error for the second cube string.
export function ParseCubeList(cubeList: string): [Cube[], Error | null] {
    // split by comma and trim whitespace
    const trimmed = cubeList.trim()
    if (trimmed === "") {
        return [[], new Error("Input is empty or just whitespace")]
    }
    const cubeStrings = trimmed.split(",").map(s => s.trim())
    const cubes: Cube[] = []
    for (const cubeString of cubeStrings) {
        const [cube, error] = StringToCube(cubeString)
        if (error) {
            return [cubes, error]
        } else {
            cubes.push(cube)
        }
    }
    return [cubes, null]
}


// GroupTextParamaters to add additional params to a TreeStatus of known cubes. 
// We'll add these to the TXT record. For weird (knotfree) reasons there should be no spaces in the TXT record.
// be careful if you do these by hand.
// key is meta_group_id. Should we just put them in @ ?
// observe 255 characters limit !!
// we need a rosetta stone for this crap. I'm doing the courtyard, some streets, and a blue sky so far.
// GLT is coming next. a range of glt for various distances would be nice. 
// but we have a 256 char limit.
// note that just because of this doesn't mean we're not still loading the iFrame. It'sjust that the iFrame won't be rendering. (not working yet)
// I am accidentally inventing a whole new language for describing 3d scenes in DNS TXT records. It's pretty exciting. NOT!!!!
// it's terrible and it has to go. 

export type GroupTextParameters = {

    // the group that this tree belongs to, which is the same for all leaf nodes rendered by the same iFrame or server.
    // if one is not assigned then one will be generated. Many things are in a group of one, by themselves.

    // group id. We assume that these all have the sane texture etc. 
    id: string, // usually just a random string but some share a common id. For instance, 
    // the streets share a common id so that they can be rendered by the same iFrame and in a batch,.

    // I wanted this for localhost debugging with WorldsTest1 on localhost:3010 
    // but how does it know who's calling it? it will allow a nonsensical path and still serve the react. w
    dbg?: string, // example  localhost:3010, ignore in prod.

    // ali?: string      // alias use this for the iFrame src instead.
    // p?: number       // optional port for the iFrame to connect to. If not specified, use default port 80.

    // master
    mstr?: boolean // for the iFrame to connect to. This is who we ask for assets. We don't have to tunnel all the items
    // in a group, just this One. It's an error if there's none. . 

    //ex?: Record<string, unknown> // for extensibility. 

    // someone please document this crap language I just invented. Or, tear it out.
    type?: string // example: floor, ceiling and that's it?
    asset?: string // example: url to a file like street.jpg, or Duck.gtl or color:#808080. 
}

// TreeStatus is a record of cubes that exist and also ones that don't exist.
// We have records of ones are empty space and ones that are parents. 
// For instance. if we have testmain-10n5u3e2p-0 'found' but not testmain-10n5u3e2p-1, 
// we know that the cube in space "10n5u3e2p" has a subtree in the 0th octant but is empty in the 1st octant.
// We will cache all of this so let's not be too fluffy. It's already too fluffy but there are agile rules so...

export type TreeStatus = {

    name: string,               // without the .vr or .xyz TLD. For example, "testmain-10n5u3e2p" and not "testmain-10n5u3e2p.vr"
    found: boolean,             // aka exists in DNS somewhere. 

    // do we need both the cube AND the name?
    // for fast culling we want the cube 
    // but for caching and looking up the dns we want the name.

    cube: Cube,                 // the cube represented by this name if it was found and could be parsed as a cube, otherwise null
    level: number,              // the p value of the cube named by name. lose this since we always have the cube. ATW FIXME.

    isParent: boolean,          // and not a leaf, A child will never have a - suffix or childrenBits. It's a terminal.
    wasXYZ: boolean,            // found as an .xyz domain name and not a .vr domain name

    // is TXT meta_group_id
    // only happens to the leaf nodes.
    // false means we looked them up and got "" else there would be an object here
    groupId?: GroupTextParameters | undefined, // the group that this tree belongs to, which is the same for all leaf nodes rendered by the same iFrame or server. 

    // do we need this? Maybe it's just a maintance problem waiting to happen.
    // it will always be 8 when known and [] when needs to be checked.
    // but also is the child a leaf or a parent? 
    // children: {exists: boolean, isParent: boolean}[],    // for the 8 subcubes true if a subtree exists and false if empty space.
    // see the utility routines below.
    childrenBits: number,       // for the 8 subcubes true if a subtree exists and false if empty space.

    // we should only fill this out for the leaf nodes that we actually want to render
    addresses?: string[],       // the result of the dns lookup for this name, which should be an array of ip addresses if found and null if not found or if there was an error during the lookup.
    error: Error | null         // nullable Error type. unused?

    // weOwnThis? would be convienent but is really only used for the reserve function. 

    // some iFrameStuff? no, put that in the AuxTreeStatus since we only need it for the leaf nodes that we're actually rendering.
    //        let fr = document.getElementById(params.name) as HTMLIFrameElement
    // <iframe src={params.target} id={params.name} width={100} height={100}
    // onLoad={loaded} sandbox="allow-scripts allow-popups" ></iframe>
}

// we look these up with the leaf name. Unused, so far.
export type AuxTreeStatus = {

    textureUrl?: string,
    // iFrame
    theRealUrl?: string, // if redirected from .vr to .xyz or something else. or if GroupTextParameters has hints

    theGLTFile: any
}

// HaveChildBits is a record of if each child cube exists and if, when we go there, it's a parent or a leaf. 
// We encode this in a single number for space and speed.
// we init with -1 for unknown, 0 for no children, and then we set the bits for the children that exist. 
// So if it's 5 then we know that child 0 and child 2 exist but child 1 does not exist.
// bit 8 is for isParent of subcube 0 etc
// bit 16 is for isXyz if it's an .xyz domain name and not a .vr domain name.
// best displayed in hex. 
// I hate this for being anti agile but love it for space and speed.
// but I love it because copilot typed it. lol.
export function HaveChildBits(childrenBits: number): boolean {
    return childrenBits !== -1
}
// ChildExists means there's a leaf node to be found at that child index. 
export function ChildExists(childrenBits: number, index: number): boolean {
    if (childrenBits === -1) return false
    return (childrenBits & (1 << index)) !== 0
}
// IsParent we can expect to recurse into this node.
export function IsParent(childrenBits: number, index: number): boolean {
    if (childrenBits === -1) return false
    return (childrenBits & (1 << (index + 8))) !== 0
}
export function SetChildExists(childrenBits: number, index: number, does: boolean): number {
    const abit = 1 << index
    if (does) {
        return childrenBits | abit
    } else {
        return childrenBits & ~abit
    }
}
// SetIsParent marks a bit so we can know we won't find a leaf at that child index but we will find a parent and can recurse into it.
export function SetIsParent(childrenBits: number, index: number, does: boolean): number {
    const abit = 1 << (index + 8)
    if (does) {
        return childrenBits | abit
    } else {
        return childrenBits & ~abit
    }
}
// IsXyz indicates that the name is found on the regular DNS and not on the .vr DNS. 
export function IsXyz(childrenBits: number, index: number): boolean {
    if (childrenBits === -1) return false
    return (childrenBits & (1 << (index + 16))) !== 0
}
export function SetIsXyz(childrenBits: number, index: number, does: boolean): number {
    const abit = 1 << (index + 16)
    if (does) {
        return childrenBits | abit
    } else {
        return childrenBits & ~abit
    }
}

// DisplayChildBits is for debugging and visualization purposes since the bits are not human readable. At All. 
export function DisplayChildBits(childrenBits: number, cube: string): string {
    const key = "01234567"
    let cld = "00000000"
    let par = "00000000"
    let xyz = "00000000"
    for (let i = 0; i < 8; i++) {
        if (ChildExists(childrenBits, i)) {
            cld = cld.substring(0, i) + "1" + cld.substring(i + 1)
        }
        if (IsParent(childrenBits, i)) {
            par = par.substring(0, i) + "1" + par.substring(i + 1)
        }
        if (IsXyz(childrenBits, i)) {
            xyz = xyz.substring(0, i) + "1" + xyz.substring(i + 1)
        }
    }
    return cube + "\n" + "key " + key + "\ncld " + cld + "\npar " + par + "\nxyz " + xyz + "\n"
}

// is anyone enforcing this? FIXME
export var gChildBitsCacheMaxAge = 1000 * 60 * 5 // 5 minutes in milliseconds
// one week would be 1000 * 60 * 60 * 24 * 7 - a man has to dream.

// This is for forcing all new entries. NEVER forget to set it back.
// if you set it to 0 or -1 then there is no cache.
export function SetChildBitsCacheMaxAge(age: number): void {
    gChildBitsCacheMaxAge = age
}

export type ChildBitsCacheEntry = {
    name: string,
    childrenBits: number,
    when: number
    TXT?: GroupTextParameters // let's don't json this. when the name starts with "meta_group_id" then it's a leaf, has no bits 
    // but may have this useful TXT record string.
}

// not export, use accessors.
// note that we back these up in local storage so that we can persist them across page reloads.
// is it really necessary to have this here, in memory?
// Do we gain anything more that the deswrialization?
const gChildBitsCache: Map<string, ChildBitsCacheEntry> = new Map()

// some start with meta_group_id and can just go.
// others start with a cube name and if that verfies then it must be a child bits cache entry and we delete it.
export function ClearChildBitsCache(): void {
    gChildBitsCache.clear()
    // also the local storage. We don't want to keep old entries around.
    for (let i = 0; i < ourLocalStorage.length; i++) {
        const key = ourLocalStorage.key(i)
        if (key && key.startsWith("meta_group_id.")) {
            // we could check of the rest of the key is a valid cube string lol.
            ourLocalStorage.removeItem(key)
        } else {
            if (key) {
                const [cube, err] = StringToCube(key)
                if (!err) {
                    ourLocalStorage.removeItem(key)
                }
            }
        }
    }
}

export function GetChildBitsCache(name: string): ChildBitsCacheEntry | null {
    let found = gChildBitsCache.get(name)
    if (!found) {
        // check the local storage for the entry.
        const entryStr = ourLocalStorage.getItem(name)
        if (entryStr) {
            try {
                const entry = JSON.parse(entryStr) as ChildBitsCacheEntry
                gChildBitsCache.set(name, entry)
                found = entry
            } catch (e) {
                console.error("Failed to parse child bits cache entry from localStorage", e)
                return null
            }
        }
    }
    // what if it's too old? We should check the age of the entry and if it's older than the max age then we should delete it from the cache and return null.
    if (found) {
        const age = Date.now() - found.when
        if (age > gChildBitsCacheMaxAge) {
            gChildBitsCache.delete(name)
            ourLocalStorage.removeItem(name)
            return null // ouch.
        }
    }
    return found || null
}

export function SetChildBitsCache(name: string, childrenBits: number): void {
    const entry: ChildBitsCacheEntry = {
        name,
        childrenBits,
        when: Date.now()
    }
    gChildBitsCache.set(name, entry)
    // if it's newer then we also want to store it in local storage for persistence across page reloads.
    // Who are we kidding? It's always newer. Why else would we be setting it?
    try {
        ourLocalStorage.setItem(name, JSON.stringify(entry))
    } catch (e) {
        console.error("Failed to set child bits cache entry in localStorage", e)
    }
}

export function SetChildBitsCacheEntry(name: string, entry: ChildBitsCacheEntry): void {
    entry.when = Date.now()
    gChildBitsCache.set(name, entry)
    // if it's newer then we also want to store it in local storage for persistence across page reloads.
    // Who are we kidding? It's always newer. Why else would we be setting it?
    try {
        ourLocalStorage.setItem(name, JSON.stringify(entry))
    } catch (e) {
        console.error("Failed to set child bits cache entry in localStorage", e)
    }
}


// GetTheWholeChildBitsLocalCache goes through the whole local storage and returns a map of all the child bits cache entries.
// useful for priming a server! This one will just return a map of key to string value.
export function GetTheWholeChildBitsLocalCache(): Map<string, string> {
    // iterate through the local storage and get all the entries that are child bits cache entries.
    const result: Map<string, string> = new Map()
    for (let i = 0; i < ourLocalStorage.length; i++) {
        const key = ourLocalStorage.key(i)
        if (key != null) {
            let baseKey = key
            let prefix = ""
            if (key.startsWith("meta_group_id.")) {
                prefix = "meta_group_id."
                baseKey = key.substring(prefix.length)
            }
            const [cube, err] = StringToCube(baseKey) // should parse perfectly.
            // just to get the regex for a cube name
            // the StringToCube regex is very strict.
            if (!err) {
                const entryStr = ourLocalStorage.getItem(key)
                if (entryStr) {
                    // What if it's too old? We can't tell if we don't parse it. So we just return it and let the caller decide if it's too old or not. Yes, CP. I agree -atw
                    result.set(key, entryStr)
                }
            }
        }
    }
    return result
}

// SetTheWholeChildBitsLocalCacheFromString is sooo cool. CP is a charm today. 
export function SetTheWholeChildBitsLocalCacheFromString(entries: string): void {
    try {
        const parsed = JSON.parse(entries) as [string, string][]
        SetTheWholeChildBitsLocalCache(new Map(parsed))
    } catch (e) {
        console.error("Failed to parse child bits cache entries from string", e)
    }
}


// SetTheWholeChildBitsLocalCache could be used to prime an entire cache from a server. 

export function SetTheWholeChildBitsLocalCache(entries: Map<string, string>): void {
    for (const [key, value] of entries) {
        // localStorage.setItem(key, value)
        // We will also set the local cache if we everything is normal. Or we could just do this.
        // actually, doing that will also set the local cache.
        // parse it. Both the key and the value. The key is a cube string and the value is a ChildBitsCacheEntry string.
        let baseKey = key
        if (key.startsWith("meta_group_id.")) {
            baseKey = key.substring("meta_group_id.".length)
        }
        const [cube, err] = StringToCube(baseKey)
        if (!err) {
            try {
                const entry = JSON.parse(value) as ChildBitsCacheEntry
                gChildBitsCache.set(key, entry)
                ourLocalStorage.setItem(key, value)
            } catch (e) {
                console.error("Failed to parse child bits cache entry from localStorage", e)
            }
        } else {
            console.error("Failed to parse cube string from localStorage key", key, err)
        }
    }
}


// The two big operations we need to do are:
// starting from a list of property names, get the octree nodes that correspond to those properties.
//    Then we can prune that list to the ones missing and then actually reserver them.
//    I'm doing the knotfree version first and then the cloudflare version after that.

// The second thing is to start at the top of a tree and then traverse down to the leaf codes while I was serving some kind of filter like distance.
//    then we can make a list of the ones that still need to be loaded or something. And then we can prepare them for display.

// it's pretty clear I'm going to need a cache of the ones we've already looked for. ?? or is it?

// a cache of name to cube of that cube testmain-0n0u0e5p and testmain-0n0u0e5p-0 are different entries.
// This does not persist across page reloads. It's just for the current session. We will persist the child bits cache across page reloads but not this one.
export const gCubeCache: Map<string, TreeStatus> = new Map()

// more stuff about a leaf. used.
export const gAuxTreeCache: Map<string, AuxTreeStatus> = new Map()

// export type ThingsThatAlreadyExistType = {
//     cube: Cube,
//     wasXYZ: boolean, 
//     weOwnIt: boolean // if we own it, then we can reserve it again. If we don't own it, then we can't reserve it or add the TXT record. or anything else.
// }

// // ReserveResult is the accumulation of results during the process of reserving a property. 
// // It includes the original list of properties we wanted to reserve, the raw chains of cubes that we would need to reserve, 
// // the list of cubes that we already had in the cache, the list of cubes that we actually need to reserve, 
// // a reference to the cube cache, and any error that occurred during the process.
// export type ReserveResult = {
//     startingProperties: string[],
//     rawChains: Cube[][], // the raw chain of cubes that we would need to reserve, including the ones that are already in the cache. This is for debugging and visualization purposes.

//     // thingsWeWillNeed: Cube[][], // same as rawChain. will have duplicates in the parents.
//     // never, ever ever do this again: loser:thingsThatAlreadyExist: { cube: Cube, from: string }[],  // of all the chains, from vr or xyz
//     thingsThatAlreadyExist: ThingsThatAlreadyExistType[],  // of all the chains, from vr or xyz
//     thingsToActuallyReserve: ThingsThatAlreadyExistType[],  // because they might exist anyway.

//     cubeCache: Map<string, TreeStatus>, // a reference to the cache
//     error: Error | null
// }


// FromXToY: invent the from x to y function to generate a list of cubes between two cubes. 
// That's it. Just make a list of cubes.
// Input is like "from testmain-3n0u3e3p to testmain-3n0u3w3p" makes the ones with 3e, 2e, 1e, 0e, 1w, 2w, and 3w
// so, 7 of them. Note, there is no 0w. It's the same as 0e. It's like saying -0 instead of 0. 
// and the output is a comma separated list of the cubes in the path from the first cube to the second cube, inclusive. 
// It will make a huge amount of cubes if not careful.
// should use this to generate the octants in BuildVisibleTree lol.
// this was fun. See tests in showMeTheParents.ts for examples of the input and output.

export function FromXToY(statement: string): [string, Error | null] {
    const result: string[] = []
    // they must be the same power.
    const regex = /from ([a-z0-9-_]+) to ([a-z0-9-_]+)/
    const match = statement.match(regex)
    if (!match) {
        return ["", new Error("Invalid input format. Expected eg. 'from testmain-3n0u3w3p to testmain-3n0u3e3p'")]
    }
    const fromStr = match[1]
    const toStr = match[2]
    return FromXToYString(fromStr, toStr)
}

export function FromXToYString(fromStr: string, toStr: string): [string, Error | null] {
    let fromCube: Cube
    let toCube: Cube
    let err: Error | null
    [fromCube, err] = StringToCube(fromStr)
    if (err) {
        return ["", new Error("Invalid from cube: " + err.message)]
    }
    [toCube, err] = StringToCube(toStr)
    if (err) {
        return ["", new Error("Invalid to cube: " + err.message)]
    }
    return FromXToYCube(fromCube, toCube)
}

// We return strings because the cubes this returns could be huge.
// They will be cubes in the end so maybe I'm making a mistake.
export function FromXToYCube(fromCube: Cube, toCube: Cube): [string, Error | null] {
    const result: string[] = []
    // they must be the same power. Limit of 100? 
    const maxCubes = 10000 // go crazy.
    // check that they are the same power
    if (fromCube.p !== toCube.p) {
        return ["", new Error("Cubes must be the same power")]
    }
    // first check if they are the same cube
    if (fromCube.x === toCube.x && fromCube.y === toCube.y && fromCube.z === toCube.z) {
        const [fromStr, err] = CubeToString(fromCube)
        if (err) {
            return ["", new Error("Error converting cube to URL string: " + err.message)]
        }
        return [fromStr, null]
    }
    // iterate from fromCube.x to toCube.x, fromCube.y to toCube.y, fromCube.z to toCube.z, and build the list of cubes.
    let deltax = 2 ** fromCube.p
    if (fromCube.x > toCube.x) {
        deltax *= -1
    }
    let deltay = 2 ** fromCube.p
    if (fromCube.y > toCube.y) {
        deltay *= -1
    }
    let deltaz = 2 ** fromCube.p
    if (fromCube.z > toCube.z) {
        deltaz *= -1
    }

    let zcube = { ...fromCube }
    // do this in index order. x then y THEN z
    while (true) {
        const [zcubeStr, err] = CubeToString(zcube)
        if (err) {
            return ["", new Error("Error converting cube to URL string: " + err.message)] // get rid of this later.
        }
        // console.log("zcubeStr: ", zcubeStr)
        let ycube = { ...zcube }
        while (true) {
            const [ycubeStr, err] = CubeToString(ycube)
            if (err) {
                return ["", new Error("Error converting cube to URL string: " + err.message)] // get rid of this later.
            }
            // console.log("ycubeStr: ", ycubeStr)
            let xcube = { ...ycube }
            while (true) {
                const [xcubeStr, err] = CubeToString(xcube)
                if (err) {
                    return ["", new Error("Error converting cube to URL string: " + err.message)] // get rid of this later.
                }
                // console.log("xcubeStr: ", xcubeStr)
                result.push(xcubeStr)
                if (result.length > maxCubes) {
                    return ["", new Error("Too many cubes in the path. Limit is " + maxCubes)]
                }
                if (xcube.x === toCube.x) {
                    break
                }
                xcube.x += deltax
            }
            if (ycube.y === toCube.y) {
                break
            }
            ycube.y += deltay
        }
        if (zcube.z === toCube.z) {
            break
        }
        zcube.z += deltaz
    }
    const resultStr = result.join(",")
    return [resultStr, null]
}


type octTreeNodeChildType = octTreeNode | null

// octTreeNode is s specialized node for the OctTreeIntersector.
type octTreeNode = {
    cube: Cube;
    occupied: boolean;
    children: (octTreeNodeChildType)[];
}

export const specialCheckingModeError: Error = new Error(`Este espacio ya está ocupado`)

// OctTreeIntersector solves the problem where we want to display empty spaces that a user might obtain by reserving a property
// so we have to cull the empty spaces by comparing it to the known tree of occupied spaces.
// We use a tree to do this in log time. It will do a huge interection in log time. Log Time.
// we can use this later to keep people from stepping on each other's toes. 
export class OctTreeIntersector {

    root: octTreeNode[] = new Array(8).fill(null)
    inCheckingMode: boolean = false

    constructor(worldName: string) {
        // we should fill the root.
        // it SPANS THE ORIGIN at level 16.
        // my little friend helping types fast but is not clever.
        const from = worldName + "-1s1d1w16p" // this is way more fun.
        const to = worldName + "-0n0u0e16p"
        const [rootCubeStrings, err] = FromXToYString(from, to)
        const [rootCubeArray, err2] = ParseCubeList(rootCubeStrings)
        // console.log("OctTreeIntersector rootCubeStrings: ", rootCubeStrings)
        this.root = rootCubeArray.map(cube => {
            return {
                occupied: false,
                cube: cube,
                children: new Array(8).fill(null)
            }
        })
        // note that it starts with cube: { world: 'testmain', x: -65536, y: -65536, z: -65536, p: 16 }
        // and 0,0,0 is at index 7.
        // console.log("OctTreeIntersector initialized with root: ", this.root)
    }

    // The three checking mode conditions are:
    // 1. We just find a cube that is already occupied. We don't care about the rest of the tree. It's an intersection.
    // 2. We try to walk off the end of the known tree. No intersection. Never make new children in checking mode. 
    //    If we are checking, then we are just looking for intersections. If there is no child node, then there is no intersection.
    // 3. We get to a node, with children, that matches the cube. The existance of the children means there's an intersection. 

    recurse(node: octTreeNodeChildType, cube: Cube, depth: number): (Error | null) {

        if (depth > 64) {
            // Loath a throw. Loath All Throws. throw new Error(`Depth exceeded while trying to add cube ${cube.world}-${cube.x}n${cube.y}u${cube.z}e${cube.p}p to octree. This should never happen.`) 
            // ask Robert Griesemer to explain. 
            console.error(`Depth exceeded while trying to add cube ${cube.world}-${cube.x}n${cube.y}u${cube.z}e${cube.p}p to octree. This should never happen.`)
            // ironically, in isCheckingMode ...
            if (this.inCheckingMode) {
                return specialCheckingModeError
            }
            return new Error(`Depth exceeded while trying to add cube ${cube.world}-${cube.x}n${cube.y}u${cube.z}e${cube.p}p to octree. This should never happen.`)
        }
        const theNotNullNode = node as octTreeNode
        if (theNotNullNode.occupied && this.inCheckingMode) {
            return specialCheckingModeError // obviously
        }
        const isSameCube = IsSameCube(theNotNullNode.cube, cube)
        if (isSameCube) {
            if (this.inCheckingMode) {
                // what if it matches but is not occupied?
                // Then there would be a child in it's slot. 
                // are there ANY children? If so they are intersecting.
                if (theNotNullNode.children !== null && theNotNullNode.children.some(child => child !== null)) {
                    return specialCheckingModeError
                }
            } else {
                theNotNullNode.occupied = true
                return null// and, we're done.
            }
        }
        // well, ok, which child is it?
        const halfSize = 2 ** (theNotNullNode.cube.p - 1)
        const nodePower = 2 ** (theNotNullNode.cube.p)
        const cubePower = 2 ** (cube.p)

        let index = 0
        if (cube.x >= theNotNullNode.cube.x + halfSize) {
            index += 1
        }
        if (cube.y >= theNotNullNode.cube.y + halfSize) {
            index += 2
        }
        if (cube.z >= theNotNullNode.cube.z + halfSize) {
            index += 4
        }
        let childNode = theNotNullNode.children[index]
        if (childNode === null) { // make a new one. A smaller one. 
            // never make new children in checking mode. If we are checking, then we are just looking for intersections. If there is no child node, then there is no intersection.
            if (this.inCheckingMode) {
                return null // no intersection, because there is no child node. we're done.
            }
            const subCube = GetChildCube(theNotNullNode.cube, index)
            childNode = {
                cube: subCube,
                occupied: false,
                children: new Array(8).fill(null)
            }
            theNotNullNode.children[index] = childNode
        }
        if (this.inCheckingMode && isSameCube) {
            if (childNode !== null) {
                return specialCheckingModeError
            }
        }
        // console.log("is", (childNode as octTreeNode).cube, "closer to", cube, "?")
        // and, you know, recurse.
        return this.recurse(childNode, cube, depth + 1)
    }

    AddKnownCube(cube: Cube): (Error | null) {
        // we assume that the coordintes are += 64k. Check that?
        // we want to add this cube to the octree. We need to find the correct place for it in the tree and then add it there. 
        // we can do this by starting at the root and then going down the tree until we find the correct place for it. duh, thanks copilot.
        let index = 0
        if (cube.x >= 0) {
            index += 1
        }
        if (cube.y >= 0) {
            index += 2
        }
        if (cube.z >= 0) {
            index += 4
        }
        // console.log("Adding cube: ", cube, " to octree at index: ", index)
        const node = this.root[index]
        if (node === null) {
            // this can never happen. the root is always filled with nodes that span the origin.
            return new Error(`No node at root for index ${index} for cube ${cube.world}-${cube.x}n${cube.y}u${cube.z}e${cube.p}p`)
        }
        // if there is no node at this index, then we can just add the cube here.
        const err = this.recurse(node, cube, 0)
        return err
    }

    CheckForIntersection(cube: Cube): [boolean, Error | null] {
        // I don't want to write another traversal. Just hack the one we have.
        this.inCheckingMode = true
        const err = this.AddKnownCube(cube)
        this.inCheckingMode = false
        let wasIntersecting = false
        if (err === specialCheckingModeError) {
            wasIntersecting = true
        }
        if (wasIntersecting === false && err !== null) {
            // did something weird happen? 
            return [wasIntersecting, err]
        }
        return [wasIntersecting, null]
    }

    PrintTheTree() { // my angel wrote this for me. I am a monster. I am a genius. I am a monster genius.
        // I have a dream and in the morning there's code. 
        const printNode = (node: octTreeNodeChildType, index: number, depth: number) => {
            if (node === null) {
                return
            }
            const theNotNullNode = node as octTreeNode
            const cube = CubeToString(theNotNullNode.cube)[0]
            console.log(`${' '.repeat(depth * 2)}- ${index}- ${cube} ${theNotNullNode.occupied ? '(occupied)' : ''}`)
            let i = 0
            for (const child of theNotNullNode.children) {
                printNode(child, i, depth + 1)
                i++
            }
        }
        console.log("Loaded intersector dump:")
        let index = 0
        for (const node of this.root) {
            printNode(node, index, 0)
            index++
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

