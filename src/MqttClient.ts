// Copyright 2021-2022 Alan Tracey Wootton
// See LICENSE

//eslint-disable import/first
//import { Buffer } from 'buffer'
// if (!window.Buffer) window.Buffer = Buffer;

import * as mqtt from 'precompiled-mqtt';

import * as utils from './Utils'

import * as saved from './SavedStuff'
import * as registry from './ChangeRegistry'

import * as types from "./Types";


import * as app from "./App";


console.log("starting MqttClient")

// see https://github.com/mqttjs/mqtt-packet

export type MqttParams = {

    hostname: string
}

export var StartMqtHappened = false

let pendingPings = 0

let sentPings = 0

export function Publish(message: string, address: string, nonc: string) {
    setTimeout(() => {
        publishfunc(message, address, nonc)
        // what the actual fuck is going on here why this is needed? TODO: FIXME
        // some kind of weird race condition? 
        if (pendingPings < 20) {
            pendingPings++
            setTimeout(() => {
                publishfunc('ping', MyReturnAddress, '')
                pendingPings--
            }, 100 + pendingPings * 10);
        }
    }, 1)
}

var publishfunc = (message: string, address: string, nonc: string) => {
    console.log("MqttClient Publish replace me")
}

function reconnect(started: boolean, client: any) {
    if (started && client !== undefined) {
        console.log("reconnect ending client", client.options.clientId)

        // what is the function here? client.disconnect()
        // what is the function here? client.close()
        client.end({ force: true })

        setTimeout(() => {
            registry.PublishChange("NetStatusString", "Reconnecting")
        }, 2000)
    }
    setTimeout(() => {
        console.log("reconnect calling StartMqt now")
        StartMqt()
    }, 10000)
}

const MyReturnAddress = utils.randomString(32)

export function StartMqt() {

    StartMqtHappened = true

    var client: any
    var started = true

    mqttOptions.password = saved.getToken()

    if (mqttOptions.password === "") {
        console.log("mqtt token is empty")
        registry.PublishChange("NetStatusString", "Token is missing. Get token from ACCESS TOKEN tab.")
        reconnect(started, client)
        return
    }
    console.log("have token, starting")

    // app.serverName eg knotfree.io:/  or knotfree.net:/ 
    var mqttWsHost = app.serverName + 'mqtt'
    let wtype = "ws"

    // get the url from the  token
    const [jtoken, err] = utils.GetPayloadFromToken(mqttOptions.password)
    if (err === "") {

        mqttWsHost = mqttWsHost.replace("localhost:3000", "localhost")
        mqttWsHost = mqttWsHost.replace("localhost", "localhost:8085")
        mqttWsHost = mqttWsHost.replace("knotlocal.com", "knotlocal.com:8085")
        mqttWsHost = mqttWsHost.replace("knotfree.com", "knotfree.com:8085")

        if (mqttWsHost.includes('knotfree.io')) {
            mqttWsHost = 'ws://' + mqttWsHost
            wtype = "ws"
        } else if (mqttWsHost.includes('local')) {
            mqttWsHost = 'ws://' + mqttWsHost
            wtype = "ws"
        } else {// is knotfree.net
            mqttWsHost = 'wss://' + mqttWsHost
            wtype = "wss"
        }

    } else {
        const server = saved.getMqttServer()
        if (server !== '') {

        } else {
            console.log("What is the mqtt server?")
            registry.PublishChange("NetStatusString", "No knotfree token. What is the mqtt server?")
            reconnect(started, client)
            return
        }
    }

    const ourMqttOptions: MqttOptionsType = {
        ...SomeMqttOptions
    }
    ourMqttOptions.clientId = utils.randomString(24)
    ourMqttOptions.user = ourMqttOptions.clientId
    ourMqttOptions.username = ourMqttOptions.clientId
    ourMqttOptions.protocol = wtype

    started = true
    // 'ws://knotfree.io/mqtt' or 'ws://localhost:8085/mqtt' or 'wss://knotfree.net/mqtt'


    console.log("Connecting to new client ", mqttWsHost, ourMqttOptions.clientId)
    client = mqtt.connect(mqttWsHost, ourMqttOptions)

    client.on("connect", () => {

        console.log("have on connect")
        registry.PublishChange("NetStatusString", "Connected")

        console.log("subscribing to ", MyReturnAddress)
        client.subscribe(MyReturnAddress, function (err: any) {

            if (err) {
                console.log("FAIL subscribe error", err, client.options.clientId)
                reconnect(started, client)
            }

            console.log("done subscribe returnaddr err :", err)

            // console.log("subscribing to testtopic")
            // client.subscribe('testtopic', function (err: any) {
            //     if (err) {
            //         console.log("FAIL subscribe error", err)
            //         reconnect(started, client)
            //     }
            //     console.log("done subscribe testtopic err :", err)
            //     client.publish('testtopic', 'Hello mqtt')

            // })

            if (err) {
                console.log("subscribe err", err, client.options.clientId)
                reconnect(started, client)
            }
        })
    })

    // client.on("message",  (topic: any, message: any, packet: any) => {
    //     console.log("mqtt message",message.toString())
    // })

    // cmd:"publish"
    // dup:false
    // length:100
    // payload:Uint8Array(14)[49, 53, 58, 56, 32, 99, 111, 117, 110, 116, 32, 49, 52, 51, buffer: ArrayBuffer(102), byteLength: 14, byteOffset: 88, length: 14, Symbol(Symbol.toStringTag): 'Uint8Array']
    // properties:
    //     responseTopic:" random unwatched return address"
    //     userProperties:
    //         hello:"world"

    client.on('message', function (topic: any, msgUntyped: any, packet: any) {

        let message = msgUntyped
        // console.log('Received Message ', message.toString())
        // console.log('Received topic ', topic)
        // console.log('Received Message packet ', packet)
        // console.log('Received Message properties ', packet.properties)
        let nonc = ''
        let props: types.LooseObject = {}
        if (packet.properties.userProperties !== undefined) {
            //console.log('Received Message userProperties ', packet.properties.userProperties)
            props = packet.properties.userProperties
        }
        if (props.nonc !== undefined) {
            nonc = props.nonc

            while (nonc.startsWith('[')) { // why they do this: I don't know
                nonc = nonc.slice(1)
            }
            while (nonc.endsWith(']')) {
                nonc = nonc.slice(0, nonc.length - 1)
            }
            props.nonc = nonc
        }
        props.message = message

        const strmsg = Buffer.from(message).toString()
        if (strmsg === 'ping') {
            // console.log('Received ping ', sentPings)
            sentPings--
        } else {
            console.log('Received Message ', strmsg, nonc)
        }

        // console.log('Received Message props ', props)
        registry.PublishChange(nonc, props)

        // const nonc = packet.properties.userProperties.nonc
        // console.log('Received Message nonc ', nonc)
    })


    client.on("error", (err: any) => {
        console.log("mqtt on error", client.options.clientId)
        registry.PublishChange("NetStatusString", "Error")
        reconnect(started, client)
    })

    client.on("failure", (message: any) => {
        console.log("mqtt on failure", message, client.options.clientId)
        registry.PublishChange("NetStatusString", "Failed")
        reconnect(started, client)
    })

    client.on("disconnect", (message: any) => {
        console.log("mqtt on disconnect", message, client.options.clientId)
        registry.PublishChange("NetStatusString", "Disconnected")
        reconnect(started, client)
    })

    client.on("offline", (message: any) => {
        console.log("mqtt on offline", message, client.options.clientId)
        registry.PublishChange("NetStatusString", "Offline")
        reconnect(started, client)
    })

    client.on("end", () => {
        console.log("mqtt on end", client.options.clientId)
        registry.PublishChange("NetStatusString", "Ended")
        // this would create a loop: reconnect(started, client)
    })

    client.on("reconnect", () => {
        console.log("mqtt on reconnect", client.options.clientId)
        registry.PublishChange("NetStatusString", "Connected")
        client.subscribe(MyReturnAddress, function (err: any) {
            if (err) {
                console.log("FAIL reconnect subscribe error", err)
                reconnect(started, client)
            }
        })
        //reconnect(started, client)
    })

    publishfunc = (message: string, address: string, nonc: string) => {

        var options: types.LooseObject = {
            retain: false,
            qos: 0,
            properties: {
                responseTopic: MyReturnAddress,
                userProperties: {
                    "nonc": nonc,
                    //"pubk": util.toBase64Url(ourPubk),
                    //"debg": "12345678"
                }
            }
        };
        if (message === 'ping') {
            sentPings++
            // console.log("Sending ping message ", sentPings)
        } else {
            console.log("Sending publish message ", message, nonc, address)
        }

        // const pgot = 
        client.publish(address, message, options)
        //console.log("mqtt pgot",pgot)
    }

}


