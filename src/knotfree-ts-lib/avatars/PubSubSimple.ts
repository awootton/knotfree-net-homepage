
// This is the singleton subscribe. This is NOT where several entities can subscribe to the same topic. 
// We could do this with the other one, and we could make mistakes.


// We use this for iFrames to have a message bus. Note that the "T" for the messages is the
// minimal base class for internal messages.
// It's not like subscribing to a list or a data structure. It's more like where a server has a domain name or an address 
// and we all send it commands and messages.
// It's a singleton subscribe. One thing subscribes per topic.


// If you do this twice the first one gets washed away.
// If you're not the guy for these messages, and you subscribe anyway, you could be totally screwing someone else up. 
// So, be careful. This is a singleton subscribe. It's not like subscribing to a list or a data structure.
// I would like to cap this, Go rules. Nobody was using the return.
export function subscribe<T>(subscriptionId: string, cb: (message: T, err: null | Error) => any) { //: localMapItem<T> | undefined {
    let found: localMapItem<T> | undefined = sessionMap.get(subscriptionId)
    if (found === undefined) {
        let found: localMapItem<T> = {
            callback: cb
        }
        sessionMap.set(subscriptionId, found)
    } else {
        // replace the callback
        found.callback = cb
    }
    return found
}

export function publish<T>(subscriptionId: string, message: T) {
    const found = sessionMap.get(subscriptionId)
    if (found !== undefined) {
        let cb = found.callback
        setTimeout(() => {          // in a different goroutine!
            cb(message, null)
        }, 0) // right now, asap.
    } else {
        console.log('PubSubSimple publish: no subscriber found for', subscriptionId, message)
    }
}

// Remove is called when a component is unmounted. Prevent leaks.
export function unsubscribe(subscriptionId: string) {
    const found = sessionMap.get(subscriptionId)
    if (found !== undefined) {
        // console.log('PubSubSimple unsubscribe', subscriptionId)
        sessionMap.delete(subscriptionId)
    }
}

type localMapItem<T> = {
    callback: (message: T, err: null | Error) => any
}

// Do we really need the error?

// from subscriptionId to localMapItem
let sessionMap = new Map<string, localMapItem<any>>()


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
