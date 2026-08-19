import { useEffect } from "react";
import * as messes from "../3d/messageTypes";
import { ensureMessageBaseClass, tracebridgemesses } from "../3d/messageTypes";

import * as pubsub from "./PubSubTopicAndSubscribers"
import * as sub from "./PubSubSimple"

// The pubsub we have already (PubSubTopicAndSubscribers.ts) is fairly straightforward. 
// We have a map of names to callback lists. 
// When we publish a message, we look up the name and call all the callbacks in the list. When we subscribe, we add a callback to the list for that name. 
// When we unsubscribe, we remove the callback from the list for that name.
// Now we extend that same API with iFrames.

/*  To do this we need 4 message passage routines. I find it confusing.

    The first two (on the island)
        window.parent.postMessage(msg, "*");                        to the mainland
        window.addEventListener("message", handleMessage(...)       from the mainland
    
    The other two on the other side (on the mainland)
        window.contentWindow.postMessage(msg, "*");                 to the iframe on the island
        window.addEventListener("message", handleMessage(...)       from the island. Same as above.

    We should use this exact terminology. Except, handleMessage is ambigious, so I'll go with:
    
    On the island.
        window.parent.postMessage(msg, "*");                         to the mainland, parent == mainland == the window that contains the iframe.
            should be received across the bridge, on the mainland, the 'tan' listener. 
        window.addEventListener("message", handleTanMessages(...)    Things send from mainland... got a tan 
    
    On the mainland.
        window.contentWindow.postMessage(msg, "*");                   to the island. the contentWindow is part of an iFrame element.
                should be received across the bridge by a 'pale' listener.
        window.addEventListener("message", handlePaleMessages(...)    Things going to the island, are pale.

    AI (Gemini), they say: Use the window.postMessage() API:
         Call contentWindow.postMessage() from the parent to send data, 
         use window.parent.postMessage() from the iframe to reply, 
         and listen for data using window.addEventListener('message') on both ends.

    Our seniario one.

    1) 'Orange' (TheFormallyOrange4WestApp, aka testmain-2n0u4w2p in WorldsTest1) subscribes to an island command set, 
        with orange stuff, ideas, and commands in it. Nothing really.
        It's 2 north and 4 west of the 16 meter places.  "kwsisdi"
        
    3 The embassy at on the mainland publishes the 'about' command for that same command topic and has a callback that will put it on the 
        wire to the island.

    2) The RenderThingsWithAuxGroups component for the corresponding (2n0u4w2p) mainland space. 
        subscribes to a throwaway topic that nobody cares about.
    3) The AuxGroup sends a command "info" to the orange topic on the island.
    4) The island gets the 'command' and sends a 'info' back to the reply topic which turns out to be the auxgroup.
        4a) unsub from the throwaway topic.

    voila! Just like that. An RPC. With multiple temp topics it can look like a real RPC system. It's a versatile system.
    
    Our scenario two. CP thinks there's a scenario two. Dummy. The other scenarios are all mass subscriptions to
          general topics and announcements. We don't know what they are yet and I think they 'just work'.
    
    Now, let's fill in the close details. The message receivers and senders are all set up.

*/


// This is a simple pub/sub system for components to subscribe to changes, messages and replies
// except that it bridges the gap between and iFrame island and the 'mainland'.

// We want to put a subscription in the map like we always but we ALWAYS do.
// But, want to send a message across the bridge to the other side where it
// will record a more or less normal subscription over there too. 
// except the 'callback' over there will be a function to send message back across the bridge to this 
// side and to call the callback on this side (which is the the one we were just passed!! )

// can we just kill the "who" in these args and the the "who" will always just be "" or "_bridge". the "who" is weird here.
// otherwise "_bridge" will be something strange like "_bridge_8vK2x9mQ4pW7zY1bN3fH5jDc"

