

import * as utils from './utils';
import * as atwdns from './DnsTypes'

// the help commend returns a list of commands, and the get-unix-time command returns the current unix time.
// [bulk option] add key kv pairs
// [delete] delete a name
// [details] A serialization of the name record
// [exists] returns true if the name exists 🔓
// [get option] get key val. eg A 12.34.56.78 🔓
// [get pubk] device public key 🔓
// [get random] returns a random integer
// [get time] seconds since 1970🔓
// [get txt] get key val. eg A 12.34.56.78 🔓
// [help] lists all commands. 🔓 means no encryption required
// [proxy-status] returns ProxyStatusReturnType 🔓
// [replace options] Replace all the options. Arg is json map in base64.
// [reserve] assign a public key to a name, create  eg "reserve sss.iot bigKnotfreeToken
// [set option] add key subkey value. eg A @ 12.34.56.78 
// [version] info about this thing


export type LookupNameExistsReturnType = {
	Exists: boolean
	Online: boolean
    Owner: string
}

let server = "https://knotfree.net"
// server = "http://knotfree.com:8085" // for local testing
server = atwdns.knotfreeServer

// sends a command to the knotfree.io API, which will execute it on the server. 
export async function sendNameserviceCommand(command: string, domainName: string, keyPair: { pubk: string, priv: string }): Promise<[string,Error|null]> {
    let nonce = utils.randomString(24)
    // console.log('reserve new nonce', nonce)

    // Fetch public key from API. Every time?
    const response = await fetch(server + '/api1/getPublicKey');
    const tmp = await response.text();
    if (!response.ok) {
        console.error('Failed to fetch public key:', response.statusText);
        return ["", new Error('Failed to fetch public key')];
    }
    const theirPubk = tmp || "FAILED -muxcABH_pTsuNqT3yaYfQj-3krwM6XmEu47vTZLSHM"
    // console.log("theirPubk", theirPubk)
    const theirPubkBuffer = utils.fromBase64Url(theirPubk)

    const now = Math.floor(new Date().getTime() / 1000)
    let payload = command + "#" + now

    const ownerPubk = keyPair.pubk
    const message = payload
    const bmessage = Buffer.from(message)
    const ourAdminPrivk = utils.fromBase64Url(keyPair.priv)
    const nbuffer = Buffer.from(nonce)
    var enc: Buffer // = Buffer.from("BoxItItUp failed")
    try {
        enc = utils.BoxItItUp(bmessage, nbuffer, theirPubkBuffer, ourAdminPrivk)
    } catch (e) {
        console.log("delete BoxItItUp failed", e)
        enc = Buffer.from("BoxItItUp failed")
    }
    let url = server + "/api1/nameService?"
    url += "&cmd=" + command
    url += "&nonce=" + nonce
    url += "&pubk=" + ownerPubk
    url += "&name=" + domainName
    url += "&sealed=" + utils.toBase64Url(enc)

    // console.log('nameservice url', url)
    // console.log()

    const response2 = await fetch(url);
    const result = await response2.text();

    // note that the result is not encrypted, it is just a string response from the API. 

    // console.log('result', result)
    // console.log()

    return [result, null]
}

export async function sendNameserviceCommandHarder(command: string, domainName: string, keyPair: { pubk: string, priv: string }): Promise<[string,Error|null]> {

    let counter = 0
    while (true) {
        let result: string
        let err: Error | null
        [result, err] = await sendNameserviceCommand(command, domainName, keyPair)
        if (err) {
            console.error("sendNameserviceCommandHarder Error:", err, counter)
            // wait a bit and try again
            await new Promise(resolve => setTimeout(resolve, 5000))
            counter++
            if (counter >= 5) {
                return ["", new Error("Failed to send nameservice command after 5 attempts: " + err.message)]
            }
        }
        else {
            return [result, null]
        }
    }

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
