
export const dnsCloudflare = "1.1.1.1" // we could also use google.
export const dnsGoogle = "8.8.8.8" // we could also use cloudflare.
export const dnsCloudFlair2 = "1.0.0.1"
export const dnsGoogle2 = "8.8.4.4" // we could also use cloudflare.
export const dnsQuad9 = "9.9.9.9" // quad9.
export const dnsQuad92 = "9.9.9.10" // Quad9: Founded on strict privacy principles and governed by Swiss law
export const dnsOpenDNS = "208.67.222.222" // OpenDNS (Best for parental controls) Owned by Cisco 
export const dnsOpenDNS2 = "208.67.220.220" // OpenDNS (Best for parental controls) Owned by Cisco 

export const dnsGotohere = "149.28.250.163" // dns.gotohere.com Don't use this. It's weak. 
// Real weak, but it serves .vr records for The Metaverse proto. It falls back to cloudflare(?) if it can't resolve the name. 

// we should round robin them. That would be funny. 
export const currentDnsServer = dnsCloudFlair2 // dnsGoogle // change this to test different dns servers.

// The reason we have to call knotfree is because browser security rules won't let us use the normal dns resolvers
// and because the DNS over HTTPS (DoH) services at google and cloudflare won't take cross domain requests from the browser. 
// So we have to call knotfree.net to do the dns lookup for us. This is a bummer, but it is what it is. Someday we might fix this. 
// TODO: eliminate all knotfree from this project. 

export const knotFreeDotNet = "https://knotfree.net"
export const knotFreeDotIo = "http://knotfree.io"
export const knotFreeLocalHost = "http://knotfree.dog:8085" // knotfree.com is in my /etc/hosts file as localhost. It's always 8085

// This kind of thing will grow into a tangled rats nest so lets watch out.
export var knotfreeServer = knotFreeDotNet  // change this to test against local or remote knotfree server.
export var localAndInWindows = false 		// used by RewriteUrl

// if true, then even if we're in windows and localhost, rewrite texture, etc, urls to remote and not localhost.
export var rewriteUrlsToRemote = false

if (typeof window !== "undefined") {
	if (window.location.href.includes("localhost") || window.location.href.includes("127.0.0.1")) {
		knotfreeServer = knotFreeLocalHost // change this to test against local or remote knotfree server.
		localAndInWindows = true
	}
} else {
	// we're in node, so we should use the local server for testing.
	knotfreeServer = knotFreeLocalHost
	// uncomment if you change your mind.
	// knotfreeServer = knotFreeDotNet
}

// for testing functions we can force the remote server even if we're in windows and localhost. 
export function SetKnotfreeServer(server: string) {
	knotfreeServer = server
}

export var inHTTPSmode = false
if (typeof window !== "undefined") {
	if (window.location.href.startsWith("https://")) {
		inHTTPSmode = true
	}
}

export type DnsAnswer = {
	name: string;
	type: number; // 1 for A, 16 for TXT, etc.
	TTL?: number;
	data?: string;
}

export type DnsQuestion = {
	name: string;
	type: number;
}

export enum DnsStatusCode {
	NOERROR = 0,    // The query was successful, and the response contains the requested IP address or records.
	FORMERR = 1,    // The DoH resolver could not interpret the format of the DNS query.
	SERVFAIL = 2,   // The DNS server failed to answer the request (often a timeout or issue with the upstream server).
	NXDOMAIN = 3,   // Non-Existent Domain. The domain name you queried does not exist.
	NOTIMP = 4,     // Not Implemented. The DoH server does not support the requested DNS operation.
	REFUSED = 5,    // The DNS server refused to process the request (e.g., due to policy)
}

export type DnsResponse = {
	Status: number; // 0 for no error, 3 for name error, etc.
	TC: boolean;
	RD: boolean;
	RA: boolean;
	AD: boolean;
	CD: boolean;
	Question: DnsQuestion[];
	Answer?: DnsAnswer[];
	Authority?: DnsAnswer[]; // when do I do this?
	Comment?: string;
}
export function GetQuestion(response: DnsResponse): [name: string, type: number] {
	if (response.Question && response.Question.length > 0) {
		// when is there more than one question? I don't know, but we'll just take the first one.
		return [response.Question[0].name, response.Question[0].type];
	}
	return ["oops", -1];
}

export function GetAnswer(response: DnsResponse): [name: string, data: string] {
	if (response.Answer && response.Answer.length > 0) {
		// when is there more than one answer? I don't know, but we'll just take the first one.
		return [response.Answer[0].name, response.Answer[0].data || ""];
	}
	return ["", "oops"];

}


