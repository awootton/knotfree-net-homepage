


// We're usiing the pubsub for communication. Not this.
// This is for the messages to support the pubsub bridge.,

// TODO: make this all into that cloudflare rpc: thing 'Cap'n Web'?, Maybe.
// just as soon as we have enough here to know what we require. We're layers below that now.

import * as oct from './Dns8Tree'

export const magicMessageNumber = 344334655366081 // compares faster. 
export const magicMessageString = "344334655366081"

// You know, to, from and cmd (and some bits) are enought to run the entire internet. Think on that. 

export function tracebridgemesses(msg: string, ...args: any[]) {
    if (msg.includes(magicMessageString)) {
        console.log("PubSubBridge: ", msg, ...args)
    }
}

// We are not using this as our messaging system. This is just for the pubsub bridge.
export type MessageBaseClass = {

    to: string;             // for routing to the correct recipient
    from: string;           // for identifying the sender
    cmd: string;            // the command or action to be performed
    magic: number;      // is ALWAYS magicMessageNumber, eg ALWAYS messes.magicMessageNumber or else this is not one of ours. 
                        // and we don't have to log it or look at it. It's not one of ours.

    // these should be an array of byte array but I don't know this language that well
    // so we'll see. Blobs and references to frame buffers may have special rules. We'll see.
 
    // I always start mine with "=" and then the rest of the b64.
    // in knotfree I do \0 and then the rest of the blob. 
    // or argType
    // Really, a Blob. Just one Blob. One. Does this work. That sounds good to me.
    // args: (string | Uint8Array | Blob)[] // of string or base64 encoded data. This is the payload of the message. It can be empty, or it can be a list of strings or base64 encoded data. The recipient will have to know how to interpret this.

    // do we? timestamp: number;   // for ordering messages
    // do we type: string;        // for identifying the message type - no. 
    // we may need to add more fields here for other purposes, such as message priority, etc. ?
}

// the same as a publish message.
export type MessagePublishClass<T> = MessageBaseClass &  {
    key: string;// topic name
    who: string;
    status: T;  
    err: Error;  
}

export type MessageSubscribeClass = MessageBaseClass &  {
    key: string; // how is this dufferent from to and from?  
    who: string;
    // we can't send a callback, we have to remember it.
}

export type MessageDumpReplyClass = MessageBaseClass &  {
    nameOfReporter: string; // the name of the reporter, for debugging and logging.
    dumpData: string[];
}

// One the one hand we just want to skip the dev messages.
// on the otherhand we don't want to skip some that might be ours?
// This is a pretty good, one in a billion, filter and the cost is only 8 bytes.
export function ensureMessageBaseClass(message: any): MessageBaseClass | null {
    // Fail fast. Be sure.
    const is = message && message.magic === magicMessageNumber 
    if (!is) {
        return null
    }
    return message as MessageBaseClass; // it's one of ours, all right.
}

// unused
export type Greetings = MessageBaseClass & {
    message: string; // a greeting message, and stop animating please until we say so? 
    aux: oct.AuxLeafStatus;
}

// The response to a "get glb" command MIGHT look like this.
export type GlbMessage = MessageBaseClass & {
    
    // to: string;             // for routing to the correct recipient
    // from: string;           // for identifying the sender
    // cmd: string;            // the command or action to be performed
    // magic: number;      // is ALWAYS magicMessageNumber, eg ALWAYS messes.magicMessageNumber or else this is not one of ours. 
    // args: (string | Uint8Array | Blob)[] // of string or base64 encoded data. This is the payload of the message. It can be empty, or it can be a list of strings or base64 encoded data. The recipient will have to know how to interpret this.

    name: string;// of the master w/0 the tld. This will refer to the AuxLeafStatus on the other side..

    command: string; // "add" or "remove" or "update" or "replace", or "pause"/
    // "start" or "delete" or "modify" or "change" or "redraw"
    comment: string; // a comment about the change, for logging and debugging.

    key: string; // a name for the blob.
    active: boolean; // should it be playing? 
    data: Blob; // this is the exported glb data as a Blob.

    // how do the animations work?
};

// How do we know the 'type' of the message?
// It's in the publish/subscribe in most cases,
// we're not using this?
export interface argType {
    // this is the type of the argument, which can be a string, a Uint8Array, or a Blob.
    type: Uint8Array[1]; // is " " for string "=" for b64, $ for hex, "\0" for binary but
    // I don't see that working here in this language,
    value: string | Uint8Array | Blob;
}

// Copyright 2026 Alan Tracey Wootton. Hi! 
// See LICENSE
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published byx3
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.


// "mqtt": "^5.15.2",