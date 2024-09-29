

//import * as nacl from 'tweetnacl-ts'
import { Buffer } from 'buffer'
import * as utils from './utils'
import * as app from './App'
//import * as saved from './SavedStuff'
import { PublishArgs, PublishReply } from './Types'

// The entry point for the pipeline is the Publish function.
// We will check a cache for the value. If found then return it.
// If not found then we will check the dedup map for the value.
// If found then we will add the request to the dedup map.
// If not found then we will check the retry map for the value.
// If found then we will add the request to the retry map.
// after retry is encryption and then https http or mqtt.


type cacheEntry = {
    message: string
    when: number
}

// cache from params to value . 
// these will accumulate over time.
var cache = new Map<string, cacheEntry>();

// cachedCommandsMap is a map from command to a string and none means no encryption.
// this is also map of commands that we don't want to cache.
// todo: remove this. and the cache I think
const cachedCommandsMap = new Map<string, string>([
    ['get pubk', 'none'],
    ['get admin hint', 'none'],
    ['help', 'none'],
    ['get short name', 'none']
])

// // Timer to check the cache for expired items.
setInterval(() => {
    let now = Date.now()
    cache.forEach((value, key) => {
        if (now - value.when > 1000 * 120) {
            cache.delete(key)
        }
    })
}, 1000 * 30)

export function Publish(request: PublishArgs) {

    if (app.forceLocalMode) {
        request.isHttps = false
        request.isHttp = true
    }
    request.serverName = app.subdomainHttpTarget

    if (request.thingPublicKey.length === 0) {
        request.needsEncrypt = false
    }
    if (request.cmdDescription.includes('🔓')) {
        request.needsEncrypt = false
    }
    const isNone = cachedCommandsMap.get(request.commandString)
    if (isNone === 'none') {
        request.needsEncrypt = false
    }
    if (cachedCommandsMap.has(request.commandString)) {
        let key = getKey(request)
        let value = cache.get(key)
        if (value && request.args.length === 0) { // don't cache if there are args.
            request.cb({ ...request, message: value.message, error: '' })
            return
        }
    }
    Dedup(request)
}

export function PublishReturn(reply: PublishReply) {
    if (cachedCommandsMap.has(reply.commandString)) {
        let key = getKey(reply)
        if (reply.message.length > 0 && reply.error.length === 0 && !reply.commandString.includes('error')) {
            cache.set(key, { message: reply.message, when: Date.now() })
        }
    }
    reply.cb(reply)
}

var dedupMap = new Map<string, PublishArgs[]>();

// dedup. cache of the pending commands. If found then just add to map.
function Dedup(request: PublishArgs) {
    let key = getKey(request)
    let value = dedupMap.get(key)
    if (value) {
        value.push(request)
        return
    } else {
        dedupMap.set(key, [request])
    }
    Retry(request)
}

function DedupReturn(reply: PublishReply) {
    let key = getKey(reply)
    let value = dedupMap.get(key)
    if (value) {
        value.forEach((req) => {
            PublishReturn({ ...req, message: reply.message, error: reply.error })
        })
        dedupMap.delete(key)
    }
}

// timer to retry the pending commands. exponent is 1.3
// times:
// 100 ms
// 398 ms
// 2398 ms
// 24.763 s
// 64.8 s
// 5.3 min
// etc.

setInterval(() => {
    let now = Date.now()

    pendingMap.forEach((value, key) => {
        if (now < value.nextRetry) {
            if (value.count > 4) {
                // give up.
                pendingMap.delete(key)
                DedupReturn({ ...value.request, message: 'timed out', error: 'timed out' })
            } else if (value.nextRetry < now) {
                value.count++
                // try again.
                value.nextRetry = now + 100 * Math.pow(1.3, value.count)

                console.log('retrying ' + value.count + ' ' + (value.nextRetry - now))

                Encrypt(value.request)
            }
        }
    })
}, 100)

var pendingMap = new Map<string, pendingItem>();

type pendingItem = {
    request: PublishArgs,
    nextRetry: number,
    count: number
}