//   url = "https://knotfree.net/api1/dns-query?name=meta_group_id.testmain-0n0u0e16p-0.vr&type=TXT&knotfree=1"

// FetchDnsResponse takes a comma-separated list of dns names and returns a DnsResponse or an Error. or an array of DnsResponses if the comma-separated list contains multiple names.
// It requires type to be TXT or A.
// It also requires a dnsServer, like "1.1.1.1" (cloudflare) or "8.8.8.8" (google).
// UNLESS knotfreeNative is true, then it will use the knotfree native dns resolver 'lookup' inside of knotfree.net
// We do this to test metaverse world building without having to spend boucoup $$$ buying domains
// not exported. Use the hard version FetchDnsResponseTryHard instead. Tests are using this or it would already be private.
export async function FetchDnsResponse(commaList: string, type: "TXT" | "A", dnsServer: string, knotfreeNative: boolean):
	Promise<DnsResponse[] | Error> {

	let server = knotfreeServer

	let url = `${server}/api1/dns-query?name=${commaList}&type=${type}&`
	if (knotfreeNative) {
		url += `knotfree=1`
	}
	else {
		url += `dnsServer=${dnsServer}`
	}
	// try 
	{
		const response = await fetch(url);
		if (!response.ok) {
			return new Error(`HTTP error! status: ${response.status}`);
		}

		const reader = response.body?.getReader();
		if (!reader) {
			throw new Error('Reader not available');
		}

		// is this better? We keep getting fails with no known error.
		const decoder = new TextDecoder();
		let result = '';

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			result += decoder.decode(value, { stream: true });
		}

		const theText = result // await response.text()
		// console.log('Raw DNS response text:', theText);

		const parsed = JSON.parse(theText);
		let data: DnsResponse[] = []
		if (commaList.includes(",")) {
			data = parsed as DnsResponse[];
			return data;
		} else {
			data = [parsed as DnsResponse];
			return data;
		}
	}
	// catch (error: unknown) {
	// 	// I know it may be because of server is down. How do I get it to say that?
	// 	// especially when it's knotfree.dog:8085 and that's not even running.
	// 	let amessage = `FetchDnsResponse error: ${error} for url: ${url}`
	// 	if (error instanceof Error) {
	// 		amessage = `FetchDnsResponse Fetch operation failed: ${error.message} for url: ${url}`;
	// 		console.error(amessage, error.message);
	// 	} else {
	// 		amessage = `FetchDnsResponse an unexpected error occurred: ${error} for url: ${url}`;
	// 		console.error(amessage, error);
	// 	}
	// 	return error instanceof Error ? error : new Error(String(amessage));
	// }
}


export async function FetchDnsResponseTryHard(commaList: string, type: "TXT" | "A", dnsServer: string, knotfreeNative: boolean, howMany?: number):
	Promise<DnsResponse[] | Error> {

	//  comma's? really? 
	// break into batches of 64.Then make the old one private and use this one instead.
	// fetch and merge is using this but in smaller batches.
	// back to a list of names:
	// accumulate the results from each chunk into a final result array. This one.
	const results: DnsResponse[] = []

	const theNames = commaList.split(",")

	// Let's go with a chunk size of 48. 
	const chunkSize = 48
	const chunks: string[][] = []
	for (let i = 0; i < theNames.length; i += chunkSize) {
		const chunk = theNames.slice(i, i + chunkSize)
		chunks.push(chunk)
	}
	// cool. let's see them 
	// console.log(`FetchDnsResponseTryHard: rawChain length: ${rawChain.length}, chunked into ${chunks.length} chunks of up to ${chunkSize} each.`)
	const passCount = chunks.length
	// console.log(`TwoWayLookupAndMerge: passCount: ${passCount}`)
	// fun.

	for (let pass = 0; pass < passCount; pass++) {
		const chunk = chunks[pass]
		// console.log(`TwoWayLookupAndMerge: pass ${pass + 1} of ${passCount}, chunk length: ${chunk.length}`)
		const chunkCommaList = chunk.join(",")
		const dnsresp = await fetchDnsResponseTryHardSmallerBatch(chunkCommaList, type, dnsServer, knotfreeNative, chunk.length)
		if (dnsresp instanceof Error) {
			console.error(`Error in fetchDnsResponseTryHardSmallerBatch: ${dnsresp}`)
			return dnsresp
		}
		// append the results into the final result.
		// we should have a treeStatus for each cube in the rawChain.
		if (dnsresp.length !== chunk.length) {
			const err = new Error(`Unexpected treeStatuses length from FetchDnsResponseTryHard. Expected ${chunk.length} but got ${dnsresp.length}`)
			console.error(err)
			return err
		}
		results.push(...dnsresp)
	}
	if (results.length !== theNames.length) {
		const err = new Error(`Unexpected final results length from FetchDnsResponseTryHard. Expected ${theNames.length} but got ${results.length}`)
		console.error(err)
		return err
	}
	return results
}

