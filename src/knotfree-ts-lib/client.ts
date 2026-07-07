
import { Buffer } from 'buffer' // for stinky react native 

import * as net from 'net'
/// import TcpSocket from 'react-native-tcp-socket';

import * as packets from './packets'

// this implements a client of the native knotfree protocol.
// see ./packets.tsx for the wire format
// see ../test/testKnotConnect.ts for example usage

export type ConnectInfo = {
    private_client_not_for_use: net.Socket | any,
    host: string,
    port: number,
    onConnect: () => any,
    onDisconnect: (err: Error) => any,
    onMessage: (msg: Uint8Array) => any,
    verbose?: boolean,
    verboseRaw?: boolean,
    connected:boolean,
    write: (msg: Uint8Array, logMessage: string) => any
}

export const defaultConnectInfo: ConnectInfo = {
    private_client_not_for_use:  undefined, // ?? weird
    port: 8384,
    host: "knotfree.com", // localhost in my /etc/hosts
    onConnect: () => { },
    onDisconnect: (err: Error) => { },// unused ?
    onMessage: (msg: Uint8Array) => { console.log("override msg please", msg.toString()) },
    verbose: false,
    verboseRaw: false,
    connected:false,
    write: (msg: Uint8Array) => { }
}

export type Restarter = {
    connectInfo: ConnectInfo,
    onConnect: (r: Restarter) => any,
    onDisconnect: (r: Restarter, err: Error) => any,
    onMessage: (r: Restarter, msg: Uint8Array) => any,
    dontReconnect: boolean // so the tests can ever end.
}

export function NewDefaultRestarter(): Restarter {
    let r: Restarter = {
        connectInfo: {
            ...defaultConnectInfo,
        },
        onConnect: OnConnectFunction,
        onDisconnect: (r: Restarter, err: Error) => { },
        onMessage: (r: Restarter, msg: Uint8Array) => { console.log("Restarter onMessage", msg.toString()) },
        dontReconnect: false
    }
    r.connectInfo.onConnect = () => {
        r.onConnect(r)
    }
    r.connectInfo.onMessage = (msg: Uint8Array) => {
        r.onMessage(r, msg)
    }
    r.connectInfo.onDisconnect = (err: Error) => {
        r.onDisconnect(r, err)
    }
    // TODO: declare them all like this:
    function OnConnectFunction() {
        console.log("Restarter connected")
    }
    r.onDisconnect = (r: Restarter, err: Error) => {
        console.log("disconnected")
        r.connectInfo.private_client_not_for_use.destroy(err)
        // wait a bit and try again
        if (!r.dontReconnect) {
            setTimeout(() => {
                Startup(r.connectInfo)
            }, 10 * 1000)
        }
    }
    return r
}

export function StartRestarter(restarter: Restarter) {
    Startup(restarter.connectInfo)
}

// reads and writes to the socket
export type Packetizer = {
    restarter: Restarter,
    onConnect: (packer: Packetizer) => any,
    onPacket: (packer: Packetizer, u: packets.Universal) => any
    write: (p: packets.PacketCommon) => any

    token: string,
    subs: string[],

    doSubscriptions: (packer: Packetizer) => any
}

