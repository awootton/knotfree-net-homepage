// Copyright 2021-2024 Alan Tracey Wootton
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

// import fs from 'fs'

import * as nacl from 'tweetnacl-ts'

import * as util from '../utils'

// import * as  util from '../gotohere/knotservice/Util'
 
// import * as config from '../gotohere/knotservice/Config'

// to run this file :
// 
// npx tsx src/test/testCrypto.ts
//
export { }

console.log("hello crypto")

export function getBoxKeyPairFromPassphrase( phrase: string): nacl.BoxKeyPair {
    const hashBytes = util.Sha256Hash(phrase)
    const seedKeyPair3 = nacl.box_keyPair_fromSecretKey(hashBytes)
    return seedKeyPair3
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

function test1() {

    var senderPass = "testString123"
    var bytes : Uint8Array = util.Sha256Hash(senderPass)

    var str = util.toBase64Url(Buffer.from(bytes));

    console.log(senderPass, " senderPass sha256 hashes to ", str)

    var receiverPass = "myFamousOldeSaying"
    bytes = util.Sha256Hash(receiverPass)

    str = util.toBase64Url(Buffer.from(bytes));

    console.log(receiverPass, "receiverPass sha256 hashes to ", str)

    var skeypair: nacl.BoxKeyPair = getBoxKeyPairFromPassphrase(senderPass)

    var spubstr = util.toBase64Url(Buffer.from(skeypair.publicKey));
    var sprivstr = util.toBase64Url(Buffer.from(skeypair.secretKey));

    console.log(senderPass, "makes sender public key  ", spubstr)
    console.log(senderPass, "makes sender secret key  ", sprivstr)

    var rkeypair: nacl.BoxKeyPair = getBoxKeyPairFromPassphrase(receiverPass)

    var rpubstr = util.toBase64Url(Buffer.from(rkeypair.publicKey));
    var rprivstr = util.toBase64Url(Buffer.from(rkeypair.secretKey));

    console.log(receiverPass, "makes public key  ", rpubstr)
    console.log(receiverPass, "makes secret key  ", rprivstr)

    var message = "this is my test message"
    //const random24 = util.randomString(24)
    var nonce = 'EhBJOkFN3CjwqBGzkSurniXj'
    console.log("nonce is ", nonce, "not b64. these are the 24 bytes")

    //  BoxItItUp(message: Buffer, nonce: Buffer, theirPublicKey: Buffer, ourSecretKey: Buffer): Buffer 
    var boxed =  BoxItItUp(Buffer.from(message), Buffer.from(nonce), Buffer.from(rkeypair.publicKey), Buffer.from(skeypair.secretKey))

    console.log("boxed is ", util.toBase64Url(boxed) )

    // UnBoxIt(message: Buffer, nonce: Buffer, theirPublicKey: Buffer, ourSecretKey: Buffer)
    var unboxed = UnBoxIt(boxed,Buffer.from(nonce), Buffer.from(skeypair.publicKey),Buffer.from(rkeypair.secretKey))

    console.log("unboxed = ", unboxed.toString('utf-8') )
}

test1()