export function Xsubscribe<T>(key: string, who: string, cb: (status: T, err: Error) => any) {
    console.log('PubSub bridge subscribe', key, "who: ", who)
    let found: localMapItem<T> | undefined = getMapItem(key)
    if (found === undefined) {
        let found: localMapItem<T> = {
            callbackList: new Map<string, (status: T, err: Error) => any>(),
        }
        found.callbackList.set(who, cb)
        namesMap.set(key, found)
    } else {
        // replace or add the callback
        found.callbackList.set(who, cb)
    }
    // done with the normal part.
    if (AmIOnTheMainland()) {
        // We are on the mainland. We don't need to send a message to the mainland. 
        // we are already there. This happens when we run the page as a main window and not in an iFrame.
        // it's normal.
        return
    }
    // also send a message to make a subscribe over on the mainland.
    // we can just do it right here? This is weird. The true cb's has been saved here unless somebody deletes them
    // and doesn't tell us.
    const submsg: messes.MessageSubscribeClass = {
        to: key,
        from: "the_bridge_on_the_island",
        key: key,
        who: who,
        cmd: "execute_theSubscribe",
        magic: messes.magicMessageNumber,
    }
    tracebridgemesses('PubSubBridge execute_theSubscribe send to window.parent.postMessage', submsg)
    // We HAVE a parent because we are on the island. We are in an iFrame. 
    // We are not on the mainland. 
    window.parent.postMessage(submsg, '*');
    // watch for it coming out at the mainland. It will be handled by the handleTanMessages listener on the mainland.
}

export function AmIOnTheMainland(): boolean {
    if (window.self !== window.top) { // pretty cool.
        // console.log("Yes, this page is loaded inside an iframe.");
        return false;
    } else {
        // console.log("No, this page is the main window.");
        return true;
    }
}

export function AmIOnAnIsland(): boolean {
    return !AmIOnTheMainland(); // :-) fun times. I'm pleased. 
}

// function setOffTheMainlandSub(){

//         // endCommand = baseMessage as messes.MessageSubscribeClass<any>

//         console.log("PubSubBridge: GOT a valid message", data)

//         // As you can see we simply make a pubsub.publish the usual way.
//         if (baseMessage.cmd === "execute_thePublish") {
//             // we have a valid message. 
//             const publishCommand = baseMessage as messes.MessagePublishClass<any>
//             // we want to call the callback that was registered for this key.
//             // and we shall. 
//             const key = publishCommand.to;
//             const status = publishCommand.status;
//             const err = publishCommand.err;
//             // it's simple as this. 
//             pubsub.publish(key, status, err);
//             return
//         }
//         // sombody sent us a sub
//         if (baseMessage.cmd === "execute_theSubscribe") {
//             // we have a valid message. 
//             const sendCommand = baseMessage as messes.MessageSubscribeClass<any>
//             // we want to call the callback that was registered for this key.
//             // and we shall. 
//             const key = sendCommand.to;
//             const who = sendCommand.who;
//             // And the callback is what get's executed when someone here on the island tries to publish to the mainland. 

//             // const  acb = (status:string, err:Error, key:string, who:string) => {
//             //     // call the one below?
//             // }
//             //   export function subscribe<T>(key: string, who: string, cb: (status: T, err: Error) => any) {


//             pubsub.subscribe<string>(key, who, (status: string, err: Error) => {
//                 console.log('PubSubBridge handleTanMessages subscribe help me fix me', key, who, status, err)
//             });
//             return
//         }
//     }
// }

// all the who's get a callback.
export function Xpublish<T>(key: string, status: T, err: Error = new Error("")) {
    console.log('PubSubBridge publish', status)
    const found = getMapItem(key)
    if (found !== undefined) {
        // iterate the callback list and call each one.
        for (const [callbackKey, cb] of found.callbackList) {
            if (cb !== undefined) {
                // console.log('pubsub publish', callbackKey, status)
                // call them anonymously so they can't mess with each other.
                setTimeout(() => {
                    try {
                        cb(status, err)
                    } catch (e) {
                        console.error('Error in pubsub callback for key', callbackKey, 'with status', status, 'and error', err, ': ', e)
                    }
                }, 0) // straight to the input queue.

            } else {
                // this is weird and shouldn't happen.
                console.log('pubsub publish callback is undefined', callbackKey)
                return// just return and don't make a mess 
            }
        } // we went through the list of callbacks. 
        if (AmIOnTheMainland()) {
            // We are on the mainland. We don't need to send a message to the mainland. 
            // we are already there. This happens when we run the page as a main window and not in an iFrame.
            // it's normal.
            return
        }
        // if I'm on an island then I need to call all their callbacks there also.
        // Let's get this over the bridge to the mainland.

        console.log('PubSubBridge Island pub to main', key, "status: ", status, "err: ", err)

        var msg: messes.MessagePublishClass<any> = {
            to: key,
            from: "some_island_component", // do we have a domain name?
            cmd: "execute_theMainlandPublish",
            magic: messes.magicMessageNumber,

            key: key, // this the topic name, like "testmain-2n0u4w2p-about"
            who: "the_bridge_on_the_island", //  
            status: status,
            err: err
        }
        window.postMessage(msg, '*');
    }
}

