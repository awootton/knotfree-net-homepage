
import * as types from '../Types'
import * as pipeline from '../Pipeline'
import * as app from '../App'


type helpMapItem = {
    help: string;
    // from uniqid to callback
    map: Map<string, (h: string) => any>;
}

let helpMap = new Map<string, helpMapItem>();

export function getHelp(longName: string, uniqueid: string, cb: (h: string) => any) {

    // console.log("lets do get help")

    const key = longName

    let found = helpMap.get(key)
    if (found === undefined) {

        let found: helpMapItem = {
            help: "",
            map: new Map<string, () => any>(),
        }
        found.map.set(uniqueid, cb)
        helpMap.set(key, found)

        function gotHelpValue(reply: types.PublishReply) {

            var message: string = reply.message
            if (message !== undefined && !message.toLowerCase().includes("error")) {
                message = message.trim()
                found.help = message
                //console.log("helpCache got gotHelpValue", message)
                for (let [key, cb] of found.map) {
                    cb(message)
                }
            }
        }

        let request: types.PublishArgs = {
            ...types.EmptyPublishArgs,
            longName: longName,
            cb: gotHelpValue,
            serverName: app.serverName,
            commandString: 'help'
        }
        pipeline.Publish(request)

    } else {
        if (found !== undefined) {
            if (found.help.length >= 0) {
                found.map.set(uniqueid, cb)
                setTimeout(() => {
                    cb(found ? found.help : "")
                }, 1)
            }
        }
    }
}

// remove is called when a component is unmounted.
export function remove(longName: string, uniqueid: string) {
    const key = longName 
    const found = helpMap.get(longName)
    if (found !== undefined) {
        found.map.delete(uniqueid)
        if (found.map.size === 0) {
            helpMap.delete(key)
        }
    }
}