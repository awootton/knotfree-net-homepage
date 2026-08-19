/// <reference types="node" />

import { Buffer } from 'buffer'
import * as nacl from 'tweetnacl-ts'
import sha256 from "fast-sha256";
import * as  base64 from './TypescriptBase64';
import * as  oct from './Dns8Tree';


// derive domain name from the host name. We don't care about the TLD. We just want the domain name.
// It's only compliicated bececause of debug mode.

// FIXME: atw use crypto.randomBytes(size[, callback]) and convert to b64 ?
// randomString returns a random string of length len in base 62
export function RandomString(len: number) {
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

// stripTLD assumes name and then .TLD. We just want the name. We don't care about the TLD.
// But we DO care if the structure is wrong
// also, this may correctly find the domain as a multilevel domain name. Check the tests. lol.
// get rid of this type of thing.
export function StripTLD(domainName: string): [string, Error | null] {
    const parts = domainName.split('.');
    if (parts.length < 2) {
        //return ["bad_domain_name", new Error("Invalid domain name")];
        // maybe it's already missing the TLD? Let's just return it as is. We don't care about the TLD.
        return [domainName, null];
    }
    let expectedName = parts[0];
    if (expectedName.endsWith("_vr")) { // this odd thing from knotfree subdomain routing.
        expectedName = expectedName.slice(0, -3); // Remove the "_vr" suffix
    }
    return [expectedName, null];
}
     
// FindDomainName os supposed to ding the name (eg ) and return it. eg "testmain-2n0u7w2p"
// it's way to complicated because of the TLD and the subdomain routing. We don't care about the TLD. We just want the domain name.
export function FindDomainName(hostname: string, windowsSearch: string): [string, Error | null] {
    var domainName: string;
    // is it the host? It could be the host and it could have a strange TLD (xxx,zzz)
    domainName = hostname // window.location.hostname;
    // split it and verify it? 
    // it HAS TO have a tld? Right?
    var err: Error | null = null;
    [domainName, err] = StripTLD(domainName); // chop it off, pretend we're good.
    // if (err) either way, keep trying. 
    {
        // it's still ok. this may mean it's localhost, which is useless to us.
        // unless we get it from the query parameter. eg: http://localhost:3010/?domain=testmain-2n0u7w2p.vr&asset=undefined&type=undefined
        const urlParams = new URLSearchParams(windowsSearch);
        const tmp = urlParams.get('domain');
        if (tmp) {
            domainName = tmp;
            // let's remove the suffixes if they exist.
            if (domainName) {
                var err2: Error | null = null;

                [domainName, err2] = StripTLD(domainName);
                if (err2) {
                    // there was no TLD?? What to do about that? - nothing.
                }
                // check for it in a a query paramater.
                // now we should have a good domain name.
                const [cube, err] = oct.StringToCube(domainName);
                if (err) {
                    console.log("AppSplitter domainName is not a valid cube name: " + domainName);
                    return ["", new Error("Domain Name Not Found " + domainName)];
                }
            }
            return [domainName, null]
        }
        // we have no domain name. What to do about that? 
        // console.log("AppSplitter we have no domain name. What to do about that?");
        return ["", new Error("No Domain Name " + windowsSearch)]
    }
    // verify it is a valid cube name. If not, return an error. 
    const [cube, err3] = oct.StringToCube(domainName);
    if (err3) {
        console.log("AppSplitter domainName is not a valid cube name: " + domainName);
        return ["", new Error("Domain Name Not Found " + domainName)];
    }
    return [domainName, null];
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