// eg. T is messes.MessageType

type localMapItem<T> = {
    // they have to be named so we can remove them when the component unmounts. 
    // So the key would be the name of the component, or some unique identifier for the component instance.
    // are we using the error?
    callbackList: Map<string, (status: T, err: Error) => any>
}

// from name to localMapItem
// every key, like 'DemoPropertiesChanges' will have a list of callbacks.
// so "App" might have a callback for "DemoPropertiesChanges", and "OrbitPropertyDialog2" might also have a callback for "DemoPropertiesChanges". 
// When we publish "DemoPropertiesChanges", we want to call all the callbacks that are subscribed to that name.
// We will take care to use separate keys for each instance. 

let namesMap = new Map<string, localMapItem<any>>()

function getMapItem<T>(name: string): localMapItem<T> | undefined {
    if (name.length > 0) {
        return namesMap.get(name)
    } else {
        return undefined
    }
}

// push this to the mainland so it can be pubished there.
// function mainlandBridgePublishToBridge<T>(key: string, status: T, err: Error = new Error("")) {
//     tracepsb('PubSubBridge mainlandBridgePublishToBridge', key, "status: ", status, "err: ", err)
//     var msg: messes.MessagePublishClass<T> = {
//         to: key,
//         from: "",
//         cmd: "execute_theMainlandPublish",
//         magic: messes.magicMessageNumber,
//         args: [],
//         status: status,
//         err: err
//     }
//     window.postMessage(msg, '*');
// }

// remove is called when a component is unmounted.
// and when we delete the last one here we tell the bridge (and vica versa).
// now would be a good time to invent an RPC system. But I was going to layer
// THAT on top of THIS. A problem, 
export function Xunsubscribe(key: string, myAppName: string) {
    console.log('PubSubBridge unsubscribe', key, "myAppName: ", myAppName)
    const found = getMapItem(key)
    if (found !== undefined) {
        // console.log('pubsub unsubscribe', key, myAppName)
        found.callbackList.delete(myAppName)
        if (found.callbackList.size === 0) {
            namesMap.delete(key)
            // and, it's gone and forgotton.
            // someone must tell the bridge or else these will leak. 
        }
    }
}


// Just fresh back from vacation, we have a new message from the mainland. Probably sunburnt.
// Fetch him a cab.
window.addEventListener("message", handleTanMessages, false);

// Welcome to the Mainland!!! 

// mainlandMessageHandler will be the handler for ALL the messages coming ONTO the mainland, from EVERYWHERE (not just the iFrames).
// I wonder how it acts on an island. I wonder how to set up a test for this?
// On the island messages are sent to window.contentWindow.postMessage. So the mainland gets them. 
// I think, on the island it can post to it's self like that if it wants but let's ignore it.
// It's an ISLAND problem. lol. We'll make a test somwhere. 

// Here we deal with the two types. Sub and Pub. We'll do unsub later.


