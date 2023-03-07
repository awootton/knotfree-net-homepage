
import * as  saved from '../SavedStuff';


const globalWatchers = new Map<string, (global: saved.ThingsConfig) => any>()

export function subscribe(uniqueid: string, cb: (global: saved.ThingsConfig) => any) {
    globalWatchers.set(uniqueid, cb)
}

// remove is called when a component is unmounted.
export function unsubscribe(uniqueid: string) {
    const key = uniqueid
    const found = globalWatchers.get(key)
    if (found !== undefined) {
        globalWatchers.delete(key)
    }
}

let currentGlobalConfig: saved.ThingsConfig = saved.retreiveThingsConfig()

// GetGlobalConfig returns a copy. No point in modifying it unless you publish
export function GetGlobalConfig(): saved.ThingsConfig {
    const newGlobalConfig: saved.ThingsConfig = {
        ...currentGlobalConfig
    }
    return currentGlobalConfig
}

// is for when we rearrainge the items or add or delete
export function publish(newConfig: saved.ThingsConfig, refresh: boolean) {
    currentGlobalConfig = newConfig
    saved.saveThingsConfig(newConfig)
    if (refresh) {
        for (let [key, cb] of globalWatchers) {
            setTimeout(() => {
                cb(newConfig)
            }, 1) 
        }
    }
}


