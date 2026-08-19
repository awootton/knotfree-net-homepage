import { MasterToFriviousName } from "../avatars/testServermap";
import * as messes from "../3d/messageTypes";
import { MessageBaseClass, tracebridgemesses } from "../3d/messageTypes";
import { handlePaleMessages } from "./PubSubBridge";


// Because of symmetry and code overlap I'm afraid we're going discontinue the island 
// version of this code and fold that into here. See the comments at the top of PubSubBridge though.

// This is a pub/sub system for components to subscribe to changes, messages and replies.
// For instance, the App, in useEffect will subscribe with a key and it's name and then when a change happens it 
// can get called to do a set state.

// It is a many to many system. The many to one version is "PubSubSimple.tsx", which is much simpler.


type CallbackInfo = {
    callback: (status: any, err: Error) => any
    info: string // for debugging and general annoyance.
}

type LocalMapItem = {
    // they have to be named so we can remove them when the component unmounts. 
    // So the key would be the name of the component, or some unique identifier for the component instance.
    // are we using the error?
    // the collector has a name and a function to call
    callbackList: Map<string, CallbackInfo>
}

export class PubSubTopicAndSubscribers {

    onAnIsland: boolean; // are WE on an island right now? 

    namesMap = new Map<string, LocalMapItem>()

    // we will get each of our iFrames to register with us and then we can send them messages.
    // The names don't matter but must be unique.
    contentWindows = new Map<string, Window>()

    debugname: string = "frivolous "

    ourCleanMasterDomainName: string = "sssssdddd" // where could get this from? I'm suck it from the 

    constructor(theRealDomainName: string) {

        this.ourCleanMasterDomainName = theRealDomainName;
        this.debugname = theRealDomainName
        this.namesMap = new Map<string, LocalMapItem>()
        this.contentWindows = new Map<string, Window>()
        if (window.self !== window.top) { // pretty cool.
            this.onAnIsland = true;
        } else {
            this.onAnIsland = false;
        }
        window.addEventListener("message", this.ourWindowEventListenerHandler, false); // below
    }

    setDebugName(name: string) {
        this.debugname = name
    }

    getOurCleanMasterDomainName(): string {
        return this.ourCleanMasterDomainName
    }

    addContentWindow(name: string, contentWindow: Window) {
        // console.log("PubSubTopicAndSubscribers: registered contentWindow for : ", name, " contentWindow: ", contentWindow)
        this.contentWindows.set(name, contentWindow)
    }

    removeContentWindow(name: string) {
        console.log("PubSubTopicAndSubscribers: removed contentWindow for : ", name)
        this.contentWindows.delete(name)
    }

    // we're setting these here. and we have a map, but what about in the wild? When there's no AppShitter?
    // When there's no testServermap.ts? No /etc/hosts ? 
    getDebugName(): string {
        return this.debugname
    }

    // from name to localMapItem
    // every key, like 'DemoPropertiesChanges' will have a list of callbacks.
    // so "App" might have a callback for "DemoPropertiesChanges", and "OrbitPropertyDialog2" might also have a callback for "DemoPropertiesChanges". 
    // When we publish "DemoPropertiesChanges", we want to call all the callbacks that are subscribed to that name.
    // We will take care to use separate keys for each instance. 

    getMapItem(name: string): LocalMapItem | undefined {
        if (name.length > 0) {
            return this.namesMap.get(name)
        } else {
            return undefined
        }
    }

    // they have to be named so we can remove them when the component unmounts.

    // Note: we don't remember old values or supply them to new subscribers. 
    // We just call the callbacks when we publish.
    subscribe(key: string, who: string, cb: (status: any, err: Error, info?: string) => any, info?: string) {

        if (this.debugname === "courtyard") {
            console.log("PubSubTopicAndSubscribers: subscribe: key: ", key, " who: ", who, " this.debugname: ", this.debugname)
        }

        const tmp: CallbackInfo = {
            callback: cb,
            info: info || ""
        }

        let found: LocalMapItem | undefined = this.getMapItem(key)
        if (found === undefined) {
            let found: LocalMapItem = {
                callbackList: new Map<string, CallbackInfo>(),
            }
            found.callbackList.set(who, tmp)
            this.namesMap.set(key, found)

        } else {
            // replace or add the callback
            found.callbackList.set(who, tmp)
        }
        return found
    }

