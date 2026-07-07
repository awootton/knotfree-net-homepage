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
    isHttps: boolean // knotfree.net and knotfree.io
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
    adminPrivateKey: '',
    adminPublicKey: '',
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