export type MqttOptionsType = {
    keepalive: number,
    reschedulePings: boolean,
    protocolId: string,
    protocol: any,
    //protocolVersion: 4,
    protocolVersion: number,//5,
    clean: boolean,//true,
    reconnectPeriod: number,//1000,
    connectTimeout: number,//30 * 1000,
    // will: { // atw FIXME: this will cause error if present. 
    //   topic: string,//"WillMsg",
    //   payload: string,//"Connection Closed abnormally..!",
    //   qos: number,//0,
    //   retain: boolean,//false,
    // },
    rejectUnauthorized: false,

    clientId: string,//this.state.clientId,
    user: string,//this.state.username,
    username: string,
    password: string,//this.state.token
};

//export 
const SomeMqttOptions: MqttOptionsType = {

    keepalive: 30 * 10,// 5 min
    reschedulePings: true,

    protocolId: "MQTT",
    protocol: "wss", // 
    //protocolVersion: 4,
    protocolVersion: 5, // we need this. not 4

    clean: true,
    reconnectPeriod: 10000,// 0 means no reconnect, was 4000, // try reconnect after 4 sec
    connectTimeout: 30 * 1000,  // wait 30 sec for conack

    // will: {  // atw FIXME: it's not just that we don't implement 'will' it's that it errors. FIXME: fix the go
    //   topic: "WillMsg",
    //   payload: "Connection Closed abnormally..!",
    //   qos: 0,
    //   retain: false,
    // },
    rejectUnauthorized: false,

    clientId: 'replaced', // utils.randomString(24),
    user: "someuser",
    username: "someuser",
    password: "",
};

var mqttOptions: MqttOptionsType = SomeMqttOptions;

export function GxxxetMqttOptions(): MqttOptionsType {
    return mqttOptions
}

export function xxxSetMqttOptions(newOptions: MqttOptionsType) {
    mqttOptions = newOptions
}



// Copyright 2021-2022 Alan Tracey Wootton
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