export function NewDefaultPacketizer(): Packetizer {
    let packer: Packetizer = {
        restarter: NewDefaultRestarter(),
        onConnect: onConnectFunction,
        onPacket: (packer: Packetizer, u: packets.Universal) => { console.log("override msg please") },
        write: (p: packets.PacketCommon) => { console.log("override write please", p.toString()) },
        token: "",
        subs: [],
        doSubscriptions: doSubscriptionsFunction
    }
    packer.restarter.onConnect = (r: Restarter) => {
        packer.onConnect(packer)
    }
    var buffer = Buffer.alloc(0)
    packer.restarter.onMessage = (r: Restarter, msg: Uint8Array) => {
        buffer = Buffer.concat([buffer, Buffer.from(msg)])
        let u: packets.Universal | undefined
        let newbuffer: Buffer
        [u, newbuffer] = packets.FromBuffer(buffer)  // will trim the buffer if it gets a full packet, otherwise u will be undefined and the buffer will be unchanged
        buffer = Buffer.from(newbuffer)
        // unmarshal the packet

        if (u) {
            // if (packer.restarter.connectInfo.verbose) {
            //     console.log("packetizer have packet", packets.Asciiizer(Buffer.from(u.toString()), 256))
            // }
            packer.onPacket(packer, u)
        } else {
            //if (packer.restarter.connectInfo.verbose)
                // ?? console.log("packetizer only had partial packet")
        }
    }

    function onConnectFunction(packer: Packetizer) {
        console.log("NewDefaultPacketizer connected")
        // needs to send a connect packet
        let connect = packets.MakeConnect()
        connect.optionalKeyValues.set("token", Buffer.from(packer.token))
        //setTimeout(() => {
        packer.write(connect)
        //},1)
        console.log("packer onConnect")
        packer.doSubscriptions(packer)
    }
    function doSubscriptionsFunction(packer: Packetizer) {
        if (!packer.restarter.connectInfo.connected) {
            return
        }
        let i = 1
        for (let s of packer.subs) {
            let sequence = i
            setTimeout(() => {
                console.log("packer subscribing to", s, sequence)
                let sub = packets.MakeSubscribe()
                sub.Address = { Type: ' ', Bytes: Buffer.from(s) }
                // sub.optionalKeyValues.set('debg', Buffer.from("12345678")) // causes debg logging in the knotfree server
                sub.optionalKeyValues.set('local-hoster', Buffer.from(s))
                packer.write(sub)
            }, i * 100)
            i++
        }
    }
    packer.write = (p: packets.PacketCommon) => {
        let logMessage = ''
        if (packer.restarter.connectInfo.verbose) {
            if (p.backingUniversal.commandType === 'P') {
                p.toBackingUniversal()
                let send = packets.FillSend(p.backingUniversal)
                let payload = send?Buffer.from(send.Payload):Buffer.from('')
                let msg = packets.Asciiizer(payload, 512)
                logMessage = msg// console.log("Packetizer writing Send to socket:" + msg)
                if (packer.restarter.connectInfo.verboseRaw) {
                    console.log("Packetizer writing:----->" + packets.Asciiizer(payload, 99999) + "<-----")
                }
            } else {
                p.toBackingUniversal()
                logMessage = p.backingUniversal.toString()
                //console.log("Packetizer writing to socket", p.backingUniversal.toString())
            }
        }
        const data = packets.PacketToBytes(p)
        packer.restarter.connectInfo.write(data, logMessage)
    }
    return packer
}

// Startup starts the TCP client.
export function Startup(params: ConnectInfo) {

    const options = {
        port: params.port, 
        host:params.host, 
        reuseAddress: true,
    };

    params.private_client_not_for_use = net.createConnection(options, () => {
        // console.log("private_client_not_for_use connected")
    });

    // we only write whole packets so we can setNoDelay.
    params.private_client_not_for_use.setNoDelay(true)
    // params.client.setKeepAlive(true)

    console.log("Startup", params.host, params.port)
    // params.private_client_not_for_use.connect(params.port, params.host)

    params.private_client_not_for_use.on('connect', () =>{
        params.connected = true
        params.onConnect()}
    )

    params.private_client_not_for_use.on('error', (err:any) => {
        console.log('Client: error: ' + err.message)
    })

    params.private_client_not_for_use.on('close', (b: boolean) => {
        if (params.verbose == true) {
            console.log('Client: close: ' + b)
        }
        let err2 = new Error("Client: close: " + b)
        params.private_client_not_for_use.destroy(err2)
        params.connected = false
        params.onDisconnect(err2)
    })

    params.private_client_not_for_use.on('data', (msg: Uint8Array) => {
        if (params.verboseRaw) {
            let bytes = packets.Asciiizer(Buffer.from(msg), 512)
            console.log('Client received data ====>' + bytes + '<====')
        }
        params.onMessage(msg)
    })

    // A fifo queue of Uint8Array to send
    type qitem = {
        msg: Uint8Array,
        logMessage: string
    }
    var sendQueue: qitem[] = []
    var haveTimer = false

    function setTimer() {
        if (!haveTimer) {
            setTimeout(() => {
                haveTimer = false
                // ? if the output is full we should wait. How?
                let item = sendQueue.shift() || { msg: new Uint8Array(0), logMessage: 'undefined' }
                if (params.verbose) {
                    if ( false && params.verboseRaw) {
                        let bytes = packets.Asciiizer(Buffer.from(item.msg), 99999)
                        console.log('Client sending ====>' + bytes + '<====')
                    }
                    // console.log('Client sending', item.logMessage)
                }
                // This is the write to the socket
                // Too many, too fast, will cause replies to buffer in a weird way
                let ok = params.private_client_not_for_use.write(item.msg, dataDone)
                if (!ok) {
                    console.log("write ok", ok)
                }
                function dataDone(err?: Error) {
                    if (err) {
                        console.log('dataDone : error: ' + err.message)
                    } else {
                        // console.log('dataDone : ok')
                    }
                    if (sendQueue.length > 0) {
                        setTimer()// again
                    }
                }
            }, 1)
            haveTimer = true
        }
    }

    params.write = (msg: Uint8Array, logMessage: string) => {
        // it seems to be a problem to write in the same thread as a read or a connect.
        // console.log("write qing", logMessage)
        // TODO: maybe break up the message into smaller parts if > 32k yes yes yes. 
        sendQueue.push({ msg: msg, logMessage: logMessage })
        setTimer()
    }

}

// Copyright 2024,2025 Alan Tracey Wootton
//
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
