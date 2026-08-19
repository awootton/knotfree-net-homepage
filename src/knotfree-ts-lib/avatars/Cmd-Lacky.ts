
// Definition of lackey:
// as in servant
// a person hired to perform household or personal services
// we sent the lackey out to get doughnuts for the office

// You want commands? We collect them for you and can find them too. We integrate with the RPC-gadget to get the 
// commands and the results delivered. 

// Sorry about the abbreviations but that's what we do to commands - we abbreviate and assign acronyms. .lol

// TODO: hook this to the incoming pubsub messages of some channel.
// Move to new file.
// it's really just a fancy version of 
// if ( cmd === "get time") { return Date.now() } 
// else if (cmd === "get random") { return Math.random() } 
// else if (cmd === "get count") { return count } 
// else if (cmd === "get fail") { return fail } 
// etc
// but I like getting the 
// 'about' command for free the organization.

// One thing we need is a whitelist of commands that are allowed to be executed by known good peeople.
// and a blacklist of commands that are not allowed because of creeps.

// TheCmdLacky

// <T> has no"
export class TheCmdLacky<T> {

	theCommands: Map<string, ICommand>

	topic: string

	password: string
	pubStr: string
	privStr: string
	host: string
	adminPubStr: string
	adminPrivStr :string
	adminPubStr2  :string
	adminPrivStr2 :string
 
	fail: number
	count: number  
	// commandMap: this.theCommands,
	index: number
	token: string
	logMeVerbose: boolean
	dummyString: string

	// or way way later more_context: T | undefined;  // later, or not at all

	constructor() {

		this.password = ""
		this.fail = 0;
		this.count = 0;
		this.index = 0;
		this.pubStr = "";
		this.privStr = "";
		this.host = "";
		this.adminPubStr = "";
		this.adminPrivStr = "";
		this.adminPubStr2 = "";
		this.adminPrivStr2 = "";		 
		this.token = "";
		this.logMeVerbose = false;
		this.dummyString = "";

		// What is our domain? Can we have a frivilous name?
		this.theCommands = new Map<string, ICommand>();

		this.topic = "knotfree-lacky_except not and with the domain name stc ";

		// this.more_context = undefined;
	}

	// set_command(cmd: ICommand): void {
	// 	// more implementation here
	// }
}


type ICommand = {
	commandString: string;
	description: string;
	argCount: number;
	execute: (msg: string, args: string[], callContext: any) => string;

}

// This is, of course, a little arbitrary. 
// Only the map is required! I literally just translated this from Go. 
// interface IThingContext {
// 	topic: string;
// 	password: string;
// 	pubStr: string;
// 	privStr: string;
// 	host: string;
// 	adminPubStr: string;
// 	adminPrivStr: string;
// 	adminPubStr2: string;
// 	adminPrivStr2: string;
// 	dummyString: string;
// 	fail: number;
// 	count: number;
// 	commandMap: Map<string, ICommand>;
// 	index: number;
// 	token: string;
// 	logMeVerbose: boolean; // a debugging thing
// }

// move this into the lackey class and make it a method.
// export function runTheCommand(command: string): [string, Error | null] {

// 	return ["", new Error(`runTheCommand ${command} not found`)];
// }


// There's got to be 100 better ways to do this. 
// This could just be done manually and then do the ourMap.set
function makeCommand(
	commandString: string,
	description: string,
	argCount: number,
	execute: (msg: string, args: string[], callContext: any) => string,
	// ourMap: Map<string, ICommand>
): ICommand {

	const cmd: ICommand = {
		commandString: commandString,
		description: description,
		argCount: argCount,
		execute: execute,
	};
	// ourMap.set(commandString, cmd);
	return cmd;
}

function setupCommands<T>(c: TheCmdLacky<T | undefined>): void {

	// one might set up the pub/priv keys :setupKeys(c);

	// and then declare some commands.
	makeCommand(

		"get time", // The command

		"seconds since 1970🔓", // a description

		0, // argument count

		// the function to execute when this command is received. 
		// It takes the message, the arguments, and the call context (which is the IThingContext object in this case).
		(msg: string, args: string[], callContext: any) => {
			const sec = Math.floor(Date.now() / 1000);
			return sec.toString();
		},

		// c.commandMap // so we can get it in the map.
	);

	makeCommand("get random",
		"returns a random integer", 0,
		(msg: string, args: string[], callContext: any) => {
			const tmp = Math.floor(Math.random() * 0xFFFFFFFF);
			return tmp.toString();
		});

	makeCommand("get count",
		"how many served since reboot", 0,
		(msg: string, args: string[], callContext: any) => {
			return c.count.toString();
		});

	makeCommand("get fail",
		"how many requests were bad since reboot", 0,
		(msg: string, args: string[], callContext: any) => {
			return c.fail.toString();
		});

	makeCommand("get pubk",
		"device public key 🔓", 0,
		(msg: string, args: string[], callContext: any) => {
			return c.pubStr;
		});

	makeCommand("get admin hint",
		"the first chars of the admin public keys🔓", 0,
		(msg: string, args: string[], callContext: any) => {
			return c.adminPubStr.substring(0, 8) + " " + c.adminPubStr2.substring(0, 8);
		});

	makeCommand("get some text", // just an example.
		"return the saved text", 0,
		(msg: string, args: string[], callContext: any) => {
			return c.dummyString;
		});

	makeCommand("set some text",
		"save some text", 1,
		(msg: string, args: string[], callContext: any) => {
			let s = msg.substring("set some text".length);
			s = s.trim();
			c.dummyString = s;
			return "ok";
		});

	makeCommand("version",
		"info about this thing", 0,
		(msg: string, args: string[], callContext: any) => {
			return "v0.2.0";
		});

	// makeCommand("help",  FIXME: do this later.
	// 	"lists all commands. 🔓 means no encryption required", 0,
	// 	(msg: string, args: string[], callContext: any) => {
	// 		let s = "";
	// 		const keys: string[] = Array.from(c.commandMap.keys());
	// 		keys.sort();
	// 		for (const k of keys) {
	// 			const command = c.commandMap.get(k);
	// 			if (!command) continue;
	// 			let argCount = "";
	// 			if (command.argCount > 0) {
	// 				argCount = " +" + command.argCount.toString();
	// 			}
	// 			s += "[" + k + "]" + argCount + " " + command.description + "\n";
	// 		}
	// 		return s;
	// 	});

	makeCommand("get token",
		"info about the token", 0,
		(msg: string, args: string[], callContext: any) => {
			const parts = c.token.split(".");
			if (parts.length !== 3) {
				return "error: invalid token";
			}
			const payloadB64 = parts[1];
			try {
				const payload = Buffer.from(payloadB64, 'base64url').toString('utf-8');
				return payload;
			} catch (err) {
				return "error: " + (err as Error).message;
			}
		});
}