    // all the who's get a callback.
    publish(key: string, status: any, err: Error = new Error("")) {

        const found = this.getMapItem(key)
        if (found !== undefined) {
            // iterate the callback list and call each one.
            for (const [callbackKey, callbackInfo] of found.callbackList) {
                if (callbackInfo !== undefined) {
                    // console.log('pubsub publish', callbackKey, status)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    -';
                    // call them anonymously so they can't mess with each other.
                    setTimeout(() => {
                        try {
                            // we could log or filter the info here if we wanted to.
                            callbackInfo.callback(status, err)
                        } catch (e) {
                            console.error('Error in pubsub callback for key', callbackKey, 'with status', status, 'and error', err, ': ', e)
                        }
                    }, 0) // straight to the input queue.
                    // c
                    //cb(status, err)
                } else {
                    // this is weird and shouldn't happen.
                    console.log('pubsub publish callback is undefined', callbackKey)
                }
            }
            // also tell the bridge? 
        } else {
            // not really a problem if there are no subscribers, but maybe we want to know about it for debugging.
            console.log('PubSub didnt find key', key, "in", this.debugname, ":", MasterToFriviousName(key))
            // do we check for a bridge now? How does THAT work. 
        }
    }

    // remove is called when a component is unmounted.
    unsubscribe(key: string, myAppName: string) {
        const found = this.getMapItem(key)
        if (found !== undefined) {
            // console.log('pubsub unsubscribe', key, myAppName)
            found.callbackList.delete(myAppName)
            if (found.callbackList.size === 0) {
                this.namesMap.delete(key)
                // and, it's gone and forgotton.
            }
        }

    }

    // just dump to the console and that's it. We'll get fancy later.

    // accumulatedDumpState: string[] = [] // for debugging, we can dump the state of the pubsub.
    // accumulatedDumpStateReported: number = 0
    // accumulatedDumpStartTime: number = 0

    // accumulatedDumpStateCallback: (dump: string[]) => any = () => { }
    // accumulatedFunished: (dump: string[]) => any = () => { }
    // previouslyDumped: Set<string> = new Set<string>()


    // show us the state of all the subscriptions and their callbacks.
    // needs a callback
    DumpState(cb: (dump: string[]) => void) {

        // if (!this.onAnIsland) {
        //     this.previouslyDumped.clear()
        //     this.accumulatedDumpStateCallback = cb
        //     this.accumulatedDumpStateReported = 0
        //     this.accumulatedDumpState = [] // reset the dump state
        //     this.accumulatedDumpStartTime = Date.now()

        //     // don't do them twice. 
        // }
        // if (this.previouslyDumped.has(this.debugname)) {
        //     return
        // }
        // this.previouslyDumped.add(this.debugname)

        console.log("dumpPubSubState dumpPubSubState ", this.debugname)

        let dump: string[] = []
        let indent = "    "

        dump.push("Top of Dump for " +this.debugname)

        // subscription 
        //     sunscribeName
        //         callback 

        for (const key of this.namesMap.keys()) {
            const item: LocalMapItem | undefined = this.getMapItem(key)
            if (item === undefined) {
                dump.push(indent + "" + key + " is undefined")
                continue
            } else {
                // we have the whole item.
                const localMapItem = item as LocalMapItem
                for (const [itemName, callbackInfo] of localMapItem.callbackList) {
                    // console.log("dumpPubSubState ", this.debugname, " key: ", key, " itemName: ", itemName, " callback: ", callbackInfo.callback)
                    let theCallback = callbackInfo.callback
                    // it's the text of the whole callback if you don't watch out
                    const theTextCallback = "{.........}"
                    dump.push(indent + indent + key + ":")
                    dump.push(indent + indent + indent + itemName + ":")
                    dump.push(indent + indent + indent + indent + " cb:" + theTextCallback)
                    dump.push(indent + indent + indent + indent + indent + " info:" + callbackInfo.info)
                }
            }
            // dump.push(indent + key)
        }

        // this.accumulatedDumpState.push(...dump)

        if (this.onAnIsland) {
            console.log("have island dump: \n", this.debugname, dump.join("\n"))
            cb(dump)
            return
        }

        for (const [name, contentWindow] of this.contentWindows) {
            dump.push(indent + "contentWindow name: " + name)

            const DumpRequest: messes.MessageBaseClass = {
                to: name + ":" + MasterToFriviousName(name) +"-contentWindow",
                from: "pubsub-" + this.debugname,
                cmd: "DumpStateRequest",
                magic: messes.magicMessageNumber
            }
            contentWindow.postMessage(DumpRequest, "*");
        }
        // sit around and wait for them to come back. 
        // we sent them out.  call the callback, not this.
    }

