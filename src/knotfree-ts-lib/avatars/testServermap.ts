
// testServermap.ts

// src/knotfree-ts-lib/avatars/testServermap.ts

// This is a map from the names to the local versons of servers running.
// some node will read the map a get batch of client servers running onverious ports.
// sombody will make a the /etc/hosts file with names.vvv matching so that the client can connect to the servers by name.
// the client will be able to read the map becuuse it's in public/testServermap.json and the client can fetch it from the server. 
// The client will then be able to connect to the servers by name.
// or something, thanks CP
// the rest will fail for now. we can run someething on 3010, so that's 3
//

export type ServerItem = {
    "name": string,
    "master": string,
    "port": string
}

export type ServerList = {
    "servers": [ServerItem]
}

export const OurServerList = {
    "servers": [
        {
            "name": "courtyard",
            "master": "testmain-0n0u0e5p.zzz",
            "port": "4001"
        },

        {
            "name": "orange",
            "master": "testmain-2n0u4w2p.zzz",
            "port": "4002"
        },      
        {
            "name": "duck",
            "master": "testmain-2n0u5w2p.zzz",
            "port": "4003"
        },
        {
            "name": "SevenWest",
            "master": "testmain-2n0u7w2p.zzz",
            "port": "4004"
        },
        {
            "name": "TheStreet",
            "master": "testmain-1n0u10w4p.zzz",
            "port": "4005"
        },
        {
            "name": "dirt",
            "master": "testmain-0n1d0e9p.zzz",
            "port": "4006"
        }
    ]
}

// 8/18/26

// Master:testmain-0n0u0e5p courtyard
//     0n0u0e5p

// Master:testmain-0n1d0e9p the dirt
//     0n1d0e9p,0n1d1e9p,0n1d1w9p,0n1d2w9p,1n1d0e9p,1n1d1e9p,1n1d1w9p,1n1d2w9p,1s1d0e9p,1s1d1e9p,1s1d1w9p,1s1d2w9p,2s1d0e9p,2s1d1e9p,2s1d1w9p,2s1d2w9p

// Master:testmain-1n0u10w4p the street
//     1n0u10w4p,1n0u11w4p,1n0u12w4p,1n0u13w4p,1n0u14w4p,1n0u15w4p,1n0u16w4p,1n0u17w4p,1n0u18w4p,1n0u19w4p,1n0u1w4p,1n0u20w4p,1n0u21w4p,1n0u22w4p,1n0u23w4p,1n0u24w4p,1n0u25w4p,1n0u26w4p,1n0u27w4p,1n0u28w4p,1n0u29w4p,1n0u2w4p,1n0u30w4p,1n0u31w4p,1n0u32w4p,1n0u33w4p,1n0u34w4p,1n0u35w4p,1n0u36w4p,1n0u37w4p,1n0u38w4p,1n0u39w4p,1n0u3w4p,1n0u40w4p,1n0u41w4p,1n0u42w4p,1n0u43w4p,1n0u44w4p,1n0u45w4p,1n0u46w4p,1n0u47w4p,1n0u48w4p,1n0u49w4p,1n0u4w4p,1n0u50w4p,1n0u51w4p,1n0u52w4p,1n0u53w4p,1n0u54w4p,1n0u55w4p,1n0u56w4p,1n0u57w4p,1n0u5w4p,1n0u6w4p,1n0u7w4p,1n0u8w4p,1n0u9w4p

// Master:testmain-2n0u7w2p  SevenWest
//     2n0u7w2p
 
// Master:testmain-2n0u5w2p  duck
//     2n0u5w2p

// Master:testmain-2n0u4w2p  orange
//     2n0u4w2p

// we can dig it out from almost any url that just has one domain name in it.
// like an href window.location.href eg. http://localhost:3010/?domain=testmain-2n0u7w2p.vr&asset=undefined&type=undefined
// I think I can reg-ex it out of a dung beetle.
// see the testStringToCube.ts for some examples of how to use it.

export function AnythingToDomainName(href: string): [string, Error | null] {
    let theMatch = "not a domain found in sight"

    // original = /^([a-z]+)-(\d+)([ns])(\d+)([ud])(\d+)([ew])(-?\d+)p(?:-([0-7]))?$/
    // this new one has had the boundary's removed. It will match the whole domain name, not just the worldname-coordinate part.

    const regex = /([a-z]+)-(\d+)([ns])(\d+)([ud])(\d+)([ew])(-?\d+)p(?:-([0-7]))?/

    const match = href.match(regex);
    if (match) {
         theMatch = match[0]
    } else {
        return ["", new Error(`No domain name found in ${href}`)];
    }
    return [theMatch, null]
}

// eg master is from the aux.wholeMaster, like "testmain-0n0u0e5p.vr" or "testmain-0n0u0e5p.xyz"
// or even testmain-0n0u0e5p-command etc. or other forms we don't know.
export function MasterToFriviousName(master: string): string {
    for (const [name, info] of Object.entries(OurServerList.servers)) {
        const item = info as ServerItem
        // we want the coordinate part (only) to match somewhere. eg "testmain-0n0u0e5p.zzz"
        // we are in total control over these.
        const part1 = item.master.split(".")[0]
        const coordinates = part1.split("-")[1] // now we have just 0n0u0e5p
        if (master.includes(coordinates)) { // look for THAT to find the Frivioulous name.
            return item.name
        }
    }
    return master.split(".")[0]
}

// 1n0u1w4p  street
// testmain-2n0u5w2p
// testmain-2n0u5w2p sheba
// testmain-2n0u5w2p duck  // which one is it?
// testmain-2n0u7w2p  particle
// 127.0.0.1 testmain-2n0u5w2p.zzz
// 127.0.0.1 testmain-2n0u4w2p.zzz // stack
// 127.0.0.1 testmain-0n0u0e5p.zzz
// fake subdomain technique. 
// I think I can make it work through s3 for prod or something. subdomain through knotfree.net for prod. not for local.
// who is the underground giant brown cubes? eg 0n1d2w9p    where are all the 9p's?
//  testmain-0n1d0e9p domain=testmain-0n1d0e9p type=ceiling


// When is this from? 