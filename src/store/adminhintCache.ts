
import * as types from '../Types'
import * as pipeline from '../Pipeline'
import * as app from '../App'


type adminhintMapItem = {
    adminhint: string;
    // from uniqid to callback
    map: Map<string, (h: string) => any>;
}

let adminhintMap = new Map<string, adminhintMapItem>();

export function getAdminhint(longName: string, uniqueid: string, cb: (h: string) => any) {

    // console.log("lets do get adminhint")

    const key = longName

    let found = adminhintMap.get(key)
    if (found === undefined) {

        let found: adminhintMapItem = {
            adminhint: "",
            map: new Map<string, () => any>(),
        }
        found.map.set(uniqueid, cb)
        adminhintMap.set(key, found)

        function gotAdminhintValue(reply: types.PublishReply) {

            var message: string = reply.message
            if (message !== undefined && !message.toLowerCase().includes("error")) {
                message = message.trim()
                found.adminhint = message
                console.log("adminhintCache got gotadminhintValue", message)
                for (let [key, cb] of found.map) {
                    cb(message)
                }
            }
        }

        let request: types.PublishArgs = {
            ...types.EmptyPublishArgs,
            longName: longName,
            cb: gotAdminhintValue,
            serverName: app.serverName,
            commandString: 'get admin hint'
        }
        pipeline.Publish(request)

    } else {
        if (found !== undefined) {
            if (found.adminhint.length >= 0) {
                found.map.set(uniqueid, cb)
                setTimeout(() => {
                    cb(found ? found.adminhint : "")
                }, 1)
            }
        }
    }
}

// remove is called when a component is unmounted.
export function remove(longName: string, uniqueid: string) {
    const key = longName 
    const found = adminhintMap.get(longName)
    if (found !== undefined) {
        found.map.delete(uniqueid)
        if (found.map.size === 0) {
            adminhintMap.delete(key)
        }
    }
}