
import { Buffer } from 'buffer'

import * as client from './client'
import * as packets from './packets'
import * as types from './types'
import * as utils from './utils'


export type httpClientGadget = {
    httpMonger: HttpMonger,
    haveNewConfig: (newConfig: types.ServerConfigList) => any,
}

// only call this once ever, on the creation of the window.
export const startHttpProxy = (config: types.ServerConfigList, host: string, port: number,
    myUpdateLog: (arg: packets.Universal) => void | undefined): httpClientGadget => {

    console.log("startTestHttpProxy called with config", myUpdateLog)
    // map of hashed name b64 to config item
    let hashedNameToConfigItem: { [key: string]: types.ServerConfigItem } = {}

    let http = NewDefaultHttpMonger()
    http.packer.restarter.connectInfo.host = host
    http.packer.restarter.connectInfo.port = port
    http.packer.restarter.connectInfo.verbose = true
    // http.packer.restarter.connectInfo.verboseRaw = true

    http.packer.token = config.token
    function haveNewConfig(newConfig: types.ServerConfigList) {
        // console.log("haveNewConfig called with config", newConfig)
        config = newConfig
        http.packer.subs = []
        hashedNameToConfigItem = {}
        for (let item of newConfig.items) {
            http.packer.subs.push(item.name)
            const hashedName = utils.KnotNameHash2Buffer(item.name)
            hashedNameToConfigItem[utils.toBase64Url(hashedName)] = item
        }
        // also force reconnect
        if (http.packer.restarter.connectInfo.connected) 
            http.packer.restarter.connectInfo.private_client_not_for_use.destroy()
    }
    haveNewConfig(config)
    // the doSubscriptions function happens on connect

    const oldPackerOnPacket = http.packer.onPacket

    http.packer.onPacket = (packer: client.Packetizer, u: packets.Universal) => {
        myUpdateLog(u)
        oldPackerOnPacket(packer, u)
    }
    
    http.onMessage = (http: HttpMonger, got: Buffer, send: packets.Send) => {
        
        console.log("got http message", packets.Asciiizer(got,256))
        myUpdateLog(send.toBackingUniversal())
        // we want the Type and the Path. eg GET /details.md
        let logMsg = ''
        if (http.packer.restarter.connectInfo.verbose) {
            let tmp = got.toString().indexOf(" ")
            tmp = got.toString().indexOf(" ", tmp + 1)// the 2nd space
            logMsg = "Http: " + packets.Asciiizer(got, tmp)
            console.log(logMsg)
        }
        const b = Buffer.from(send.Address.Bytes)
        let item = hashedNameToConfigItem[utils.toBase64Url(b)]
        if (item) {
            // send it to a socket and wait for a response.
            let rep = NewDefaultReplyMonger(http, send)
            // rep.send = send
            rep.connectInfo.host = item.host ? item.host : "localhost"
            rep.connectInfo.port = item.port

            client.Startup(rep.connectInfo)
            rep.onMessage = (rep: ReplyMonger, got: Buffer) => {
                // let msg = "ReplyMonger received:" + packets.Asciiizer(got, 256)
                // console.log(msg)
                // make it into a packet
                let reply = packets.MakeSend()
                reply.Address = send.Source
                reply.Source = { Type: ' ', Bytes: Buffer.from('dummy-return-address') }
                reply.Payload = got
                for (let [key, value] of send.optionalKeyValues) { // echo the options for the sessionKey, etc.
                    reply.optionalKeyValues.set(key, value)
                }
                // reply.optionalKeyValues.set('debg', Buffer.from("12345678")) // causes debg logging in the knotfree server
                reply.toBackingUniversal()
                if (http.packer.restarter.connectInfo.verbose) {
                    console.log("reply:", packets.Asciiizer(got, 32), "for", logMsg)
                }
                http.packer.write(reply) // fly away little bird.
                // close the socket
                setTimeout(() => { // later
                    rep.connectInfo.verbose = false
                    rep.connectInfo.private_client_not_for_use.destroy()
                }, 1000)
            }
            let msg = packets.Asciiizer(got, 256)
            let logMessage = ''
            if (http.packer.restarter.connectInfo.verboseRaw) {
                logMessage = "ReplyMonger posting to port " + rep.connectInfo.port + " with " + msg
            }
            rep.connectInfo.write(got, logMessage) // send the http message to the socket
        } else {
            console.log("ERROR no item for reply", send.backingUniversal.toString())
        }
    }
    client.StartRestarter(http.packer.restarter)

    // re-subscribe to topics every 18 min to keep the connection alive
    setInterval(() => {
            http.packer.doSubscriptions(http.packer)

    }, 18 * 60 * 1000)

    const gadget = {
        httpMonger: http,
        haveNewConfig: haveNewConfig,
        subscribeToNewTopics: http.packer.doSubscriptions(http.packer)
    }
    return gadget
}


