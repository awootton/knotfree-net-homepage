
import * as types from '../Types'
import * as pipeline from '../Pipeline'
import * as app from '../App'


type shortnameMapItem = {
    shortname: string;
    // from uniqid to callback
    map: Map<string, (h: string) => any>;
}

let shortnameMap = new Map<string, shortnameMapItem>();

export function subscribe(longName: string, uniqueid: string, cb: (h: string) => any) {

    // console.log("lets do get shortname")

    const key = longName

    let found = shortnameMap.get(key)
    if (found === undefined) {

        let found: shortnameMapItem = {
            shortname: "",
            map: new Map<string, () => any>(),
        }
        found.map.set(uniqueid, cb)
        shortnameMap.set(key, found)

        function gotShortnameValue(reply: types.PublishReply) {

            var message: string = reply.message
            if (message !== undefined && !message.toLowerCase().includes("error")) {
                message = message.trim()
                found.shortname = message
                //console.log("shortnameCache got gotShortnameValue", message)
                for (let [key, cb] of found.map) {
                    cb(message)
                }
            }
        }

        let request: types.PublishArgs = {
            ...types.EmptyPublishArgs,
            longName: longName,
            cb: gotShortnameValue,
            serverName: app.serverName,
            commandString: 'get short name'
        }
        pipeline.Publish(request)

    } else {
        if (found !== undefined) {
            if (found.shortname.length >= 0) {
                found.map.set(uniqueid, cb)
                setTimeout(() => {
                    cb(found ? found.shortname : "")
                }, 1)
            }
        }
    }
}

// remove is called when a component is unmounted.
export function unsubscribe(longName: string, uniqueid: string) {
    const key = longName 
    const found = shortnameMap.get(longName)
    if (found !== undefined) {
        found.map.delete(uniqueid)
        if (found.map.size === 0) {
            shortnameMap.delete(key)
        }
    }
}