//  
// fetchDnsResponseTryHardSmallerBatch is the same as FetchDnsResponse but with retries.
// It takes a comma-separated list of dns names and returns a DnsResponse or an Error. or an array of DnsResponses if the comma-separated list contains multiple names.
// It requires type to be TXT or A.
// Note that knotfree serves .vr names but .xyz names are what we're using in the end. Presumably.
// It also requires a dnsServer, like "1.1.1.1" (cloudflare) or "8.8.8.8" (google).
// UNLESS knotfreeNative is true, then it will use the knotfree native dns resolver inside of knotfree.net
// we do this to test metaverse world building without having to spend boucoup $$$ buying domains
// can we please change the return type of this to the usual data,error tuple? 
// TODO: test with 64K names.  TODO: Break into batches of 64. (see above).
async function fetchDnsResponseTryHardSmallerBatch(commaList: string, type: "TXT" | "A", dnsServer: string, knotfreeNative: boolean, howMany?: number):
	Promise<DnsResponse[] | Error> {

	// for 60 seconds, keep trying to fetch the dns response until we get a response that is not an error, or until we get a reasonable response. 
	// This is to test the stability of the knotfree dns resolver under load.

	if (!howMany) { // why do we do this lame thing?
		howMany = commaList.split(",").length
	}

	const errors: string[] = []

	const startTime = Date.now()
	let lastError: Error | null = null
	let attempt = 0
	while (Date.now() - startTime < 30000) {
		try {
			let hadUnexpectedStatus = false

			const response = await FetchDnsResponse(commaList, type, dnsServer, knotfreeNative)
			if (response instanceof Error) {
				lastError = response
				console.error(`Error fetching DNS response: ${response}. Retrying...`)
				hadUnexpectedStatus = true
				if (errors.length < 4) {
					errors.push(response.message, " for ", dnsServer, "kf is ", knotfreeServer)
				}
			} else if (response.length !== howMany) {
				lastError = new Error(`Expected ${howMany} DNS responses, but got ${response.length}. Retrying...`)
				console.error(lastError.message)
				hadUnexpectedStatus = true

			} else {
				// they have to be either 0 or 3. 
				// SERVFAIL is NOT an answer.
				// We need to be 100% the name actually doesn't exist.
				for (const r of response) {
					if (r.Status !== 0 && r.Status !== 3) {
						lastError = new Error(`Unexpected DNS response status: ${r.Status}. Retrying... Attempt ${attempt + 1}`)
						hadUnexpectedStatus = true
						if (errors.length < 4) {
							errors.push("Got none 0 or 3 status for ", GetQuestion(r)[0], " with ", dnsServer, "kf is ", knotfreeServer)
						}
					}
				}
				if (!hadUnexpectedStatus) {
					// they look legit. This is the normal/common case.
					// the other things are server and internet issues.
					return response
				}
				// else keep trying.
				attempt++
			}
		} catch (err) {
			lastError = err as Error
			console.error(`Exception fetching DNS response: ${lastError}. Retrying...`)
			if (errors.length < 4) {
				errors.push(`Exception fetching DNS response: ${lastError}`)
			}
		}
		// we're here because we got an error or an unexpected status. Wait a bit and try again.
		console.log("FetchDnsResponseTryHard Waiting 3 seconds before retrying because ...", lastError?.message, " and errors so far: ", errors.join(","))
		// too big to read fixme: console.log("FetchDnsResponseTryHard seeks ",commaList)
		// this has become my nightmare.
		// wait 3 seconds before retrying. This has been killing the server. What a wimp. We should be able to handle more load than this. 
		// testFailedTwoWay.ts works in 10 ms all night long and it's practically a DoS attack on the server. We should be able to handle it.
		// go faster on the first one.
		let time = 1000
		if (attempt > 2) {
			time = 3000
		}
		await new Promise(resolve => setTimeout(resolve, time))
	}
	return lastError || new Error("Unknown error fetching DNS response")
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
