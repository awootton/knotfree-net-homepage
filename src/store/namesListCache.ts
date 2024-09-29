
import * as types from '../Types'
import * as pipeline from '../Pipeline'
import * as app from '../App'
import { WatchEventType } from 'fs'


import * as utils from '../utils'

import * as allMgr from './allThingsConfigMgr'
import { EnsureKnotFreePublicKey } from './ensureKnotFreePublicKey'


type localMapItem = {

    names: types.WatchedTopic[];
    // from uniqid to callback
    map: Map<string, (names: types.WatchedTopic[], err: string) => any>;
}

// from ownerPubk to namesMapItem
var pubk2MapItem = new Map<string, localMapItem>();

// TODO: clean up the 'found' and 'newfound' confusion. It's working now. 
function doNamesListFetch(ownerPubk: string) {

    let c = allMgr.GetGlobalConfig()
    const now = Math.floor(new Date().getTime() / 1000)

    let payload = ownerPubk + "#" + now

    if (ownerPubk !== c.usersPublicKey) { // why pass it in?
        console.log('doNamesListFetch ownerPubk !== allMgr.GetGlobalConfig().usersPublicKey')
    }

    let nonce = utils.randomString(24)
    console.log('namesListCache new nonce', nonce)
    // // request.userArgs.set('nonc', request.nonce)
    // // request.userArgs.set('admn', request.adminPublicKey.substring(0, 8))
    const message = payload
    const bmessage = Buffer.from(message)
    const theirPubk = utils.fromBase64Url(types.knotfreeApiPublicKey)
    const ourAdminPrivk = utils.fromBase64Url(c.usersPrivateKey)
    // console.log('doNamesListFetch ourAdminPrivk', c.usersPrivateKey)
    // console.log('doNamesListFetch theirPubk', types.knotfreeApiPublicKey)
    const nbuffer = Buffer.from(nonce)
    var enc = Buffer.from("BoxItItUp failed")
    try {
        enc = utils.BoxItItUp(bmessage, nbuffer, theirPubk, ourAdminPrivk)
    } catch (e) {
        console.log("BoxItItUp failed", e)
        const found = pubk2MapItem.get(ownerPubk)
        if (found !== undefined) {
            for (let [key, cb] of found.map) {
                cb([], "error " + e)
            }
        }
    }

    let url = app.prefix + app.serverName + "api1/getNames?cmd=" + utils.toBase64Url(enc)
    url += "&nonce=" + nonce
    url += "&pubk=" + ownerPubk

    console.log('namesListCache url', url)

    fetch(url, { method: "GET" })
        .then(response => response.text())
        .then(data => {
            var str = '' + data
            console.log('namesListCache got: ' + str.length + ' bytes')
            let names: types.WatchedTopic[] = []
            if (str !== undefined && !str.toLowerCase().includes("error")) {
                try {
                    // it's in b65
                    let dataBin = utils.fromBase64Url(str)
                    let decoded = utils.UnBoxIt(dataBin, nbuffer, theirPubk, ourAdminPrivk)
                    names = JSON.parse(decoded.toString())
                    console.log('namesListCache got names', names.length)

                    const found = pubk2MapItem.get(ownerPubk)
                    if (found !== undefined) {
                        console.log('namesListCache map size ', found.map.size)
                        for (let [key, cb] of found.map) {
                            cb(names, "")
                        }
                    }
                } catch (e) {
                    console.log("namesListCache error", e)
                    const found = pubk2MapItem.get(ownerPubk)
                    if (found !== undefined) {
                        for (let [key, cb] of found.map) {
                            cb([], "error " + e)
                        }
                    }
                }
            } else {
                console.log('namesListCache got error ' + str)
                const found = pubk2MapItem.get(ownerPubk)
                if (found !== undefined) {
                    for (let [key, cb] of found.map) {
                        cb([], "error " + str)
                    }
                }
            }
        })
        .catch(error => {
            console.error(error)
            const found = pubk2MapItem.get(ownerPubk)
            if (found !== undefined) {
                for (let [key, cb] of found.map) {
                    cb([], "error " + error)
                }
            }
        });

}

export function subscribe(ownerPubk: string, uniqueid: string, cb: (names: types.WatchedTopic[], err: string) => any) {

    const key = ownerPubk

    let found = pubk2MapItem.get(key)
    if (found === undefined) {

        var newfound: localMapItem = {
            names: [],
            map: new Map<string, () => any>(),
        }

        newfound.map.set(uniqueid, cb)
        pubk2MapItem.set(key, newfound)

        let dofetchfunc = ( err:string) => {
            if (err !== "") {
                cb([], err)
                return
            }
            const tmpfound = pubk2MapItem.get(key) // for some reason found is not good here?
            if (tmpfound !== undefined) {
                console.log('namesListCache tmpfound.map.length', tmpfound.map.size)
                doNamesListFetch(ownerPubk)
            } else {
                // why does this ever happen?  It should not. delete this code.
                console.log('namesListCache getPublicKey tmpfound is undefined')
                let wtf: localMapItem = {
                    names: [],
                    map: new Map<string, () => any>(),
                }
                wtf.map.set(uniqueid, cb)
                pubk2MapItem.set(key, wtf)
                doNamesListFetch(ownerPubk)
            }
        }

        EnsureKnotFreePublicKey(dofetchfunc)

        // what is the knotfree api1 public key?
        // if (types.knotfreeApiPublicKey === "") {
        //     let url = app.prefix + app.serverName + "api1/getPublicKey"
        //     console.log('namesListCache getPublicKey url', url, 'newfound.map.length', newfound.map.size)

        //     fetch(url, { method: "GET" })
        //         .then(response => response.text())
        //         .then(data => {
        //             var str = '' + data
        //             types.SetKnotfreeApiPublicKey(str)
        //             console.log('namesListCache getPublicKey got:' + str)
        //             dofetchfunc()
        //             // // why is pubk2MapItem not in scope?
        //             // const tmpfound = pubk2MapItem.get(key) // for some reason found is not good here
        //             // if (tmpfound !== undefined) {
        //             //     console.log('namesListCache getPublicKey got:' + str, 'tmpfound.map.length', tmpfound.map.size)
        //             //     doNamesListFetch(ownerPubk, tmpfound)
        //             // } else {
        //             //     console.log('namesListCache getPublicKey tmpfound is undefined')
        //             // }
        //         })
        //         .catch(error => {
        //             console.error(error)
        //             cb([], "error " + error)
        //         });
        // } else {
        //     doNamesListFetch(ownerPubk, newfound)
        // }

    } else {

        if (found !== undefined) {
            found.map.set(uniqueid, cb)
            // just go again
            EnsureKnotFreePublicKey(()=>{doNamesListFetch(ownerPubk)})

            // if (found.names.length >= 0) {
            //     found.map.set(uniqueid, cb)
            //     setTimeout(() => {
            //         cb(found ? found.names : [], "")
            //     }, 1)
            // }
        }
    }
}

// remove is called when a component is unmounted.
export function unsubscribe(ownerPubk: string, uniqueid: string) {
    const key = ownerPubk
    const found = pubk2MapItem.get(ownerPubk)
    if (found !== undefined) {
        console.log('namesListCache unsubscribe found.map.size', found.map.size)
        found.map.delete(uniqueid)
        if (found.map.size === 0) {
            console.log('namesListCache pubk2MapItem delete', pubk2MapItem)
            pubk2MapItem.delete(key)
        }
    }
}