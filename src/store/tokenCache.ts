
import * as types from '../Types'
import * as pipeline from '../Pipeline'
import * as app from '../App'
import * as saved from '../SavedStuff'

// This is really a token payload cache and not the actual token

type tokenMapItem = {
    token: types.KnotFreeTokenPayload;
    // from uniqid to callback
    map: Map<string, (h: types.KnotFreeTokenPayload) => any>;
}

let tokenMap = new Map<string, tokenMapItem>();

export function subscribe(longName: string, uniqueid: string, config: saved.ThingConfig, cb: (h: types.KnotFreeTokenPayload) => any) {

    // console.log("lets do get token")

    const key = longName

    let found = tokenMap.get(key)
    if (found === undefined) {

        let found: tokenMapItem = {
            token: types.EmptyKnotFreeTokenPayload,
            map: new Map<string, () => any>(),
        }
        found.map.set(uniqueid, cb)
        tokenMap.set(key, found)

        function gottokenValue(reply: types.PublishReply) {

            var message: string = reply.message

            console.log("tokenCache got gottokenValue", message)

            if (message !== undefined &&
                 !message.toLowerCase().includes("error") ) {

                message = message.trim()
                // parse the token json as a KnotFreeTokenPayload
                try {
                    var got: types.KnotFreeTokenPayload = JSON.parse(message)
                } catch (e) {
                    console.log("tokenCache error gottokenValue", e)
                    got = types.EmptyKnotFreeTokenPayload
                }       
                if ( got.jti !== "") {
                    found.token = got 
                    console.log("tokenCache publish tokenValue", got)
                    for (let [key, cb] of found.map) {
                        cb(got)
                    }
                }
            }
        }

        let request: types.PublishArgs = {
            ...types.EmptyPublishArgs,
            ...config,
            longName: longName,
            cb: gottokenValue,
            serverName: app.serverName,
            commandString: 'get token',
            cmdDescription: 'get token', // requires encryption
        }
        pipeline.Publish(request)

    } else {
        if (found !== undefined) {
            if (found.token !== undefined && found.token.exp !== 0 && found.token.jti !== "" ) {
                found.map.set(uniqueid, cb)
                setTimeout(() => {
                    cb(found ? found.token : types.EmptyKnotFreeTokenPayload)
                }, 1)
            }
        }
    }
}

// remove is called when a component is unmounted.
export function unsubscribe(longName: string, uniqueid: string) {
    const key = longName 
    const found = tokenMap.get(longName)
    if (found !== undefined) {
        found.map.delete(uniqueid)
        if (found.map.size === 0) {
            tokenMap.delete(key)
        }
    }
}