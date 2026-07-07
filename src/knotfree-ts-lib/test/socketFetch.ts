
import * as client from '../client'
import * as knothttp from '../httpClient'
import * as fs from 'fs'
import * as utils from '../utils'


// npx tsx src/test/socketFetch.ts


{
const data = fs.readFileSync("src/test/isWholeReplyQuestion.txt")
console.log("data hex len = ", data.length)

let isreply = utils.fromHexString(data.toString())
console.log("data len = ", isreply.length)

console.log("====>"+isreply.toString()+"<====")
// fetch http://localhost:5432/
async function doATestGet() {
    const response = await fetch('http://localhost:5432/');
    const data = await response.text();
    console.log("doATestGet got ===================="+data+"====================");
}
doATestGet()

}
// ? Host: atw-ghost.knotfree.com:8085 is required or we get a bad request.

// this one works:
let sampleGetXX_ = `GET / HTTP/1.1
User-Agent: curl/8.7.1
Host: atw-ghost.knotfree.com:8085
Accept: */*

`
let sampleGet_ = `GET / HTTP/1.1
user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36
Host: atw-ghost.knotfree.com:8085
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
accept-encoding: gzip, deflate

`
// its the accept-encoding that is causing the chunked response.

const sampleGet = sampleGet_.split("\x0a").join("\r\n")
console.log(Buffer.from(sampleGet).toString('hex'))
console.log(Buffer.from(sampleGet).toString())

var config = client.defaultConnectInfo
config.host = "localhost"
config.port = 2368
config.verbose = false
config.onMessage = (msg: Uint8Array) => {
    console.log("---->"+Buffer.from(msg).toString('hex')+"<----")
}

// client.Startup(config)
// config.client.write(Buffer.from(sampleGet))

const data = fs.readFileSync("src/test/failedToParseGhostGet.txt")
console.log("data hex len = ", data.length)

let failedToParseGhostChunkedGet = utils.fromHexString(data.toString())
console.log("data len = ", failedToParseGhostChunkedGet.length)

// console.log(failedToParseGhostChunkedGet); // Output: Hello, World!

// 61 + 666561 + 30 

let char = String.fromCharCode(0x61);
console.log(`Character for hex 61 is: ${char}`); // a or 10
  char = String.fromCharCode(0x30);
console.log(`Character for hex 30 is: ${char}`);
console.log(Buffer.from('666561', 'hex').toString('utf-8')) // fea or 4074

// the last 30 is zero followed by 0d0a0d0a.
let pos = knothttp.parseHttp(Buffer.from(failedToParseGhostChunkedGet))
if ( pos !== failedToParseGhostChunkedGet.length ){
    console.log(" error parsed", pos, failedToParseGhostChunkedGet.length)
}

setTimeout(() => {
    console.log("done")
    config.private_client_not_for_use.destroy()
},5000)

