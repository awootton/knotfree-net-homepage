
// import {assert} from 'chai'; I hate this crap
// import assert from 'node:assert/strict';
import { ok, strictEqual, equal } from 'node:assert';


// npx tsx src/test/testHttp2.ts


const sampleGet_ = `GET /docs/tutorials/linux/shellscripts/howto.html HTTP/1.1
Host: Linode.com
User-Agent: Mozilla/5.0 (Windows; U; Windows NT 6.1; en-US; rv:1.9.1.8) Gecko/20091102 Firefox/3.5.5
Accept: text/html,application/xhtml+xml,
Accept-Language: en-us
Accept-Encoding: gzip,deflate
Accept-Charset: ISO-8859-1,utf-8
Cache-Control: no-cache

` // note the blank line at the end
const samplePost_ = `POST /home/user/datafile HTTP/1.1
From: user@linode33
User-Agent: Mytools/0.8.0
Content-Type: application/json
Content-Length: 33

{['Json-formatted','data pairs']}`
// it's in hex so 11 is 17 bytes
const sampleChunkedData_ = `POST /xx HTTP/1.1
Content-Type: text/plain
Transfer-Encoding: chunked

7
Mozilla
11
Developer Network
0
` 
const sampleChunkedData2_ = `POST /xx HTTP/1.1
Content-Type: text/plain
Transfer-Encoding: chunked

7
Mozilla
11
Developer Network

` // no 0 at the end

const sampleGet = sampleGet_.split("\x0a").join("\r\n")
const samplePost = samplePost_.split("\x0a").join("\r\n")
const sampleChunkedData = sampleChunkedData_.split("\x0a").join("\r\n")
const sampleChunkedData2 = sampleChunkedData2_.split("\x0a").join("\r\n")

console.log("get-->"+Buffer.from(sampleGet).toString('hex'))
console.log("post-->"+Buffer.from(samplePost).toString('hex'))
console.log("chunked-->"+Buffer.from(sampleChunkedData).toString('hex'))
var parts = sampleGet.split("\r\n")
console.log(parts)

parts = samplePost.split("\r\n")
console.log(parts)

{
    const tmp = sampleGet
    const index = tmp.indexOf("\r\n\r\n")
    console.log(index)
    const header = tmp.substring(0, index)
    console.log(header)
    const body = tmp.substring(index + 4)
    console.log(body.length, body)
}

{
    const tmp = samplePost
    const index = tmp.indexOf("\r\n\r\n")
    console.log(index)
    const header = tmp.substring(0, index)
    console.log(header)
    const body = tmp.substring(index + 4)
    console.log(body.length, body)
}

console.log("---   ---   ---   ---   ---   ---   -   ")
console.log("---   ---   ---   ---   ---   ---    ")
console.log("part 3   ---   ---   ---   ---    ")

// now let's actually do the tests
import * as knothttp from '../httpClient'
import * as packets from '../packets'

const httpMon = knothttp.NewDefaultHttpMonger()
var messagesReceivedCount = 0
var messageReceived = ''
httpMon.onMessage = (httpMon: knothttp.HttpMonger, got: Buffer) => {
    console.log("httpMon.onMessage: ", got.toString().length)
    // we want to send this to the server by TCP
    messagesReceivedCount++
    messageReceived = got.toString()
}
// send a GET wrapped in a packet
var send = packets.MakeSend()
send.Payload = Buffer.from(sampleGet + samplePost)
send.toBackingUniversal()
httpMon.packer.onPacket(httpMon.packer, send.backingUniversal)

equal(messagesReceivedCount, 2)

messagesReceivedCount = 0
var send = packets.MakeSend()
send.Payload = Buffer.from(sampleChunkedData + sampleGet)
send.toBackingUniversal()
httpMon.packer.onPacket(httpMon.packer, send.backingUniversal)
equal(messagesReceivedCount, 2)

messagesReceivedCount = 0
var send = packets.MakeSend()
send.Payload = Buffer.from(sampleChunkedData2 + sampleGet)
send.toBackingUniversal()
httpMon.packer.onPacket(httpMon.packer, send.backingUniversal)
equal(messagesReceivedCount, 2)


setTimeout(() => {

    //server.close()
    //server.closeAllConnections()
    console.log("server closed")

}, 1000)


