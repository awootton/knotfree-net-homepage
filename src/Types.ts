
import * as saved from './SavedStuff'

export type RequestCallbackType = (arg0: PublishReply) => void
export const EmptyRequestCallbackType: RequestCallbackType = (arg0: PublishReply) => { }


export interface PublishArgs extends saved.ThingConfig {

    cb: RequestCallbackType
    serverName: string // knotfree.net or knotfree.com (when local)
  
  //  longName: string
   // shortName: string

   // command: string
  //  description: string

    args: string[]
    // these are 32 bytes each

    // if they are empty then we will not encrypt.
   // thingPubk: Uint8Array

  //  adminPrivk: Uint8Array // we're the admin
   // adminPubk: Uint8Array

    needsEncrypt: boolean

    nonce: string
    isHttps: boolean
    isHttp: boolean // local mode
    isMqtt: boolean

    when: number

    path: string // eg /get/banner?nonce=1234 or /=isd7DFJdec?nonce=1234 if encrypted
    userArgs: Map<string, string>

}

export interface PublishReply extends PublishArgs {
    message: string
    error: string
}

export const EmptyPublishArgs: PublishArgs = {

    cb: EmptyRequestCallbackType,
    serverName: 'knotfree.net',
    longName: '',
    shortName: '',
    commandString: '',
    cmdDescription: '',
    stars: 0,

    cmdArgCount: 0,
    args: [],
    userArgs: new Map<string, string>(),

    thingPublicKey: '',
    adminPrivateKey:  '',
    adminPublicKey:  '',
    needsEncrypt: true,

    nonce: '',
    isHttps: true,
    isHttp: false,// local mode
    isMqtt: false,

    when: 0,
    path: '',
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

export const EmptyKnotFreeTokenStatsLimits: KnotFreeTokenStats = {

    in: 1,
    out: 1,
    su: 1,
    co: 1,
}


/*
 {
   "When":1667999501,
   "Stats":[
      {
         "contactStats":{
            "in":515.4084,
            "out":62.3089,
            "su":0.000005,
            "co":0.0002
         },
         "buf":0,
         "name":"guru-3ae6c40c536c3d22d7f681e81a960a80",
         "http":"10.42.0.183:8080",
         "tcp":"10.42.0.183:8384",
         "guru":true,
         "limits":{
            "contactStats":{
               "in":10000,
               "out":10000,
               "su":1000000,
*/

export type ClusterStat = {

    contactStats: KnotFreeTokenStats
    buf: number
    name: string
    http: string
    tcp: string
    guru: boolean
    mem: number
    con: number
    limits: {
        contactStats: KnotFreeTokenStats
    }
}
export type ClusterStats = {
    When: number
    Stats: ClusterStat[]
}

export const EmptyClusterStats: ClusterStats = {
    When: 0,
    Stats: [
    //     {
    //     contactStats: EmptyKnotFreeTokenStats,
    //     buf: 0,
    //     name: 'dummy',
    //     http: '1.1.1.1',
    //     tcp: '1.1.1.1',
    //     guru: false,
    //     mem: 12345678,
    //     limits: {
    //         contactStats: EmptyKnotFreeTokenStatsLimits
    //     }
    // }
]
}



