
import * as types from '../Types'
import * as pipeline from '../Pipeline'
import * as app from '../App'


type pubkMapItem = {
    pubk: string;
    // from uniqid to callback
    map: Map<string, (h: string) => any>;
}

let pubkMap = new Map<string, pubkMapItem>();

export function subscribe(longName: string, uniqueid: string, cb: (h: string) => any) {


    const key = longName

    let found = pubkMap.get(key)
    if (found === undefined) {

        let found: pubkMapItem = {
            pubk: "",
            map: new Map<string, () => any>(),
        }
        found.map.set(uniqueid, cb)
        pubkMap.set(key, found)

        function gotPubkValue(reply: types.PublishReply) {

            var message: string = reply.message
            if (message !== undefined && !message.toLowerCase().includes("error")) {
                message = message.trim()
                found.pubk = message
                //console.log("pubkCache got gotpubkValue", message)
                for (let [key, cb] of found.map) {
                    cb(message)
                }
            }
        }

        let request: types.PublishArgs = {
            ...types.EmptyPublishArgs,
            longName: longName,
            cb: gotPubkValue,
            serverName: app.serverName,
            commandString: 'get pubk'
        }
        pipeline.Publish(request)

    } else {
        if (found !== undefined) {
            if (found.pubk.length >= 0) {
                found.map.set(uniqueid, cb)
                setTimeout(() => {
                    cb(found ? found.pubk : "")
                }, 1)
            }
        }
    }
}

// remove is called when a component is unmounted.
export function unsubscribe(longName: string, uniqueid: string) {
    const key = longName 
    const found = pubkMap.get(longName)
    if (found !== undefined) {
        found.map.delete(uniqueid)
        if (found.map.size === 0) {
            pubkMap.delete(key)
        }
    }
}