function getKey(request: PublishArgs): string {
    let val = request.longName + '#' + request.commandString + '#' // + request.args.join(',') why failed?
    for (let i = 0; i < request.args.length; i++) {
        val += request.args[i] + "#"
    }
    return val
}

function Retry(request: PublishArgs) {
    let key = getKey(request)
    pendingMap.set(key, { request: request, nextRetry: Date.now() + 500, count: 0 })
    Encrypt(request)
}

function RetryReturn(reply: PublishReply) {
    let key = getKey(reply)
    pendingMap.delete(key)
    DedupReturn(reply)
}

function Encrypt(request: PublishArgs) {

    let path = request.commandString.replaceAll(' ', '/')
    if (request.args.length > 0) {
        path += '/' + request.args.join('/')
    }

    // let's encrypt the message, and form the path.
    if (request.needsEncrypt) {
        console.log('encrypting')
        // add time stamp to the path.
        const now = Math.floor(new Date().getTime() / 1000)
        request.nonce = utils.randomString(24)
        console.log('new nonce', request.nonce)
        request.userArgs.set('nonc', request.nonce)
        request.userArgs.set('admn', request.adminPublicKey.substring(0, 8))
        const message = path + '#' + now
        const bmessage = Buffer.from(message)
        const theirPubk = Buffer.from(request.thingPublicKey, 'base64')
        const ourAdminPrivk = Buffer.from(request.adminPrivateKey, 'base64')
        const nbuffer = Buffer.from(request.nonce)
        var enc = Buffer.from("BoxItItUp failed")
        try {
            enc = utils.BoxItItUp(bmessage, nbuffer, theirPubk, ourAdminPrivk)
        } catch (e) {
            console.log("BoxItItUp failed", e)
        }
        console.log('encrypted nonce', request.nonce)
        console.log('encrypted theirPubk', request.thingPublicKey)
        // verboten: console.log('encrypted ourAdminPrivk', request.adminPrivateKey)

        // let's form the path.
        path = '=' + utils.toBase64Url(enc)
        if (request.userArgs.size > 0) {
            path += '?'

            for (let entry of Array.from(request.userArgs.entries())) {
                let key = entry[0];
                let value = entry[1];
                path += key + '=' + value + '&'
            }


            // request.userArgs.forEach((value: string, key: string) => {
            //     console.log(key, value);
            //     path += key + '=' + value + '&'
            // });
        }
        if (path.endsWith('&')) { // almost every time
            path = path.substring(0, path.length - 1)
        }
        if (path.endsWith('?')) {// this would be a stupid mistake and never happens.
            path = path.substring(0, path.length - 1)
        }

        console.log('encrypted ', path)
        request.path = path

    } else {

        console.log('NOT encrypting', path)
        request.path = path
    }

    if (request.isHttps) {
        Https(request)
    } else if (request.isHttp) {
        Http(request)
    } else if (request.isMqtt) {
        Mqtt(request)
    }
}

function EncryptReturn(reply: PublishReply) {

    // decrypt 
    if (reply.needsEncrypt) {

        // const nonc = reply.userArgs.get('nonc')
        // if (!nonc || !reply.message.startsWith('=')) {
        //     console.log('no nonc')
        //     reply.message = 'error no nonc'
        //     RetryReturn(reply)
        //     return
        // }
        let localmessage = reply.message
        if (localmessage.startsWith('ERROR')) {
            console.log('got error from device', localmessage)
            reply.message = 'ERROR from device:' + localmessage
            RetryReturn(reply)
            return
        }
        if (localmessage.startsWith('=')) {
            // remove the '='
            localmessage = reply.message.substring(1)
        }
        reply.nonce = reply.nonce.split(' ')[0]// sometimes there are two todo: stop that.
        console.log('localmessage', localmessage, 'decrypt nonc', reply.nonce)

        const theirPubk = utils.fromBase64Url(reply.thingPublicKey)
        const ourAdminPrivk = utils.fromBase64Url(reply.adminPrivateKey)
        const bmessage = utils.fromBase64Url(localmessage)
        var dec = Buffer.from("UnBoxIt failed")
        try {
            dec = utils.UnBoxIt(bmessage, Buffer.from(reply.nonce), theirPubk, ourAdminPrivk)
        } catch (e) {
            console.log("UnBoxIt failed", e)
        }

        reply.message = dec.toString()
        if (reply.message.length === 0) {
            console.log('decryption failed len=0', dec)
            reply.message = 'error decryption failed len=0'
            RetryReturn(reply)
            return
        }
        console.log('decrypted ', reply.message)
        // check the timestamp.
        const parts = reply.message.split('#')
        if (parts.length < 2) {
            console.log('no timestamp')
            reply.message = 'error no timestamp'
        } else {
            const now = Math.floor(new Date().getTime() / 1000)
            const then = parseInt(parts[1])
            if (now - then > 30) {
                console.log('too old')
                reply.message = 'error too old'
            } else {
                // remove the timestamp.
                reply.message = parts[0]
            }
        }

        RetryReturn(reply)
    } else {
        RetryReturn(reply)
    }

}

