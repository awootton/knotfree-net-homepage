/// <reference types="node" />

import { Buffer } from 'buffer'
import * as nacl from 'tweetnacl-ts'
import sha256 from "fast-sha256";
import * as  base64  from './TypescriptBase64';


// FIXME: atw use crypto.randomBytes(size[, callback]) and convert to b64 ?
// randomString returns a random string of length len in base 62
export function randomString(len: number) {
    const charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var randomString = '';
    for (var i = 0; i < len; i++) {
        var randomPoz = Math.floor(Math.random() * charSet.length);
        randomString += charSet.substring(randomPoz, randomPoz + 1);
    }
    return randomString;
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


// base64 convert base64 encode base64
export function toBase64Url(buf: Buffer): string {
    const result: string = base64.encode(buf)
    // const lll = result.length 32 to 43
    return result
}

export function fromBase64Url(str: string): Buffer {
    const buf: Buffer = base64.decode(str)
    //const lll = buf.length // 43 to 32
    return buf
}

export function toHexString(bytes: Buffer): string {
    return bytes.toString('hex') // .toUpperCase();
}

export function fromHexString(hexString: string): Buffer {
    return Buffer.from(hexString, 'hex')
}


export function Sha256Hash(str: string): Uint8Array {
    const data = Buffer.from(str)
    return sha256(data)
}

export function BoxItItUp(message: Buffer, nonce: Buffer, theirPublicKey: Buffer, ourSecretKey: Buffer): Buffer {
    const mySecretKey = ourSecretKey
    const rtmp = nacl.box(message, nonce, theirPublicKey, mySecretKey)
    const result = Buffer.from(rtmp)
    return result
}

export function UnBoxIt(message: Buffer, nonce: Buffer, theirPublicKey: Buffer, ourSecretKey: Buffer): Buffer {
    var publicKey = theirPublicKey
    const mySecretKey = ourSecretKey
    const rtmp = nacl.box_open(message, nonce, publicKey, mySecretKey)
    const result = Buffer.from(rtmp || Buffer.from(""))
    return result
}

// a crappy hash function
export function djb2Hash(str: string): number {
  let hash = 5381;
  
  for (let i = 0; i < str.length; i++) {
    // Left shift bitwise operation combined with character extraction
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  
  return hash >>> 0; // Converts result into an unsigned 32-bit integer
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