// HttpMonger reads packets into http buffers, will write buffer to packetizer
// Two callbacks must be provided, onConnect and onMessage
export type HttpMonger = {
    packer: client.Packetizer,
    onConnect: (http: HttpMonger) => any,
    onMessage: (http: HttpMonger, got: Buffer, send: packets.Send) => any
    write: (b: Buffer, from: packets.Send) => any
}

export function NewDefaultHttpMonger(): HttpMonger {
    let http: HttpMonger = {
        packer: client.NewDefaultPacketizer(),
        onConnect: (http: HttpMonger) => { },
        onMessage: (http: HttpMonger, b: Buffer) => { },
        write: (b: Buffer, from: packets.Send) => { },
    }
    const prevPacketizerOnConnect = http.packer.onConnect
    http.packer.onConnect = (packer: client.Packetizer) => {
        prevPacketizerOnConnect(packer) // does the connect and the subscribes
        http.onConnect(http)
    }
    var buffer = Buffer.alloc(0)
    http.packer.onPacket = (packer: client.Packetizer, u: packets.Universal) => {

        if (!u) {
            console.log("ERROR http onPacket no packet") // kinda fatal
            return
        }
        const send = packets.FillSend(u)
        if (!send) {
            if (http.packer.restarter.connectInfo.verbose) {
                const sub = packets.FillSubscribe(u)
                if (sub) {
                    let dom = sub.optionalKeyValues.get('local-hoster')
                    if (dom) {
                        console.log("suback ", dom.toString())
                    } else {
                        console.log("suback ", "unknown")
                    }
                } else {
                    console.log("http onPacket unknown packet", u.toString())
                }
            }
            return
        }
        buffer = Buffer.concat([buffer, Buffer.from(send.Payload)])
        // if not buffer starts with a http method then return. TODO: regex? something fancy?
        const httpMethods = ["GET ", "POST ", "PUT ", "DELETE ", "HEAD ", "OPTIONS ", "PATCH ","CONNECT ","TRACE "];
        const bufferStr = buffer.toString();
        const startsWithHttpMethod = httpMethods.some(method => bufferStr.startsWith(method));
        if (!startsWithHttpMethod) {
            buffer = buffer.subarray(0,0)
            return; 
        }
        while (true) {
            let contentEndIndex = parseHttp(buffer) // returns -1 if not ready
            if (contentEndIndex < 0) {
                return // not ready yet
            }
            // if we made it this far, we have a complete http packet
            // slice the http packet out of buffer 
            const theHttp = buffer.subarray(0, contentEndIndex)
            buffer = buffer.subarray(contentEndIndex)
            // do we need these?
            console.log("HttpMonger theHttp-->"+theHttp.toString()+"<----------")
            console.log("HttpMonger new buffer-->"+buffer.toString()+"<----------")
            // console.log("got http message", packets.Asciiizer(theHttp,256))
            // console.log("HttpMonger new buffer", packets.Asciiizer(buffer,256))

            http.onMessage(http, theHttp, send)
        }
    }
    http.onConnect = (http: HttpMonger) => {
        console.log("NewDefaultHttpMonger connected")
        // do we need to do anything on connect?
    }
    http.write = (b: Buffer, from: packets.Send) => {
        console.log("NewDefaultHttpMonger write", b.toString(),
            from.toBackingUniversal().toString())
        // make the entire http message into a packet and send it.
        // FIXME: what it it's too big? We fix that later.
        let send = packets.MakeSend()
        send.Address = from.Source
        send.Source = from.Address
        send.Payload = b
        send.optionalKeyValues = {
            ...from.optionalKeyValues
        }
        http.packer.write(send)
    }
    return http
}

