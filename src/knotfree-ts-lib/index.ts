export * as utils from './utils'
export * as types from './types'
export * as subscriber from "./startPacketSubscription"
export * as packets from "./packets"
export * as knothttp from './httpClient'
export * as base64 from './TypescriptBase64'
export * as msgs from './3d/messageTypes'

export {getFreeToken} from './AccessTokenPageUtil'

// This is supposed to work.
export function ignoreThisFunction(x: number, y: number): number {
    return x + y;
}