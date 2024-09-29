
import * as types from '../Types'
import * as pipeline from '../Pipeline'
import * as app from '../App'
import { WatchEventType } from 'fs'
import { EnsureKnotFreePublicKey } from './ensureKnotFreePublicKey'

import * as utils from '../utils'

import * as allMgr from './allThingsConfigMgr'

type localMapItem = {

    details: types.WatchedTopic;
    // from uniqid to callback
    map: Map<string, (stati: types.WatchedTopic, err: string) => any>;
}

// from name to localMapItem
let namesMap = new Map<string, localMapItem>();

let knotfreeApiPublicKey = ""

// too bad we can't have a ServiceContaxt_tcp here.

function fetchNameDetails(name: string, found: localMapItem) {

    let url = app.prefix + app.serverName + "api1/getNameDetails?name=" + name
    fetch(url, { method: "GET" })
        .then(response => response.text())
        .then(data => {
            var str = '' + data
            console.log('namesDetailsCache got something:' + str)
            let stat = JSON.parse(str) as types.WatchedTopic
            for (let [key, cb] of found.map) {
                cb(stat, "")
            }
        })
        .catch(error => {
            console.error(error)
            for (let [key, cb] of found.map) {
                cb({} as types.WatchedTopic, "error " + error)
            }
        });

}

export function subscribe(name: string, uniqueid: string, cb: (Details: types.WatchedTopic, err: string) => any) {

    let found = namesMap.get(name)
    if (found === undefined) {

        let found: localMapItem = {
            details: {} as types.WatchedTopic,
            map: new Map<string, () => any>(),
        }
        found.map.set(uniqueid, cb)
        namesMap.set(name, found)

        EnsureKnotFreePublicKey((err:string) => {
            if (err !== "") {
                cb({} as types.WatchedTopic, err)
                return
            }
            fetchNameDetails(name, found)
        })

        // what is the knotfree api1 public key?
        // if (knotfreeApiPublicKey === "") {
        //     let url = app.prefix + app.serverName + "api1/getPublicKey"
        //     console.log('namesListCache getPublicKey url', url)

        //     fetch(url, { method: "GET" })
        //         .then(response => response.text())
        //         .then(data => {
        //             var str = '' + data
        //             console.log('namesListCache getPublicKey got:' + str)
        //             knotfreeApiPublicKey = str
        //             fetchNameDetails(name, found)
        //         })
        //         .catch(error => {
        //             console.error(error)
        //             cb({} as types.WatchedTopic, "error " + error)
        //         });
        // } else {
        //     fetchNameDetails(name, found)
        // }

    } else {
        if (found !== undefined) {
            // if (found.status !== undefined) {
                found.map.set(uniqueid, cb)
                    setTimeout(() => {
                        if (found !== undefined) {
                            cb(found.details, "")
                        }
                    }, 1)
            // }
        }
    }
}

// remove is called when a component is unmounted.
export function unsubscribe(ownerPubk: string, uniqueid: string) {
    const key = ownerPubk
    const found = namesMap.get(ownerPubk)
    if (found !== undefined) {
        found.map.delete(uniqueid)
        if (found.map.size === 0) {
            namesMap.delete(key)
        }
    }
}