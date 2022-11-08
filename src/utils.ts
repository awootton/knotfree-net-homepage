
import * as nacl from 'tweetnacl-ts'
import { Buffer } from 'buffer'
import * as b64 from "./TypescriptBase64"
import sha256 from "fast-sha256";


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

export type KnotFreeTokenStats = {

    in: number   // bytes per sec
    out: number   // bytes per sec
    su: number     // Subscriptions
    co: number   // Connections
}

export const EmptyKnotFreeTokenStats: KnotFreeTokenStats = {

    in: 0,
    out: 0,
    su: 0,
    co: 0,
}


export function GetPayloadFromToken(token: string): [KnotFreeTokenPayload, string] {

    const parts = token.split(".")
    if (parts.length !== 3) {
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

export function KnotFreeTokenStatsToText(payload: KnotFreeTokenStats): string {
    let str = ''

    str += 'Current subscriptions       = ' + payload.su + "\n"
    str += 'Current connections         = ' + payload.co + "\n"
    str += 'Current bytes per sec input = ' + payload.in + "\n"
    str += 'MaxCurrentimum bytes per sec output = ' + payload.out + "\n"

    return str
}