    // haveIncomingDumpState(msg: messes.MessageDumpReplyClass) {

    //     this.accumulatedDumpState.push(msg.nameOfReporter);
    //     this.accumulatedDumpState.push(...msg.dumpData);
    //     this.accumulatedDumpStateReported++;
    //     if (this.accumulatedDumpStateReported >= this.contentWindows.size) {
    //         // console.log("PubSubTopicAndSubscribers: haveIncomingDumpState: all replies received. Accumulated dump state: ", this.accumulatedDumpState)
    //         console.log("We have a whole dump\n" + this.accumulatedDumpState.join("\n"))
    //     }
    // }

    // We're kinda just glomming event handling into this while hoping it doesn't get too messy.
    // We only want to support the pubsub so it may work.

    ourWindowEventListenerHandler = (event: MessageEvent) => {

        tracebridgemesses('PubSubBridge ourEventHandler from ', event.source, " to ", event.origin);
        // If I'm on the mainland (and this happens to spaces and avatars when they are run sseparately)
        // then I don't want to process those messages. 

        const messageCameFromThisWindows = event.source === window;
        // if (messageCameFromThisWindows) {
        //     return; // it just came from this window. It's not pale.
        // }

        if (this.onAnIsland && event.data.magic === messes.magicMessageNumber) {
            // do we get all the traffic to THIS island or all the traffic everywhere?
            console.log("PubSubTopicAndSubscribers: onAnIsland: ", this.debugname, " event: ", event)

            if (this.debugname === "courtyard") {
                console.log("PubSubTopicAndSubscribers message ", this.debugname,event.data)
            }
        }

        if ((!this.onAnIsland) && messageCameFromThisWindows) {
            return; // this would be a case of the mainland sending a message to itself. 
        }

        const data = event.data;
        const msg = messes.ensureMessageBaseClass(data)
        if (msg === null) {
            // console.warn("PubSubTopicAndSubscribers: ourEventHandler: event.data is not a valid MessageBaseClass: ", data)
            return;
        }
        // console.log("PubSubTopicAndSubscribers: ourEventHandler: event: ", event)

        // enough with the precautions already. Just work the commands.

        if (msg.cmd === "DumpStateRequest") {
            this.DumpState(() => {
                console.log("------End of dump: ", this.debugname)
                //const isLandDump = this.accumulatedDumpState
                const isLandName = this.debugname
                // const reply: messes.MessageDumpReplyClass = {
                //     to: msg.from,
                //     from: "PubSubTopicAndSubscribers",
                //     cmd: "DumpStateReply",
                //     magic: messes.magicMessageNumber,
                //     nameOfReporter: isLandName,
                //     dumpData: isLandDump
                // };
                // // back to mainland.
                // window.parent.postMessage(reply, "*");
            });
            return;
        }

        // we're not doing replies right now.  We just want to see the state of the pubsub.
        // if (msg.cmd === "DumpStateReply") {
        //     this.haveIncomingDumpState(msg as messes.MessageDumpReplyClass)
        //     return;
        // }

        this.morecommands(msg, event);
    }

    morecommands(msg: MessageBaseClass, event: MessageEvent) {

    }
}

// To see where a window.onmessage event came from, check event.source. 
// Compare event.source to window.parent for a parent frame, 
// or check window.frames and event.source === frameWindow for an iframe. 
// Always verify event.origin to make sure the sender is trusted.
// Check the Source PropertyUse event.source to see the exact window object that sent the message.
// Compare event.source to window.parent to see if it came from the parent window.
// Loop through window.frames or check specific iframe content window references to see if it came from a child iframe.

// not out here.
async function XXXasyncSpamAllTheIslands() {
    // I have no idea. I'm just going to wait 5 sec and see what comes back.
    const DumpRequest: messes.MessageBaseClass = {
        to: "all",
        from: "PubSubTopicAndSubscribers",
        cmd: "DumpState",
        magic: messes.magicMessageNumber
    }
    //   window.contentWindow.postMessage(DumpRequest, "*");
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
