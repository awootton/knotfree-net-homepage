
import * as nacl from 'tweetnacl-ts'
import { Buffer } from 'buffer'
import * as b64 from "./TypescriptBase64"
import sha256 from "fast-sha256";
import * as types from "./Types";


// See Helpers.tsx for utilities that return JSX


// is this going to leak?
const heartbeatCallbacks = new Map<string, () => void>()

export function AddHeartbeatCallback(key: string, cb: () => void) {

    const got = heartbeatCallbacks.get(key)

    heartbeatCallbacks.set(key, cb)

    if (got === undefined) {
        // if it's our first time
        // take a breath
        setTimeout(() => { cb() }, 1000)
    }
}

export function StartHeartbeatTimer() {
    console.log("starting heartbeatTimer")
    setInterval(() => {
        // console.log("running heartbeatTimer")
        heartbeatCallbacks.forEach((value, key) => {
            // console.log(key);  
            value()
        });

    }, 30 * 1000)
}



export function Sha256Hash(str: string): Uint8Array {
    const data = Buffer.from(str)
    return sha256(data)
}

/* eg
    testString123 makes sender public key   bht-Ka3j7GKuMFOablMlQnABnBvBeugvSf4CdFV3LXs
    testString123 makes sender secret key   VY5e4pCAwDlr-HdfioX6TCiv41Xx_SsTtUcupKndFpQ
    myFamousOldeSaying makes public key   oXbblDIxBsJSt2tYSt20bNLsqs9vIcvZ-WPfZ2uHGgg
    myFamousOldeSaying makes secret key   qhZfxAgr5TypCJ-eQ94pf_LoSskBvVAnYfAKx10ppOA
*/
export function getBoxKeyPairFromPassphrase(phrase: string): nacl.BoxKeyPair {
    const hashBytes = Sha256Hash(phrase)
    const seedKeyPair3 = nacl.box_keyPair_fromSecretKey(hashBytes)
    return seedKeyPair3
}

export function KeypairToBase64(keypair: nacl.BoxKeyPair): [string, string] {

    const pubstr = toBase64Url(Buffer.from(keypair.publicKey))
    const privstr = toBase64Url(Buffer.from(keypair.secretKey))
    return [pubstr, privstr]
}

export function getBase64FromPassphrase(phrase: string): [string, string] {

    const kp = getBoxKeyPairFromPassphrase(phrase)
    return KeypairToBase64(kp)
}

export function GetPayloadFromToken(token: string): [types.KnotFreeTokenPayload, string] {

    const parts = token.split(".")
    if (parts.length !== 3) {
        return [types.EmptyKnotFreeTokenPayload, "not a JWT token "]
    }

    const payloadStr = fromBase64Url(parts[1]).toString()
    // console.log("payloadStr", payloadStr)
    const payload: types.KnotFreeTokenPayload = JSON.parse(payloadStr)

    return [payload, ""]
}


// base64 convert base64 encode base64
export function toBase64Url(buf: Buffer): string {
    const result: string = b64.encode(buf)
    // const lll = result.length 32 to 43
    return result
}

export function fromBase64Url(str: string): Buffer {
    const buf: Buffer = b64.decode(str)
    //const lll = buf.length // 43 to 32
    return buf
}


// FIXME: atw use crypto.randomBytes(size[, callback]) and convert to b64 ?
export function randomString(len: number) {
    const charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var randomString = '';
    for (var i = 0; i < len; i++) {
        var randomPoz = Math.floor(Math.random() * charSet.length);
        randomString += charSet.substring(randomPoz, randomPoz + 1);
    }
    return randomString;
}

export function TokenToLimitsText(token: string): string {
    let str = ''

    let [payload, error] = GetPayloadFromToken(token)
    if (error.length > 0) {
        return error
    }

    let expires = new Date(payload.exp * 1000)
    let expiresStr = expires.getFullYear() + '-' + (expires.getMonth() + 1) + '-' + expires.getDate()

    str += 'Maximum subscriptions       = ' + payload.su + "\n"
    str += 'Maximum connections         = ' + payload.co + "\n"
    str += 'Maximum bytes per sec input = ' + payload.in + "\n"
    str += 'Maximum bytes per sec output = ' + payload.out + "\n"
    str += 'Token expires               = ' + expiresStr + "\n"
    str += 'Token server                = ' + payload.url + "\n"
    str += 'Token billing key           = ' + payload.jti + "\n"

    return str
}

export function KnotFreeTokenStatsToText(payload: types.KnotFreeTokenStats): string {
    let str = ''

    str += 'Current subscriptions       = ' + payload.su + "\n"
    str += 'Current connections         = ' + payload.co + "\n"
    str += 'Current bytes per sec input = ' + payload.in + "\n"
    str += 'Current bytes per sec output = ' + payload.out + "\n"

    return str
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


