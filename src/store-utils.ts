// import * as nacl from 'tweetnacl-ts'
// import { Buffer } from 'buffer'
// import * as b64 from "./TypescriptBase64"
// import sha256 from "fast-sha256";
// import * as types from "./Types";

import * as  saved from './SavedStuff';
import * as configMgr from './store/thingConfigMgr'
import * as allMgr from './store/allThingsConfigMgr'

// search for admin hint matches
export function searchForAdminHintMatches(index: number, config:saved.ThingConfig ,adminhint: string) {

    // let's snoop around looking for another thing with the same admin hint
    // and then copy his adminPublicKey and adminPrivateKey to ourselves
    const all = allMgr.GetGlobalConfig()
    const parts = adminhint.split(' ')
    for (let i = 0; i < parts.length; i++) {
        if (parts[i].length === 0) {
            continue
        }
        const hint = parts[i]
        // also check the users public key for a match
        if ( all.usersPublicKey !== undefined && all.usersPublicKey !== ""){
            if (all.usersPublicKey.substring(0, 8) === hint) {
                const newConfig = {
                    ...config,
                    adminPublicKey: all.usersPublicKey,
                    adminPrivateKey: all.usersPrivateKey,
                }
                configMgr.publish(index, newConfig)
                return
            }    
        }
        // walk the other things.
        for (let j = 0; j < all.things.length; j++) {
            if (all.things[j].adminPublicKey.substring(0, 8) === hint) {
                const newConfig = {
                    ...config,
                    adminPublicKey: all.things[j].adminPublicKey,
                    adminPrivateKey: all.things[j].adminPrivateKey,
                }
                configMgr.publish(index, newConfig)
                return
            }
        }
    }
}

