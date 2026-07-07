import { assert } from 'console'
import * as client from '../client'
import * as packets from '../packets'
import * as utils from '../utils'
import { buffer } from 'stream/consumers'

// npx tsx src/test/testKnotConnect.ts

let someHex = "53051905180c0600de0bddd73f233a33bf10a41b4d077a0aecab956656c0c3026a7774696436627436736f326837626661657a3937396f73726a326e386c6f63616c2d686f73746572"
// 19 05 18 0c 06
let someBytes = Buffer.from(someHex, 'hex')
let [uuu, bbb] = packets.FromBuffer(someBytes)
if (uuu !== null) { // it's supposed to fail, it's 6 short
    console.log("fail")
    throw new Error("testKnotConnect.ts failed")
}
someBytes = Buffer.concat([someBytes, Buffer.from('atw-wp')])

let [tmp, bbb2] = packets.FromBuffer(someBytes)
const uuu2 = tmp ? tmp as packets.Universal:packets.MakeNullUniversal()
console.log("u", uuu2.toString()) // supposed to end with atw-wp
if (uuu2.data.length !== 5) {
    console.log("fail")
    throw new Error("testKnotConnect.ts failed")
}
if (uuu2.data[4].toString() !== "atw-wp") {
    console.log("fail")
    throw new Error("testKnotConnect.ts failed")
}

const token = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3MzY4OTI1OTEsImlzcyI6Il85c2giLCJqdGkiOiJiZmt3cW1vZmplZWg2NTBmcnQ3bjA2MjkiLCJpbiI6MTUyLCJvdXQiOjE1Miwic3UiOjgsImNvIjo0LCJ1cmwiOiJrbm90ZnJlZS5jb206ODA4NSIsInB1YmsiOiJLNWRkbUQ2c0J5UXpIai1pRTB5QzlNNzdPTlhSSWx6b1lHaGtnemk1LUZnIn0.e9S1qdcf6VZyDjRYtiGgcqGiu-RvEpLK3-NPL-5dmtBlmEhCn-gG_ZA0rtOYJimYKFSgBGjSvjecgZjs9saABQ"

var connect = packets.MakeConnect()
connect.optionalKeyValues.set("key1", Buffer.from("value1"))
connect.optionalKeyValues.set("key2", Buffer.from("value2"))
let bytes = packets.PacketToBytes(connect)
const connect1Bytes = Buffer.from(bytes)
let str = utils.toHexString(Buffer.from(bytes))
// console.log("bytes",str)
let want = '4304040604066b65793176616c7565316b65793276616c756532' //
if (str !== want) {
    console.log("fail")
    console.log("want", want)
    console.log("got", str)
    throw new Error("testKnotConnect.ts failed")
}
let [u, b] = packets.FromBuffer(Buffer.from(bytes))
if (u === undefined) {
    console.log("fail")
    throw new Error("testKnotConnect.ts FromBuffer failed")
}
console.log("u", u)
let tmp2 = packets.FillConnect(u)
const connect2 = tmp2 ? tmp2 as packets.Connect:packets.MakeConnect()

if (connect2 === null) {
    console.log("fail")
    throw new Error("testKnotConnect.ts FillConnect failed")
}
let bytes2 = packets.PacketToBytes(connect2)
let str2 = utils.toHexString(Buffer.from(bytes2))
if (str !== str2) {
    console.log("fail")
    console.log("want", str)
    console.log("got", str2)
    throw new Error("testKnotConnect.ts FillConnect failed")
}

let sub = packets.MakeSubscribe()
sub.Address.Bytes = Buffer.from("destination address")
bytes = packets.PacketToBytes(sub)
str = utils.toHexString(Buffer.from(bytes))
want = '53011364657374696e6174696f6e2061646472657373'
if (str !== want) {
    console.log("fail")
    console.log("want", want)
    console.log("got", str)
    throw new Error("testKnotConnect.ts subscribe failed")
}

var connect = packets.MakeConnect()
connect.optionalKeyValues.set("token", Buffer.from(token))
console.log("len token ", token.length)
bytes = packets.PacketToBytes(connect)
// console.log("bytes len ", bytes.length)
str = utils.toHexString(Buffer.from(bytes))
// console.log("bytes", str)
want = '4302058267746f6b' //
if (!str.startsWith(want)) {
    console.log("fail")
    console.log("want", want)
    console.log("got", str)
    // throw new Error("testKnotConnect.ts failed")
}

let packer = client.NewDefaultPacketizer()
packer.token = token
let received: packets.Universal[] = []
packer.onPacket = (packer: client.Packetizer, u: packets.Universal) => {
    console.log("test knot connect has packet", u.toString())
    received.push(u)
}
const msg1 = connect1Bytes.subarray(0, 3)
const msg2 = connect1Bytes.subarray(3)
packer.restarter.connectInfo.onMessage(msg1)
if (received.length !== 0) {
    console.log("fail msg1") // because it's not a complete packet
}
packer.restarter.connectInfo.onMessage(msg2)
if (received.length !== 1) {
    console.log("fail msg2") // because we have one now
}
console.log("received one", received[0].toString())
received = []
packer.subs = ["testtopic-1"]

client.StartRestarter(packer.restarter)

let timer = setTimeout(() => {
    console.log("ring ring ding ding we're done")
    // did we get the message we expected?
    console.log("received array")
    Array.from(received).forEach((u) => { console.log("u = ", u.toString()) })
    if (received[0].commandType !== "S") {
        console.log("fail")
        // throw new Error("testKnotConnect.ts failed")
    }
    packer.restarter.dontReconnect = true
    packer.restarter.connectInfo.private_client_not_for_use.destroySoon()

}, 1000 * 5)