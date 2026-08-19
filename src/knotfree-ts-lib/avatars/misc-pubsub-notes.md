
// ** trying to invent a general system for passing messages, and pubsub, 
// and rpc between iFRames and 'parent' windows and in general. 

This is how we can implement avatars and thingatars.


import { useEffect } from "react";

// don't bother trying to change the name of this file. lol. The ts-lib sync scrips will screw you up.
// 
// Ignore the title here. I just need a place to think and try some code.

// When an iFrame (or an island as I like to call them) subscribes to a topic someone has to tell the mainland
// and use a bridge to carry those messages across. I think I solved this all in my head last night in my head. 8/1/26

// I can't use the parent/child terminology because the islands have embassies on the mainland and the mainland has embassies on the islands.
// It gets confusing fast, and I'm weird.

// It's worse. The islands need general subscriptions, not just simpletons. Do they?

// The first part is where an AuxGroupRenderer wants to subscribe to all the GLV update messages for all islands. NOT.
// I take that back.
// Each AuxGroup subscribes to the ONE island they care about.
// When the island publishes, there's a custom pubsub called a bridge that takes the message across the bridge
// and then republishes it at the mainland. The mainland then delivers it to the aux group renderer.
// The aux group renderer then updates the aux state.

// This means the bridge has to know about EVERY island. The islands have to register with the mainland as they come online.
// Easier yet, the islands forward every subscription to the mainland always.
// This means the unsubscriptions should also be forwarded across to the mainland.

// The other half is when the island wants to subscribe.
// Publishers who don't find destinations should check the bridge and see if there's a destination for that island.
// If there is, the bridge will take the message across and republish it at the island.
// E.g., an island will want to subscribe to 'entry' messages for when someone/thing enters the island space.
// Then the island can send some responses or reactions.

// I'm going to write this bridge right here, in this file. Test it somewhere. 
// Note that these same files will appear on both sides.

// On the island I want to write 

// can I import my own damn self? No. I'll have to make real files and clean it up later.
// When making a file in a folder that's getting synced you can never rename it or move it. The sync script will delete or resconstitute it. 
// So, I have to make a file in the src/knotfree-ts-lib/avatars folder and then import it here.
// import * as bridge from './'; 

// nevermind. I'm writing it in this stupid avatars folder here.  

export interface bridge {
    subscribe: (topic: string, islandName: string, callback: (message: any, err?: Error) => void) => void;
    publish: (topic: string, islandName: string, message: any) => void;
    unsubscribe: (topic: string, islandName: string) => void;
}

const thisIslandAddress = "testmain-2n0u4w2p"

bridge.subscribe("proximity", "island1", (message: any, err: Error) => {
    // do something with the message. 
    console.log("island1 got an ", message)
});


// this is on the ISLAND ISLAND ISLAND ISLAND ISLAND side. 
// this is on the ISLAND ISLAND ISLAND ISLAND ISLAND side. 
// this is on the ISLAND ISLAND ISLAND ISLAND ISLAND side. 
// this is on the ISLAND ISLAND ISLAND ISLAND ISLAND side. 

// Data can be a string, object, array, etc.
const messageData = { type: "SUCCESS", payload: "Form submitted!" };

// Target a specific origin for security
const targetOrigin = "https://your-parent-domain.com"; 

window.parent.postMessage(messageData, targetOrigin); // will get a message sent someplace on the mainland.
    
// also on the island, at the embasy, we can listen for messages from the mainland.

    useEffect(() => {
        // Add listener on mount
        window.addEvent Listener("message", handleMessageOrangeWest);
        // Clean up listener on unmount to prevent memory leaks
        return () => window.removeEventListener("message", handleMessageOrangeWest);
    }, []); // Empty array ensures this runs once on mount

// where handleMessageOrangeWest is a function. I'm notsurte  if it's best to 
// use the "[]" or else just registered the listener once and never remove it. I think the latter is best.