// parseHttp tries to find  a complete http message in the buffer
// returns the length of the complete message or -1 if not ready yet
// TODO: a state machine to enable streaming.
export function parseHttp(buffer: Buffer): number {
    try {
        // console.log("http parsing http", buffer.toString().split("\r\n")[0])
        // parse the buffer for complete http packets
        // including the content 
        let headerEndIndex = buffer.indexOf("\r\n\r\n")
        if (headerEndIndex < 0) {
            return -1// not ready yet
        }
        headerEndIndex += 4
        const theHeader = buffer.subarray(0, headerEndIndex)
        // what's the content length?
        var clenIndex = theHeader.indexOf("Content-Length:")
        if (clenIndex < 0) { // does this ever happen?
            clenIndex = theHeader.indexOf("content-length:")
        }
        let contentLength = 0
        if (clenIndex >= 0) {
            const size = "content-length:".length
            const clenEndIndex = theHeader.indexOf("\r\n", clenIndex)
            let clenStr = theHeader.subarray(clenIndex + size, clenEndIndex).toString()
            clenStr = clenStr.trim()
            contentLength = parseInt(clenStr)
        }
        // TODO: check for chunked encoding?
        if (contentLength === 0) {
            // const size = "Transfer-Encoding:".length
            var clenIndex = theHeader.indexOf("Transfer-Encoding:")
            // const clenEndIndex = buffer.indexOf("\r\n", clenIndex)
            // const clenStr = buffer.subarray(clenIndex + size, clenEndIndex).toString()
            // if (clenStr.indexOf("chunked") >= 0) 
            if (clenIndex >= 0) {
                let pos = headerEndIndex
                while (true) {
                    let [aLen, pops] = readChunkLength(buffer, pos)
                    if (aLen < 0) {
                        return -1// http not ready yet
                    }
                    if (aLen === 0) {
                        contentLength = pops - headerEndIndex
                        break
                    }
                    // console.log("chunked encoding part", buffer.subarray(pops, pops + aLen).toString())
                    pos = pops + aLen
                }
            }
        }
        const contentEndIndex = headerEndIndex + contentLength
        if (contentEndIndex > buffer.length) {
            return -1// not ready yet
        }
        return contentEndIndex
    } catch (error) {
        console.log("http message short")
        return -1
    }
    return -1
}

// readChunkLength reads the chunk length from a buffer
// starting at pos. pass the \r\n then read the hex number
// then pass the \r\n and return the length and the new position
// at the end we return 0 
// if the buffer isn't big enough, we return -1
function readChunkLength(buffer: Buffer, pos: number): [number, number] {
    let aLen = 0
    let pops = pos
    let c = buffer.readUInt8(pops)
    if (c === 0x0d) { // this gets skipped on the first one
        pops++
        c = buffer.readUInt8(pops++)
        if (c !== 0x0a) {
            // what do we do now?
            console.log("chunked encoding error")
        }
    }
    const numStart = pops
    while (true) { // pass the hex number
        c = buffer.readUInt8(pops)
        if (c <= 0x0d) {
            break
        }
        pops++
    }
    const lenstr = buffer.subarray(numStart, pops).toString()
    aLen = 0
    if (lenstr.length > 0) {
        aLen = parseInt(lenstr, 16)
    }
    c = buffer.readUInt8(pops)
    if (c === 0x0d) {
        pops++
        c = buffer.readUInt8(pops++)
        if (c !== 0x0a) {
            // what do we do now?
            console.log("chunked encoding error")
        }
    }
    // another crlf ? some examples have it.
    if (aLen === 0) { // see https://www.geeksforgeeks.org/http-headers-transfer-encoding/
        // actually, we're supposes to pass some headers now?
        // if there's two crlfs, we're done.
        c = buffer.readUInt8(pops)
        if (c === 0x0d) {
            pops++
            c = buffer.readUInt8(pops++)
            if (c !== 0x0a) {
                // what do we do now?
                console.log("chunked encoding error")
            }
            aLen = 0
        }
    }
    return [aLen, pops]
}

// ReplyMonger opens a socket and listens for http replies.
// the onMessage callback is called when a whole reply is parsed.
export type ReplyMonger = {
    connectInfo: client.ConnectInfo, // the connection info
    onMessage: (monger: ReplyMonger, msg: Buffer) => any,
    httpMonger: HttpMonger,
    send: packets.Send
}

export function NewDefaultReplyMonger(httpMonger: HttpMonger, send: packets.Send): ReplyMonger {
    let monger: ReplyMonger = {
        connectInfo: {
            ...client.defaultConnectInfo,
        },
        onMessage: (monger: ReplyMonger, msg: Buffer) => { console.log("override msg please", msg.toString()) },
        httpMonger: httpMonger,
        send: send
    }
    var buffer = Buffer.alloc(0)
    monger.connectInfo.onMessage = (msg: Uint8Array) => {
        buffer = Buffer.concat([buffer, Buffer.from(msg)])
        while (true) {
            // parse the buffer for complete http packets
            // TODO: a state machine to enable streaming and NOT complete http packets
            let contentEndIndex = parseHttp(buffer) // returns -1 if not ready
            if (contentEndIndex < 0) {
                return // not ready yet
            }
            // if we made it this far, we have a complete http packet
            // slice the http packet out of buffer 
            const theHttp = buffer.subarray(0, contentEndIndex)
            buffer = buffer.subarray(contentEndIndex) // leave the rest in the buffer.
            //console.log("HttpMonger theHttp-->"+theHttp.toString()+"<----------")
            //console.log("HttpMonger new buffer-->"+buffer.toString()+"<----------")
            monger.onMessage(monger, theHttp)
        }
    }
    return monger
}


// Copyright 2026 Alan Tracey Wootton
// See LICENSE
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.