// will call https with the long name
// if it was encrypted then the args are packaged in the message already.
// it mught not be https dependingon variables in App
function Https(request: PublishArgs) {

    let url = app.subdomainPrefix + request.longName + '.' + request.serverName + request.path

    console.log('Https url:', url)

    fetch(url, { mode: 'cors' })
        .then(response => {
            console.log("response headers", ...response.headers);
            console.log("response nonce ", response.headers.get('nonc'))
            response.text().then(data => {
                let str: string = data
                console.log('data received ' + str.slice(0, 20))
                let n = response.headers.get('nonc')
                if (n?.startsWith('[')) {
                    n = n.substring(1)
                    n = n.substring(0, n.length - 1)
                }
                console.log("nonc wil be", n)
                EncryptReturn({ ...request, message: str, error: '', nonce: n != null ? n : 'oops' })
            })
        })
        .catch(error => {
            console.error(error)
            EncryptReturn({ ...request, message: 'Https error', error: error })
        });
}

// will call http with the short name in local mode.
function Http(request: PublishArgs) {

    let type = 'http://'

    let url = type + request.shortName + '.local./' + request.path

    console.log('Http local url:', url)

    fetch(url, { mode: 'cors' })
        .then(response => {

            console.log(...response.headers);
            console.log("response nonce ", response.headers.get('nonc'))
            response.text().then(data => {
                let str: string = data
                console.log('data received ' + str)
                let n = response.headers.get('nonc')
                if (n?.startsWith('[')) {
                    n = n.substring(1)
                    n = n.substring(0, n.length - 1)
                }
                console.log("nonc wil be", n)
                EncryptReturn({ ...request, message: str, error: '', nonce: n != null ? n : 'oops' })
            })
        })
        .catch(error => {
            console.error(error)
            EncryptReturn({ ...request, message: 'Http error', error: error })
        });
}

// fufill the request with mqtt. FIXME: not implemented yet.
function Mqtt(request: PublishArgs) {

    // const nonc = "_" + props.index + "_" + utils.randomString(24)
    // registry.SetSubscripton(nonc, receiveAdminHintInfo)
    // mqtt.Publish('get admin hint', state.config.longname, nonc)

}







// The old versions of what we are doiing here:  (delete this)
// registry.SetSubscripton(registryNameTokenStats, gotUsageStats)
// mqtt.Publish('get stats', payload.jti, registryNameTokenStats)

// registry.SetSubscripton(nonc, receivePubkInfo)
// mqtt.Publish('get pubk', state.config.longname, nonc)

// const nonc = "_" + props.index + "_" + utils.randomString(24)
// registry.SetSubscripton(nonc, receiveAdminHintInfo)
// mqtt.Publish('get admin hint', state.config.longname, nonc)

// registry.SetSubscripton(state.pendingCommandNonc, gotReturnValue)
// mqtt.Publish(cmd, state.config.longname, state.pendingCommandNonc)

// mqtt.Publish('help', state.config.longname, state.pendingHelpNonc)

// const receivePubkInfo = (name: string, arg: any) => {
// let options: types.LooseObject = arg
// var message: string = options.message.toString('utf8')
