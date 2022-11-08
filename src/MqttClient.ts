// Copyright 2021-2022 Alan Tracey Wootton
// See LICENSE

//eslint-disable import/first
//import { Buffer } from 'buffer'
// if (!window.Buffer) window.Buffer = Buffer;

import * as mqtt from 'precompiled-mqtt';

import * as utils from './Utils'

import * as saved from './SavedStuff'
import * as registry from './ChangeRegistry'

console.log("starting MqttClient")

// see https://github.com/mqttjs/mqtt-packet

var ReturnAddress = ""

export type MqttParams = {

    hostname: string
}

export var StartMqtHappened = false

export var Publish = (message: string, address: string, nonce: string) => {
    console.log("MqttClient Publish replace me")
}

function reconnect(started: boolean, client: any) {
    if (started && client !== undefined) {
        console.log("client.end()")
        client.end()

        setTimeout(() => {
            registry.PublishChange("NetStatusString", "Reconnecting")
        }, 5000)
    }
    setTimeout(() => {
        StartMqt()
    }, 10000)
}

let MyReturnAddress = ''

export function StartMqt() {

    StartMqtHappened = true

    if (ReturnAddress === '') {
        ReturnAddress = utils.randomString(32)
    }
    MyReturnAddress = ReturnAddress

    var client: any
    var started = true

    mqttOptions.password = saved.getToken()

    if (mqttOptions.password === "") {
        console.log("mqtt token (password) is empty")
        registry.PublishChange("NetStatusString", "mqtt token (password) is empty")
        reconnect(started, client)
        return
    }
    console.log("have token, starting")

    var url = 'ws://knotlocal.com:8085/mqtt'

    const [jtoken, err] = utils.GetPayloadFromToken(mqttOptions.password)
    if (err === "") {
        url = 'ws://' + jtoken.url
        if (!url.endsWith('/mqtt')) {
            url += '/mqtt' // for legacy tokens
        }
        // local dev hacks
        url = url.replace("localhost", "localhost:8085")
        url = url.replace("knotlocal.com", "knotlocal.com:8085")

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

    started = true
    // 'ws://knotfree.net/mqtt' 'ws://localhost:8085/mqtt'

    console.log("mqtt url is ", url)
    client = mqtt.connect(url, mqttOptions)

    console.log("did mqtt.connect ")

    client.on("connect", () => {

        console.log("have on connect")
        registry.PublishChange("NetStatusString", "Connected")

        console.log("subscribing to ", ReturnAddress)
        client.subscribe(ReturnAddress, function (err: any) {

            if (err) {
                console.log("FAIL subscribe error", err)
                reconnect(started, client)
            }

            console.log("done subscribe returnaddr err :", err)
            console.log("subscribing to testtopic")

            client.subscribe('testtopic', function (err: any) {

                if (err) {
                    console.log("FAIL subscribe error", err)
                    reconnect(started, client)
                }

                console.log("done subscribe testtopic err :", err)

                client.publish('testtopic', 'Hello mqtt')

            })
            if (err) {
                console.log("subscribe err", err)
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
        console.log('Received Message ', message.toString())
        // console.log('Received topic ', topic)
        // console.log('Received Message packet ', packet)
        // console.log('Received Message properties ', packet.properties)
        let nonce = ''
        let props: utils.LooseObject = {}
        if (packet.properties.userProperties != undefined) {
            //console.log('Received Message userProperties ', packet.properties.userProperties)
            props = packet.properties.userProperties
        }
        if (props.nonce != undefined) {
            nonce = props.nonce

            if (nonce.startsWith('[')) { // why they do this: I don't know
                nonce = nonce.slice(1)
            }
            if (nonce.endsWith(']')) {
                nonce = nonce.slice(0, nonce.length - 1)
            }
            props.nonce = nonce
        }
        props.message = message
        // console.log('Received Message nonce ', nonce)
        // console.log('Received Message props ', props)
        registry.PublishChange(nonce, props)

        // const nonce = packet.properties.userProperties.nonce
        // console.log('Received Message nonce ', nonce)
    })


    client.on("error", (err: any) => {
        console.log("mqtt on error", err)
        reconnect(started, client)
    })
    client.on("failure", (message: any) => {
        console.log("mqtt on failure", message)
        reconnect(started, client)
    })

    client.on("reconnect", () => {
        console.log("mqtt on reconnect")
        client.subscribe(ReturnAddress, function (err: any) {
            if (err) {
                console.log("FAIL reconnect subscribe error", err)
                reconnect(started, client)
            }
        })
        //reconnect(started, client)
    })

    Publish = (message: string, address: string, nonce: string) => {

        var options: utils.LooseObject = {
            retain: false,
            qos: 0,
            properties: {
                responseTopic: ReturnAddress,
                userProperties: {
                    "nonce": nonce,
                    //"pubk": util.toBase64Url(ourPubk),
                    //"debg": "12345678"
                }
            }
        };

        client.publish(address, message, options)
    }

}

// import { ProxyPortInstance, PacketCallParams } from "./Proxy"

// import * as util from './Util';
// import * as config from './Config';

// //import * as broadcast from './BroadcastDispatcher'

// import { WaitingRequest } from '../api1/Api';
// import * as api from '../api1/Api';
// //import * as eventapi from '../api1/Event';  
// //import * as pingapi from '../api1/Ping'  

// export type MqttServerPropsType = {

//   config: config.ServerConfigList,
//   isClient: boolean,
// }

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

    keepalive: 30 * 10,
    reschedulePings: true,

    protocolId: "MQTT",
    protocol: "ws", // 
    //protocolVersion: 4,
    protocolVersion: 5, // we need this. not 4

    clean: true,
    reconnectPeriod: 4000, // try reconnect after 4 sec
    connectTimeout: 300 * 1000,  // 5 minutes

    // will: {  // atw FIXME: it's not just that we don't implement 'will' it's that it errors. FIXME: fix the go
    //   topic: "WillMsg",
    //   payload: "Connection Closed abnormally..!",
    //   qos: 0,
    //   retain: false,
    // },
    rejectUnauthorized: false,

    clientId: utils.randomString(24),
    user: "someuser",
    username: "someuser",
    password: "",
};

var mqttOptions: MqttOptionsType = SomeMqttOptions;

export function GetMqttOptions(): MqttOptionsType {
    return mqttOptions
}

export function SetMqttOptions(newOptions: MqttOptionsType) {
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