// This is on the MAINLAND  MAINLAND  MAINLAND  MAINLAND side.
// This is on the MAINLAND  MAINLAND  MAINLAND  MAINLAND side.
// This is on the MAINLAND  MAINLAND  MAINLAND  MAINLAND side.
// This is on the MAINLAND  MAINLAND  MAINLAND  MAINLAND side.

// This will absolutely get messages from the isLand. 

    // useEffect This is how we maintain the event listener that get's the messages from ALL the iframes.
    // We need to have a single even listener that gets the messages from all the iframes and then dispatches them to the correct iframe based on the master name.
    // this is the one and only global event listener for all the iframes. 
    // It will get the messages from the iframes and then dispatch them to the correct iframe based on the master name.
    // this object knows it's BatchInfo and to it's aux and name.
    // this is the proper way to register a handler for the message event, they say. 
    useEffect(() => {
        window.addEventListener("message", handleOneFrameMessageHandler);
        return () => {
            // don't we unhook this here? I think we do.
            window.removeEventListener("message", handleOneFrameMessageHandler);
        };
    }, []); // empty dependency array means this effect runs once on mount and cleans up on unmount. ok

// I find it slightly creepy that the event listener is just the word 'message'. However, other event listyinets are for stuff like key down seems more specific. Oh well.
// 
// This is gets a firehose of messages. All the iFrames are sending messages to the mainland. 
// But, also the debuggers are are all up in there.

// For the mainland to send a message TO the island, it needs to know the iframe's contentWindow
// the contentWindow is an HTMLIFrameElement property and is absolutely in the DOM and 
// on the mainland, but that seems to be how it works. 
// The contentWindow is the window object of the iframe, and we can use postMessage on it to send messages to the iframe. 
// (that's my little brother speaking, he likes to repeat everything I say and make it sound like it was his idea and that it's really really profopund.)
// He is pretty quick on the uptake though. And he seemed to have read everything. 
// his name is Copilot. I call him Copilot Tracey Wootton.


// just prevent syntax errors for now. (atw)
function handleOneFrameMessageHandler(event: MessageEvent) {}
function handleMessageOrangeWest(event: MessageEvent) {}






// Send xxx  Message.ts 

// I could have sworn that t=I changed the name of this file to and md.
// The name is wrong. The story is mixed.


// ** trying to invent a general system for passing messages, and pubsub, 
// and rpc between iFRames and 'parent' windows and in general. 

// import { useEffect } from "react";

// don't bother trying to change the name of this file. lol. The ts-lib sync scrips will screw you up.
// 
// Ignore the title here. I just need a place to think and try some code.

// When an iFrame (or an island as I like to call them) subscribes to a topic someone has to tell the mainland
// and use a bridge to carry those messages across. I think I solved this all in my head last night in my head. 8/1/26

// I can't use the parent/child terminology because the islands have embassies on the mainland and the mainland has embassies on the islands.
// It gets confusing fast, and I'm weird.

// It's worse. The islands need general subscriptions, not just simpletons. Do they?

// The first part is where an AuxGroupRenderer wants to subscribe to all the GLV update messages for all islands. NOT.
// I take that back.
// Each AuxGroup subscribes to the ONE island they care about.
// When the island publishes, there's a custom pubsub called a bridge that takes the message across the bridge
// and then republishes it at the mainland. The mainland then delivers it to the aux group renderer.
// The aux group renderer then updates the aux state.

// This means the bridge has to know about EVERY island. The islands have to register with the mainland as they come online.
// Easier yet, the islands forward every subscription to the mainland always.
// This means the unsubscriptions should also be forwarded across to the mainland.

// The other half is when the island wants to subscribe.
// Publishers who don't find destinations should check the bridge and see if there's a destination for that island.
// If there is, the bridge will take the message across and republish it at the island.
// E.g., an island will want to subscribe to 'entry' messages for when someone/thing enters the island space.
// Then the island can send some responses or reactions.

// I'm going to write this bridge right here, in this file. Test it somewhere. 
// Note that these same files will appear on both sides.

// On the island I want to write 

