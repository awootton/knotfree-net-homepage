import * as utils from '../3d/utils'
import * as bridge from './PubSubBridge'
import { PubSubTopicAndSubscribers } from './PubSubTopicAndSubscribers';

// To do an RPC on top of a pubsub channel takes some tricks. Here they are.
// it's easier to just use it and never know.

// These are supposed to be parts of the identity and command system.
// Also, who is supporting the IDebtityDialog? What? I'm doing the IdentityDialog. Wanna help?

// These things (rpc, commandMap, etc are thrown together in this file. TODO: move them.

// The RPC concept.

export class RPC_Gadget {

	temporaryChannel: string; // how long does this last? Who deletes it? 
	inUse: boolean; // how long does this last? Who deletes it? 

	pubsub: PubSubTopicAndSubscribers;

	cleanMasterDomainName: string; // no prefix before the world name. No TLD or crap after the coordinates. 
	ourChannelName: string; // this is the channel that we are listening on. It is our "name" in the pubsub world.
	ourSecondaryName: string; // If two people were listening on this samechannel then this woild be how we would distinguish between them. 
	// But, we NOT DOING THAT.

	frivolousName: string = "frivolous"

	theCallback: (status: any, err: Error) => any = (status: any, err: Error) => {
		console.error("Error in RpcHelper subscription. This should be replaced by now:", err);
	}

	constructor(pubsub: PubSubTopicAndSubscribers) {

		this.cleanMasterDomainName = pubsub.ourCleanMasterDomainName// probably ok. 

		this.ourChannelName = this.cleanMasterDomainName + "_commands";

		this.inUse = false;
		this.pubsub = pubsub;

		this.temporaryChannel = utils.RandomString(24); // 24 chars is enough for a temporary channel name.
		pubsub.subscribe(this.temporaryChannel, "RpcHelper", (status: any, err: Error) => {
			this.theCallback(status, err);
		});
		this.ourSecondaryName = ""
		// What is OUR channel? 
	}

	GetOurChannelName(): string {
		return this.ourChannelName;
	}

	getDomainName(): string {
		return this.cleanMasterDomainName;
	}

	ProcessCommand(command: any, err: Error) {
		if (err) {
			console.error("Error in RpcHelper subscription. This should be replaced by now:", err);
		} else {
			console.log("RpcHelper "+ this.GetOurChannelName()+" received command:", command);
			// do something with the command. 
		}
	}

	// Send the text command to the channel and get a (text) answer back via the callback. 
	SendCommandOldSchool(channel: string, command: string, callback: (status: any, err: Error) => any) {
		if (this.inUse) {
		// how long do we wait?
			return;
		}
		this.inUse = true; // this is a one-time use object, unless we make more temp channels.
		this.theCallback = callback;
		const msg = {
			command: command,
			replyChannel: this.temporaryChannel
		}
		this.pubsub.publish(channel, msg, new Error(""));
		// how long do we wait?
	}

	// the async version of SendCommand. It returns a promise that resolves when the callback is called.
	async SendCommand(channel: string, command: string): Promise<any> {
		const promiseA = new Promise((resolve, reject) => {
			this.SendCommandOldSchool(channel, command, (status: any, err: Error) => {
				this.inUse = false
				if (err) {
					reject(err);
				} else {
					resolve(status);
				}
			});
		});
		return withTimeout(promiseA, 1000, "RpcHelper.SendCommandAsync timed out after 1 second");
	}
}


function withTimeout<T>(
	promise: Promise<T>,
	ms: number,
	errorMessage = "Operation timed out"
): Promise<T> {
	let timeoutId: ReturnType<typeof setTimeout>;

	// 1. Create a promise that rejects when the timer expires
	const timeoutPromise = new Promise<never>((_, reject) => {
		timeoutId = setTimeout(() => {
			reject(new Error(errorMessage));
		}, ms);
	});

	// 2. Race the original promise against the timeout
	return Promise.race([promise, timeoutPromise]).finally(() => {
		// 3. Clear the timeout to prevent memory leaks if the operation wins
		clearTimeout(timeoutId);
	});
}