// We are ON the mainland. We are in the main window. We are not in an iFrame.
function handleTanMessages(event: MessageEvent) { // this guy just got back.

    const onTheMainland = true;
    if (AmIOnAnIsland()) {
        // the window.addEventListener("message",
        // is apparently a global listener and very promiscuous. 
        // It will get all the messages from the everywhere.
        return; // we don't want to handle this messages on the island. We want to handle them on the mainland.
    }
    tracebridgemesses('PubSubBridge handleTanMessages', event)
    const data = event.data;
    const baseMessage = messes.ensureMessageBaseClass(data)
    if (baseMessage === null) {
        // console.log("PubSubBridge: not a valid message", data)
        return;
    } else {
        console.log("PubSubBridge: GOT a valid message", data)

        // As you can see we simply make a pubsub.publish the usual way.
        if (baseMessage.cmd === "execute_thePublish") {
            // we have a valid message. 
            const publishCommand = baseMessage as messes.MessagePublishClass<any>
            // we want to call the callback that was registered for this key.
            // and we shall. 
            const key = publishCommand.to;
            const status = publishCommand.status;
            const err = publishCommand.err;
            // it's simple as this. 
 //           pubsub.publish(key, status, err);
            return
        }
        // sombody sent us a sub
        if (baseMessage.cmd === "execute_theSubscribe") {
            // we have a valid message. 
            const sendCommand = baseMessage as messes.MessageSubscribeClass
            // we want to call the callback that was registered for this key.
            // and we shall. 

            const key = sendCommand.key;
            const who = sendCommand.who;
            // And the callback is what get's executed when someone here on the island tries to publish to the mainland. 

            // pubsub.subscribe<string>(key, who, (status: string, err: Error) => {

            //     // this subscribe needs a callback.
            //     // console.log('PubSubBridge handleTanMessages subscribe help me fix me', key, who, status, err)
            //     // If we are here we must on the mainland and someone just did a publish here. 
            //     // we must get the status back over to the island. 

            //     const havePub: messes.MessagePublishClass<any> = {
            //         to: "island_re-publisher",
            //         from: "the_bridge_on_the_mainland",
            //         cmd: "execute_a_Publish",
            //         magic: messes.magicMessageNumber,

            //         key: key, // this the topic name, like "testmain-2n0u4w2p-about"
            //         who: who, // probably "". We don't have multiple receivers.

            //         status: status,  // the actual data: like "get pubk" or "about" or lots of getters and setters.
            //         err: err,
            //     }
            //     // send this bad boy over the bridge to the island.
            //     window.postMessage(havePub, '*');
            //     // and when it gets there it will be handled by the handlePaleMessages
            //     // who will publish it locally.
            // });
            return
        }
        console.log("PubSubBridge handleTanMessages: unknown command", baseMessage.cmd)
    }
}

// what is this? 
// function XXXcb<T>(status: string, err: Error, key: string, who: string) {
//     // we have to send a message back across the bridge to the mainland.
//     var msg: messes.MessagePublishClass<string> = {
//         to: key,
//         from: who,
//         cmd: "execute_thePublish",
//         magic: messes.magicMessageNumber,

//         status: status,
//         err: err
//     }
//     window.postMessage(msg, '*');
// }

// Ready for a break from the hard city life. This message can't wait to get away.

window.addEventListener("message", handlePaleMessages, false);

// This is the handler for messages freshly arrived FROM the mainland. Shut up CP, you're an idiot.
// We are ON an island. We are in an iFrame. We are not on the mainland. We are not in the main window.
export function handlePaleMessages(event: MessageEvent) {
    tracebridgemesses('PubSubBridge handlePaleMessages', event)
    // anything might come throuhe here. We have to be agressibe about filtering out the messages that are not for us.
    if (AmIOnTheMainland()) {
        return; // it just came from the mainland. It's pale.
    }
    // Implement the handler for pale messages here
    // For example. A publish might come in through and need to hop on the local pubsub.publish. 
    const data = event.data;
    const baseMessage = messes.ensureMessageBaseClass(data)
    if (baseMessage === null) {
        // console.log("PubSubBridge: not a valid message", data) // it's impossible to log these. They are like flies.
        return;
    } else {
        console.log("PubSubBridge: GOT a valid message", data)

        if (baseMessage.cmd === "execute_a_Publish") {
            // we have a valid message. 
            const publishCommand = baseMessage as messes.MessagePublishClass<any>
            // we want to call the callback that was registered for this key.
            // and we shall. 
            const key = publishCommand.key; // topic name.
            const who = publishCommand.who;
            const status = publishCommand.status; // the actual data. We lost the type so it has to just be 'any'.
            const err = publishCommand.err;
            // it's simple as this. 
            sub.publish(key, status);
            return
        }
        if (baseMessage.cmd === "execute_a_Subscribe") {
            // we have a valid message. 
            const publishCommand = baseMessage as messes.MessagePublishClass<any>
            // we want to call the callback that was registered for this key.
            // and we shall. 
            const key = publishCommand.key;
            const who = publishCommand.who;
            const status = publishCommand.status;
            const err = publishCommand.err;
            // it's simple as this. 
            sub.publish(key, status);
            return
        }
        console.log("PubSubBridge handlePaleMessages: unknown command", baseMessage.cmd)
    }
}

// useEffect(() => {
//     window.addEventListener("message", bridge.handlePaleMessages);
//     return () => window.removeEventListener("message", bridge.handlePaleMessages);
// }, []);// Just once should be enough. The target (BridgeMessageHandler) is not a function of a functional compoent so it never moves.


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