// can I import my own damn self? No. I'll have to make real files and clean it up later.
// When making a file in a folder that's getting synced you can never rename it or move it. The sync script will delete or resconstitute it. 
// So, I have to make a file in the src/knotfree-ts-lib/avatars folder and then import it here.
// import * as bridge from './'; 

// nevermind. I'm writing it in this stupid avatars folder here.  

// export interface bridge {
//     subscribe: (topic: string, islandName: string, callback: (message: any, err?: Error) => void) => void;
//     publish: (topic: string, islandName: string, message: any) => void;
//     unsubscribe: (topic: string, islandName: string) => void;
// }

// const thisIslandAddress = "testmain-2n0u4w2p"

// bridge.subscribe("proximity", "island1", (message: any, err: Error) => {
//     // do something with the message. 
//     console.log("island1 got an ", message)
// });


// this is on the ISLAND ISLAND ISLAND ISLAND ISLAND side. 
// this is on the ISLAND ISLAND ISLAND ISLAND ISLAND side. 
// this is on the ISLAND ISLAND ISLAND ISLAND ISLAND side. 
// this is on the ISLAND ISLAND ISLAND ISLAND ISLAND side. 

// Data can be a string, object, array, etc.
// const messageData = { type: "SUCCESS", payload: "Form submitted!" };

// // Target a specific origin for security
// const targetOrigin = "https://your-parent-domain.com"; 

// window.parent.postMessage(messageData, targetOrigin); // will get a message sent someplace on the mainland.
    
// also on the island, at the embasy, we can listen for messages from the mainland.

    // useEffect(() => {
    //     // Add listener on mount
    //     window.addEvent Listener("message", handleMessageOrangeWest);
    //     // Clean up listener on unmount to prevent memory leaks
    //     return () => window.removeEventListener("message", handleMessageOrangeWest);
    // }, []); // Empty array ensures this runs once on mount

// where handleMessageOrangeWest is a function. I'm not sure if it's best to 
// use the "[]" or else just registered the listener once and never remove it. I think the latter is best.

// This is on the MAINLAND  MAINLAND  MAINLAND  MAINLAND side.
// This is on the MAINLAND  MAINLAND  MAINLAND  MAINLAND side.
// This is on the MAINLAND  MAINLAND  MAINLAND  MAINLAND side.
// This is on the MAINLAND  MAINLAND  MAINLAND  MAINLAND side.

// This will absolutely get messages from the isLand. 

    // useEffect This is how we maintain the event listener that get's the messages from ALL the iframes.
    // We need to have a single even listener that gets the messages from all the iframes and then dispatches them to the correct iframe based on the master name.
    // this is the one and only global event listener for all the iframes. 
    // It will get the messages from the iframes and then dispatch them to the correct iframe based on the master name.
    // this object knows it's BatchInfo and to it's aux and name.
    // this is the proper way to register a handler for the message event, they say. 
    // useEffect(() => {
    //     window.addEvent Listener("message", x);
    //     return () => {
    //         // don't we unhook this here? I think we do.
    //         window.removeEventListener("message", handleOneFrameMessageHandler);
    //     };
    // }, []); // empty dependency array means this effect runs once on mount and cleans up on unmount. ok

// I find it slightly creepy that the event listener is just the word 'message'. However, other event listyinets are for stuff like key down seems more specific. Oh well.
// 
// This is gets a firehose of messages. All the iFrames are sending messages to the mainland. 
// But, also the debuggers are are all up in there.

// For the mainland to send a message TO the island, it needs to know the iframe's contentWindow
// the contentWindow is an HTMLIFrameElement property and is absolutely in the DOM and 
// on the mainland, but that seems to be how it works. 
// The contentWindow is the window object of the iframe, and we can use postMessage on it to send messages to the iframe. 
// (that's my little brother speaking, he likes to repeat everything I say and make it sound like it was his idea and that it's really really profopund.)
// He is pretty quick on the uptake though. And he seemed to have read everything. 
// his name is Copilot. I call him Copilot Tracey Wootton.

