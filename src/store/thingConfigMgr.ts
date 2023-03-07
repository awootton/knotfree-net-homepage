
import * as  saved from '../SavedStuff' ; 
import * as allMgr from './allThingsConfigMgr' ;

type callbackType = (config:saved.ThingConfig) => any

type thingEntry = {

    index: number,
    map: Map< string, callbackType>,
}

const thingWatchers = new Map<number, thingEntry> ()

export function subscribe( index: number,uniqueid:string,cb: callbackType) {

    var entry = thingWatchers.get(index)
    if (entry === undefined) {
        entry = {
            index: index,
            map: new Map< string, callbackType>()
        }
        thingWatchers.set(index,entry)
    } 
    entry && entry.map.set(uniqueid,cb)
    thingWatchers.set(index,entry)
}   

// remove is called when a component is unmounted.
export function unsubscribe( index:number, uniqueid: string) {

    var entry = thingWatchers.get(index)
    if (entry !== undefined) {
        entry.map.delete(uniqueid)
        if (entry.map.size === 0) {
            thingWatchers.delete(index)
        }
    }
}

// is for when we change the details of a single config at the same index
export function publish( index:number, newConfig: saved.ThingConfig) {

    // console.log("publishing new config for index " + index, newConfig)
    
    let all = allMgr.GetGlobalConfig()
    all.things[index] = newConfig
    allMgr.publish(all,false)// don't refresh ALL the things, but remember

    var entry = thingWatchers.get(index)
    if (entry !== undefined) {
        for (let [key, cb] of entry.map) {
            setTimeout(() => {
                cb(newConfig)
            }, 1) 
        }
    }
}
