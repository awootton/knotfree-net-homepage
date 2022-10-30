
import * as nacl from 'tweetnacl-ts'
import { Buffer } from 'buffer'
import * as b64 from "./TypescriptBase64"
import sha256 from "fast-sha256";

// LooseObject is for when we can't help cheating.
export interface LooseObject { // decend mqtt user props from this 
    [key: string]: any
}

// KnotFreeTokenPayload is what all the knotfree tokens have on the inside.
export type KnotFreeTokenPayload = {

    exp: number  // ExpirationTime unix seconds 
    iss: string   // Issuer first 4 bytes (or more) of base64 public key of issuer
    jti: string  // JWTID a unique serial number for this token

    in: number   // bytes per sec
    out: number   // bytes per sec
    su: number     // Subscriptions
    co: number   // Connections

    url: string // a server/path
}

export const EmptyKnotFreeTokenPayload: KnotFreeTokenPayload = {
    //
    exp: 0,
    iss: "",
    jti: "",

    in: 0,
    out: 0,
    su: 0,
    co: 0,

    url: ""
}

export function GetPayloadFromToken(token: string): [KnotFreeTokenPayload, string] {

    const parts = token.split(".")
    if (parts.length != 3) {
        return [EmptyKnotFreeTokenPayload, "not a JWT token "]
    }

    const payloadStr = fromBase64Url(parts[1]).toString()
    console.log("payloadStr", payloadStr)
    const payload: KnotFreeTokenPayload = JSON.parse(payloadStr)

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
