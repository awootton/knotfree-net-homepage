
import * as types from '../Types'
import * as pipeline from '../Pipeline'
import * as app from '../App'
import { WatchEventType } from 'fs'


import * as utils from '../utils'

import * as allMgr from './allThingsConfigMgr'
import { EnsureKnotFreePublicKey } from './ensureKnotFreePublicKey'


// TODO: this si unused. Remove it.

// type NameStatusType = { / gone to types.
//     exists: string
//     online: string
// }

type localMapItem = {

    status: types.NameStatusType;
    // from uniqid to callback
    map: Map<string, (stati: types.NameStatusType, err: string) => any>;
}

// from name to localMapItem
let namesMap = new Map<string, localMapItem>();

let knotfreeApiPublicKey = ""

// too bad we can't have a ServiceContaxt_tcp here.

function fetchNameStatus(name: string) {

    let url = app.prefix + app.serverName + "api1/getNameStatus?name=" + name
    fetch(url, { method: "GET" })
        .then(response => response.text())
        .then(data => {
            var str = '' + data
            console.log('nameStatusCache got something:' + str)
            let stat = JSON.parse(str) as types.NameStatusType
            const found = namesMap.get(name)
            if (found !== undefined) {
                for (let [key, cb] of found.map) {
                    cb(stat, "")
                }
            } else {
                console.log('nameStatusCache fetchNameStatus found is undefined')
            }
        })
        .catch(error => {
            console.error(error)
            const found = namesMap.get(name)
            if (found !== undefined) {
                for (let [key, cb] of found.map) {
                    cb({} as types.NameStatusType, "error " + error)
                }
            }
        });

}

export function subscribe(name: string, uniqueid: string, cb: (status: types.NameStatusType, err: string) => any) {

    console.log('nameStatusCache subscribe', name,uniqueid)

    let found = namesMap.get(name)
    if (found === undefined) {

        let found: localMapItem = {
            status: {} as types.NameStatusType,
            map: new Map<string, () => any>(),
        }
        found.map.set(uniqueid, cb)
        namesMap.set(name, found)

        EnsureKnotFreePublicKey((err:string) => {
            if (err !== "") {
                cb({} as types.NameStatusType, err)
                return
            }
            fetchNameStatus(name)
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
        //             fetchNameStatus(name, found)
        //         })
        //         .catch(error => {
        //             console.error(error)
        //             cb({} as types.NameStatusType, "error " + error)
        //         });
        // } else {
        //     fetchNameStatus(name, found)
        // }

    } else {
        if (found !== undefined) {
            // replace the callback
            found.map.set(uniqueid, cb)
            // just go again
            EnsureKnotFreePublicKey(() => {
                if (found !== undefined) {
                    fetchNameStatus(name  )
                }
            })
            // if (found.status !== undefined && found.status.Exists !== undefined) {
            //     found.map.set(uniqueid, cb)
            //     setTimeout(() => {
            //         if (found !== undefined) {
            //             cb(found.status, "")
            //         }
            //     }, 1)
            // } else {
            //     EnsureKnotFreePublicKey(() => {
            //         if (found !== undefined) {
            //             fetchNameStatus(name)
            //         }
            //     })
            // }
        }
    }
}

export function replaceCallback(name: string, uniqueid: string, cb: (status: types.NameStatusType, err: string) => any) {

    console.log('nameStatusCache replaceCallback', name,uniqueid)
    let found = namesMap.get(name)
    if (found !== undefined) {
        found.map.set(uniqueid, cb)
    }
}

// remove is called when a component is unmounted.
export function unsubscribe(name: string, uniqueid: string) {
    const key = name
    const found = namesMap.get(name)
    if (found !== undefined) {
        console.log('nameStatusCache unsubscribe', name,uniqueid)
        found.map.delete(uniqueid)
        if (found.map.size === 0) {
            namesMap.delete(key)
        }
    }
}